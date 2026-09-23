#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Erases the datastore and rebuilds an empty one matching the current entities.
#
# For schema changes. The service runs TypeORM with `synchronize: true`, which
# adds tables and columns but will not reliably reshape an existing SQLite table
# — so after an entity change the file on disk can disagree with the code in
# ways that only surface as a query error much later. Deleting it is the cure.
#
#   ./scripts/reset-db.sh              # local ./data store, asks first
#   ./scripts/reset-db.sh --container  # the running container's database
#   ./scripts/reset-db.sh -y --no-backup
# ─────────────────────────────────────────────────────────────────────────────
set -Eeuo pipefail

MODE=local
ASSUME_YES=0
BACKUP=1
SERVICE=ingestor

usage() {
    # The header block above, minus the comment markers: from line 2 to the
    # first line that is not a comment, so it cannot drift out of range.
    awk 'NR>1 && /^#/ { sub(/^# ?/, ""); print; next } NR>1 { exit }' "${BASH_SOURCE[0]}"
    exit "${1:-0}"
}

while [ $# -gt 0 ]; do
    case "$1" in
        --container|--docker) MODE=container ;;
        -y|--yes)     ASSUME_YES=1 ;;
        --no-backup)  BACKUP=0 ;;
        -h|--help)    usage 0 ;;
        *) echo "unknown option: $1" >&2; usage 1 ;;
    esac
    shift
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

TS_NODE="$REPO_ROOT/node_modules/.bin/ts-node"

STAMP="$(date +%Y%m%d-%H%M%S)"
# Where the container publishes its API, polled after the restart. Override when
# the compose port mapping is not the 3000:3000 this project ships with.
STATUS_URL="${STATUS_URL:-http://127.0.0.1:3000/api/status}"
BACKUP_DIR="$REPO_ROOT/data/backups"

confirm() {
    [ "$ASSUME_YES" -eq 1 ] && return 0
    printf '%s [y/N] ' "$1"
    read -r reply
    case "$reply" in
        [yY]|[yY][eE][sS]) return 0 ;;
        *) echo "aborted."; exit 1 ;;
    esac
}

# ── local ────────────────────────────────────────────────────────────────────
reset_local() {
    if [ ! -x "$TS_NODE" ] || [ ! -f "$REPO_ROOT/node_modules/typescript/lib/typescript.js" ]; then
        echo "local TypeScript tooling is not installed." >&2
        echo "Run 'npm ci --include=dev' in $REPO_ROOT, then try again." >&2
        exit 1
    fi

    # Asks the app's own config for the path rather than parsing .env here, so
    # SQLITE_DATABASE only ever means one thing.
    # tail -1 because dotenv announces itself on stdout before we print.
    local db
    db="$("$TS_NODE" --project scripts/tsconfig.json scripts/rebuild-schema.ts --print-path | tail -n 1)"

    echo "store:  $db"
    if [ -f "$db" ]; then
        echo "size:   $(du -h "$db" | cut -f1)"
    else
        echo "size:   (no database yet)"
    fi
    confirm "Erase it and rebuild an empty schema?"

    if [ -f "$db" ] && [ "$BACKUP" -eq 1 ]; then
        mkdir -p "$BACKUP_DIR"
        # -wal and -shm are not copied: a backup taken while the service is
        # stopped needs neither, and one taken while it runs is not consistent
        # anyway. Stop the service before trusting this copy.
        cp "$db" "$BACKUP_DIR/monitor-$STAMP.sqlite"
        echo "backup: $BACKUP_DIR/monitor-$STAMP.sqlite"
    fi

    rm -f "$db" "$db-wal" "$db-shm"
    echo "erased."

    echo "rebuilding schema:"
    "$TS_NODE" --project scripts/tsconfig.json scripts/rebuild-schema.ts
    echo "done. Start the service as usual."
}

# ── container ────────────────────────────────────────────────────────────────
reset_container() {
    command -v docker >/dev/null || { echo "docker not found" >&2; exit 1; }

    # Checked before anything is stopped. `docker compose` resolves the whole
    # file, so this also catches the INGEST_API_KEYS the service declares as
    # required — better to fail here than between the stop and the restart.
    if ! docker compose config --services 2>/dev/null | grep -qx "$SERVICE"; then
        echo "docker compose cannot resolve service \"$SERVICE\" in $REPO_ROOT." >&2
        echo "Run it where docker-compose.yml lives, with INGEST_API_KEYS set" >&2
        echo "(compose reads the adjacent .env). Details:" >&2
        docker compose config --services >/dev/null || true
        exit 1
    fi

    # The path the container sees, read from the compose file so this follows a
    # change there. The fallback is the value that file ships with today.
    local db
    db="$(awk -F': *' '/^[[:space:]]*SQLITE_DATABASE:/ { gsub(/"/, "", $2); print $2; exit }' docker-compose.yml)"
    db="${db:-/data/monitor.sqlite}"

    echo "service: $SERVICE (compose)"
    echo "store:   $db  (inside the ingestor-data volume)"
    confirm "Stop the service, erase that volume's database and restart?"

    docker compose stop "$SERVICE"

    # From here the service is down, so any failure has to put it back rather
    # than leaving the deployment stopped behind a half-finished reset.
    trap 'echo; echo "reset failed — restarting $SERVICE" >&2; docker compose up -d "$SERVICE" || true' ERR

    if [ "$BACKUP" -eq 1 ]; then
        mkdir -p "$BACKUP_DIR"
        local out="$BACKUP_DIR/monitor-container-$STAMP.sqlite"
        # -T because a TTY would mangle the bytes on the way out.
        if docker compose run --rm -T --no-deps --entrypoint sh "$SERVICE" \
               -c "cat '$db' 2>/dev/null" > "$out"; then :; fi
        if [ -s "$out" ]; then
            echo "backup:  $out"
        else
            rm -f "$out"
            echo "backup:  skipped (no database in the volume yet)"
        fi
    fi

    docker compose run --rm -T --no-deps --entrypoint sh "$SERVICE" \
        -c "rm -f '$db' '$db-wal' '$db-shm'"
    echo "erased."

    # No rebuild step: the service synchronises the schema onto the empty
    # volume as it boots, which is the same code path a fresh deployment takes.
    trap - ERR
    docker compose up -d "$SERVICE"
    echo -n "waiting for the service to rebuild the schema"
    for _ in $(seq 1 30); do
        if curl -fsS "$STATUS_URL" >/dev/null 2>&1; then
            echo " — up."
            curl -fsS "${STATUS_URL%/status}/nodes/count" || true
            echo
            return 0
        fi
        printf '.'
        sleep 2
    done
    echo
    echo "service did not answer $STATUS_URL within 60s — check: docker compose logs $SERVICE" >&2
    exit 1
}

case "$MODE" in
    local)     reset_local ;;
    container) reset_container ;;
esac
