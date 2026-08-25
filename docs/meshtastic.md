# Meshtastic domain reference

Working notes for this service: what Meshtastic emits, how to ingest it, and the
traps that shape our schema. Verified against the upstream protobufs and firmware
source (`meshtastic/protobufs@master`, `meshtastic/firmware@master`) in August 2026.
Current firmware line is **2.7.x** (v2.7.26 beta, June 2026).

## 1. Identity

| Concept | Form | Notes |
| --- | --- | --- |
| Node number | `uint32` / `fixed32` | The wire identity. `from`/`to` on every packet. |
| Node ID | `!` + lowercase hex of the node number | e.g. node `123456789` → `!075bcd15`. Purely derived — store one, compute the other. |
| Broadcast address | `0xFFFFFFFF` (`4294967295`) | `to == 0xFFFFFFFF` means broadcast, not a real node. Never create a node row for it. |
| Long name | ≤ 24 bytes UTF-8 | From `User.long_name`. |
| Short name | ~2–4 chars | From `User.short_name`. |

Node numbers are **not globally unique** — they're unique per mesh, historically
derived from the MAC, now effectively random. Two meshes bridged over MQTT can
collide. If we ever ingest more than one mesh, the primary key must be
`(mesh/topic root, nodeNum)`, not `nodeNum` alone.

## 2. Transports we can ingest from

1. **MQTT** — a *gateway* node with the MQTT module enabled republishes everything
   it hears. Best fit for a server-side ingestor: no hardware attached, sees whatever
   the gateway sees. Details in §4.
2. **Serial / TCP / BLE to a local node** — the `meshtastic` Python lib or a
   protobuf stream over the device API port. Gives full local NodeDB
   (`interface.nodes`, `nodesByNum`) and events (`meshtastic.receive.*`,
   `meshtastic.connection.established`). Node.js equivalent: `@meshtastic/js`.
3. **Map reports** — coarse, opt-in, unencrypted node summaries (§4.4).

MQTT and a local node are complementary: MQTT gives breadth, a local node gives
ground-truth RSSI/SNR and hop counts for packets it heard over the air.

## 3. Packet model

### MeshPacket (the envelope, mostly plaintext on the wire)

`from`, `to` (fixed32) · `channel` (hash byte) · `id` (fixed32, unique per sender) ·
`rx_time` · `rx_snr` (float) · `rx_rssi` (int32) · `hop_limit` / `hop_start` (uint32) ·
`want_ack` · `priority` · `via_mqtt` (bool) · `next_hop` / `relay_node` ·
`public_key`, `pki_encrypted` (v2.5+) · `transport_mechanism`, `xeddsa_signed` (2.7).

Payload is a oneof: **`decoded` (Data)** or **`encrypted` (bytes)**.

Hops travelled = `hop_start - hop_limit`. Both are needed; neither alone means
anything. `hop_start == 0` on older firmware, so treat hop count as nullable.

### Data (the decrypted payload)

`portnum` (PortNum) · `payload` (bytes — a nested protobuf, decoded per portnum) ·
`want_response` · `dest` · `source` · `request_id` · `reply_id` · `emoji` ·
`bitfield` · `xeddsa_signature`.

`bitfield` bit 0 = `OK_TO_MQTT` (user consented to uplink), bit 1 = `WANT_RESPONSE`.
Default is **false** — respect it if we ever re-publish anything.

`source` vs `from`: on MQTT-relayed packets `from` may be the gateway, `source` the
original author. Prefer `source` when set.

### PortNums worth persisting

| # | Port | Payload | Why we care |
| --- | --- | --- | --- |
| 1 | `TEXT_MESSAGE_APP` | UTF-8 bytes | Chat traffic. |
| 3 | `POSITION_APP` | `Position` | Node location + `precision_bits`. |
| 4 | `NODEINFO_APP` | `User` | Names, hw model, role, public key. |
| 5 | `ROUTING_APP` | `Routing` | ACK/NAK + error reasons. |
| 67 | `TELEMETRY_APP` | `Telemetry` | Device/env/power/air-quality metrics. |
| 70 | `TRACEROUTE_APP` | `RouteDiscovery` | Route + per-hop SNR, both directions. |
| 71 | `NEIGHBORINFO_APP` | `NeighborInfo` | Direct graph edges with SNR. |
| 73 | `MAP_REPORT_APP` | `MapReport` | Unencrypted node summary. |
| 10 | `DETECTION_SENSOR_APP` | text | Sensor trips. |

Full list: `UNKNOWN(0) … MAX(511)`; `PRIVATE_APP` starts at 256. 2.7 added
`NODE_STATUS_APP(36)`, `MESH_BEACON_APP(37)`, `LORA_OTA_APP(79)`.
**Store the raw portnum number**, not an enum we'd have to keep in sync — new ones
land every release.

### Position

`latitude_i` / `longitude_i` are `sfixed32` in **1e-7 degrees** — multiply by 1e-7.
`precision_bits` says how much was deliberately blurred (public MQTT clamps to
10–16 bits, ~1.5 km). Persist the raw ints plus `precision_bits`; never present a
blurred fix as exact.

### Telemetry

`Telemetry.time` + a oneof: `device_metrics`, `environment_metrics`,
`air_quality_metrics`, `power_metrics`, `local_stats`, `health_metrics`,
`host_metrics`, `traffic_management_stats`.

- `DeviceMetrics`: `battery_level` (0–100; **>100 means plugged in**), `voltage`,
  `channel_utilization`, `air_util_tx`, `uptime_seconds`.
- `EnvironmentMetrics`: 40+ fields and growing (temp, humidity, pressure, lux, wind,
  rainfall, soil, radiation, lightning, 8× ADC, 8× 1-wire).
- `LocalStats`: the gateway's own view — packets tx/rx/dupe/dropped, node counts,
  heap, noise floor.

The metric set grows every release. A wide relational table will churn; a narrow
`(nodeNum, metric, value, unit, observedAt)` shape or a JSON column ages better —
and maps cleanly onto MongoDB later.

## 4. MQTT

### 4.1 Topics

Firmware default root is **`msh`**, giving `msh/2/e/<CHANNEL>/<GATEWAY_ID>`.
The familiar `msh/US/2/e/...` form comes from operators setting `mqtt.root` to
`msh/<REGION>` — it is convention, **not** guaranteed structure. Parse from the
right (`…/<CHANNEL>/<GATEWAY_ID>`), don't assume a fixed depth.

- `<root>/2/e/<CHANNEL>/<GATEWAY_ID>` — `ServiceEnvelope` protobuf. `2` = protocol version.
- `<root>/2/json/<CHANNEL>/<GATEWAY_ID>` — JSON, only if the gateway enables it (not on nRF52).
- `<root>/2/map/` — `MapReport` protobufs, no channel/node suffix.
- PKI-encrypted DMs use the literal string **`PKI`** in the channel position.

`ServiceEnvelope` = `packet` (MeshPacket, possibly still encrypted) + `channel_id`
(channel name) + `gateway_id` (the publishing node's `!id`).

### 4.2 Public broker

`mqtt.meshtastic.org`, user `meshdev` / pass `large4cats`. Constraints:
zero-hop (traffic doesn't re-flood into local meshes), only 7 portnums pass
(NodeInfo, Text, TextCompressed, Position, Telemetry, MapReport, Routing), and
positions are precision-limited. Anything richer needs our own broker.

### 4.3 Ingest rules that matter

- **Deduplicate on `(from, packet id)`** — every gateway in earshot republishes the
  same packet. This is the single most important rule; without it every count is
  inflated by the number of gateways.
- Keep each gateway's copy for RF metrics (SNR/RSSI/hops differ per gateway) but
  collapse to one logical packet.
- `via_mqtt == true` means it arrived via MQTT, not over the air — its RF metrics
  belong to the MQTT hop, not the mesh.
- Timestamps: `rx_time` is the *gateway's* clock and is often 0 or wrong. Always
  record our own receive time separately.
- Traffic is bursty and duplicated; treat the broker as at-least-once delivery.

### 4.4 JSON topic field names

Top level: `id`, `timestamp`, `to`, `from`, `channel`, `type`, `sender`, plus
optional `rssi`, `snr`, `hops_away`, `hop_start`. `type` strings: `text`,
`telemetry`, `nodeinfo`, `position`, `waypoint`, `neighborinfo`, `traceroute`,
`detection`, `paxcounter`, `gpios_changed` / `gpios_read_reply`.
`nodeinfo` payload uses `longname`/`shortname`/`hardware`/`role` (no underscores —
different from the protobuf names). Undecodable packets serialize with `size` and
`bytes` (hex) and **no `type` field**.

JSON is lossy and gateway-dependent. **Prefer the `/e/` protobuf topic** and decode
ourselves; treat JSON as a fallback.

## 5. Encryption

- **Channels**: AES-256-CTR (AES-128 with a 16-byte key). Header stays plaintext so
  any node can relay; only the `Data` payload is encrypted.
- **Nonce (16 bytes)**: packet `id` in bytes 0–7 (little-endian in a u64 slot),
  sender node number in bytes 8–11, extra nonce in 12–15. So decryption needs
  `id` + `from` — both plaintext in the envelope. Straightforward in Node's `crypto`
  (`aes-256-ctr` / `aes-128-ctr`).
- **Default key** is public: `AQ==` (single byte `0x01`), expanded to the well-known
  256-bit default. "Encrypted" on `LongFast` is not private — we can and should
  decrypt it.
- Channel name in the topic is the *name*; the `channel` byte in MeshPacket is a
  hash. To decrypt we need the PSK for that channel name, held in our config.
- **PKI DMs** (v2.5+): Curve25519 ECDH → SHA-256 → AES-CCM with an 8-byte auth tag.
  We cannot decrypt these without a private key; store them as opaque and move on.
- Expect a meaningful share of undecryptable packets. The pipeline must persist
  ciphertext + metadata rather than dropping it.

## 6. Routing behaviour (for interpreting what we see)

Managed flooding: rebroadcast while `hop_limit > 0`, decrementing each hop, with a
listen-first contention window sized by SNR (weak signal → rebroadcasts sooner, so
range extends outward). Duplicates suppressed by `(sender, packet id)`. DMs learn a
`next_hop` from whichever node relayed the reply. Broadcasts get implicit ACKs (a
rebroadcast counts); DMs get explicit ACKs, 3 retries, then a local NAK.
Above ~40 nodes, broadcast intervals scale by `1 + (nodes - 40) × 0.075`.

Consequence: **we see a biased sample.** Absence of a node's packets means "our
gateways didn't hear it", never "it was offline". Model last-heard as evidence, not
as state.

## 7. Implications for this service

- `nodes.nodeNum` as the sole PK is fine for one mesh; revisit if we bridge several.
- Node identity (`User`) and node observations (position, telemetry, last heard) have
  very different write rates. Splitting `nodes` from an append-only `packets` /
  `node_observations` table keeps upserts cheap and history intact.
- Store every packet raw (portnum + payload bytes + envelope metadata) before
  decoding. Decoders will change; captured bytes let us re-derive.
- Dedup key `(from, packetId)` wants a unique index; on MongoDB the same key becomes
  the natural `_id`.
- Timestamps: keep `rxTime` (device), `gatewayTime`, and `ingestedAt` distinct.
- Nothing here is Meshtastic-specific enough to leak past the repository interfaces
  in `src/persistence/repositories/` — the wire format belongs in a decode layer.

## Sources

- <https://meshtastic.org/docs/software/integrations/mqtt/>
- <https://meshtastic.org/docs/configuration/module/mqtt/>
- <https://meshtastic.org/docs/configuration/radio/channels/>
- <https://meshtastic.org/docs/overview/encryption/>
- <https://meshtastic.org/docs/overview/mesh-algo/>
- <https://github.com/meshtastic/protobufs> — `mesh.proto`, `mqtt.proto`, `portnums.proto`, `telemetry.proto`
- <https://github.com/meshtastic/firmware> — `src/mqtt/MQTT.cpp`, `src/serialization/MeshPacketSerializer.cpp`, `src/mesh/CryptoEngine.cpp`
- <https://python.meshtastic.org/>
