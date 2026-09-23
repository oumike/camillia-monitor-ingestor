# camillia-monitor-ingestor

REST service for Meshtastic mesh monitoring, built with NestJS + TypeScript.

## Running

```bash
npm install
cp .env.example .env
npm run start:dev     # watch mode
npm run build && npm run start:prod
```

All routes are served under the `/api` prefix (default port `3000`).

## API docs

Swagger UI: <http://localhost:3000/api/docs> — OpenAPI JSON: `/api/docs/json`.

Schemas come from the response classes in `src/status/dto/`. The `@nestjs/swagger`
CLI plugin is enabled in `nest-cli.json` with `introspectComments`, so types and
doc comments on new DTOs are picked up without hand-written `@ApiProperty`
decorators; add them explicitly when you want examples or enum values.

## Endpoints

### `GET /api/status`

```json
{
  "status": "ok",
  "service": "camillia-monitor-ingestor",
  "version": "0.1.0",
  "environment": "development",
  "uptimeSeconds": 12,
  "timestamp": "2026-08-23T22:38:13.294Z",
  "storage": { "driver": "sqlite", "connected": true },
  "mesh": { "knownNodes": 0, "lastHeardAt": null }
}
```

`status` is `degraded` (not `ok`) when the datastore fails its liveness probe;
`storage.error` then carries the reason.

### `GET /api/nodes/heard`

Nodes heard, most recently heard first. Query params: `since` (ISO 8601) and
`limit` (1–1000, default 100).

```json
{
  "nodes": [
    {
      "nodeNum": 123456789,
      "nodeId": "!075bcd15",
      "longName": "Ridgeline Repeater",
      "shortName": "RDGE",
      "hwModel": "HELTEC_V3",
      "role": "ROUTER",
      "preset": "LongFast",
      "lastHeardAt": "2026-08-23T23:06:17.026Z",
      "lastHeardBy": "!075bcd15",
      "signal": { "snr": -3.25, "rssi": -88, "hopsAway": 2, "viaMqtt": false },
      "position": {
        "latitude": 37.1234567,
        "longitude": -122.1234567,
        "latitudeI": 371234567,
        "longitudeI": -1221234567,
        "altitude": 812,
        "precisionBits": 16
      },
      "batteryLevel": 84,
      "voltage": 3.98,
      "firstHeardAt": "2026-08-23T23:06:17.000Z",
      "updatedAt": "2026-08-23T23:06:34.090Z"
    }
  ],
  "count": 1,
  "since": null
}
```

A node absent from this list only means no gateway of ours heard it — never that
it is offline. `precisionBits` below 32 means the sender blurred the fix.

### `POST /api/nodes/heard` (authenticated)

One reception report from the firmware. Only `nodeNum` is required:

```bash
curl -X POST http://localhost:3000/api/nodes/heard \
  -H 'content-type: application/json' \
  -H 'x-api-key: YOUR_KEY' \
  -d '{"nodeNum":123456789,"preset":"LongFast","snr":-8.5,"rssi":-96,"hopsAway":2,"rxTime":1755990000}'
```

Upserts by node number and **merges**: fields left out keep their known values,
so a bare signal report will not erase names learned from an earlier NodeInfo.
Field names follow the Meshtastic protobufs (`rxTime`, `latitudeI`, `snr`, …) so
firmware can forward what it already holds. Rejected: node number `0` and the
broadcast address `4294967295`, and any unrecognized field.

`preset` is the canonical Meshtastic primary-channel name used when the packet
was received: `LongFast`, `LongMod`, `LongSlow`, `LongTurbo`, `MediumFast`,
`MediumSlow`, `ShortFast`, `ShortSlow`, or `ShortTurbo`. It is optional for
compatibility with older monitor firmware. Nodes retain the preset from their
latest report, and each stored message retains the preset on which its latest
copy was received.

`rxTime` (epoch seconds, the device's own clock) is used for `lastHeardAt` when
plausible — Meshtastic clocks are often unset, so an out-of-range value falls
back to arrival time. `lastHeardAt` never moves backwards.

The response is the stored node plus two figures for the reporting device:
`created` (true when this report is what brought the node into existence) and
`totalNodes` (nodes stored, counted after the write — the same number
`/api/nodes/count` returns). Together they let a device display both counts
without keeping its own tally, which would miss what other monitors store.

## Authentication

Write endpoints are guarded by an API key; reads are currently open.

- Set `INGEST_API_KEYS` to a comma-separated list (multiple keys so they can be
  rotated without downtime).
- Send it as `X-API-Key: <key>` or `Authorization: Bearer <key>`.
- Keys are compared as SHA-256 digests in constant time.
- **Leaving `INGEST_API_KEYS` empty disables the check** and logs a warning at
  startup, so a fresh checkout works. Set it before the service is reachable
  from anywhere but localhost.

This is a shared secret over TLS, not per-device identity: every node using the
same key is indistinguishable, and `heardBy` in the body is self-reported and
therefore not trustworthy. Per-device keys or signed reports are the next step if
that matters.

## Domain

[docs/meshtastic.md](docs/meshtastic.md) — how Meshtastic identifies nodes, what
its packets carry, how MQTT ingestion and channel decryption work, and the traps
(gateway duplicates, blurred positions, unreliable device clocks) that shape the
schema here.

## Persistence

SQLite (via TypeORM + `better-sqlite3`) today, MongoDB later. The store is
hidden behind interfaces so nothing outside `src/persistence/` knows which one
is running:

- `src/persistence/repositories/` — storage-agnostic interfaces (`NodeRepository`,
  `StorageHealthIndicator`) and their DI tokens. Consumers inject the tokens.
- `src/persistence/sqlite/` — TypeORM implementation and entities.
- `src/persistence/persistence.module.ts` — picks the implementation from
  `DB_DRIVER` at bootstrap.

To move to MongoDB: implement the interfaces in `src/persistence/mongodb/`
(see the README there), add the module to the `mongodb` branch of the switch,
and set `DB_DRIVER=mongodb`. No controller or service changes.

`synchronize: true` is on for the SQLite datasource while the schema is young —
replace it with migrations before this holds data worth keeping.

### Resetting the store

`synchronize` adds tables and columns but will not reliably reshape an existing
SQLite table, so after an entity change the file on disk can disagree with the
code in ways that only surface as a query error later. Until there are
migrations, the fix is to start over:

```bash
npm run db:reset                 # local ./data store — prompts, backs up first
npm run db:reset -- --container  # the running container's database
npm run db:reset -- -y --no-backup
```

Both modes drop the database file (plus any `-wal`/`-shm`) and rebuild an empty
schema from the current entities — locally via `scripts/rebuild-schema.ts`, and
for the container by stopping it, wiping the file in its volume, and restarting
so the service synchronises onto an empty one. `--container` checks that compose
can resolve the service before it stops anything, and restarts the service if
any later step fails, so a failed reset never leaves the deployment down. Set
`STATUS_URL` if the API is not published on `http://127.0.0.1:3000`.

A timestamped copy lands in `data/backups/` unless `--no-backup` is given.
**Every stored node, message and MQTT capture is destroyed** — reporting devices
reseed their totals from `/api/nodes/count` at their next boot.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | `development` | Reported in the status payload |
| `DB_DRIVER` | `sqlite` | `sqlite` or `mongodb` |
| `SQLITE_DATABASE` | `./data/monitor.sqlite` | SQLite file path |
| `MONGODB_URI` | `mongodb://localhost:27017` | Used when `DB_DRIVER=mongodb` |
| `MONGODB_DATABASE` | `camillia_monitor` | Used when `DB_DRIVER=mongodb` |
| `INGEST_API_KEYS` | *(empty)* | Comma-separated keys for write endpoints; empty disables auth |
