# LAN WebSocket Protocol

> **Current Protocol Version: 1.1.0**
>
> This protocol uses semantic versioning. The version is exchanged during `protocol.hello` and governs compatibility between peers.
> The `protocolVersion` field follows [Semantic Versioning](https://semver.org/):
> - **Major** bump: breaking changes — peers with different major versions cannot communicate.
> - **Minor** bump: new backward-compatible features — higher-version peers degrade gracefully.
> - **Patch** bump: clarifications or bug fixes with no wire-level impact.
>
> When an implementation adopts protocol behavior changes from a newer document revision, it MUST update its advertised version to match the Current Protocol Version declared in that revision.

LAN peer-to-peer communication is carried over a single WebSocket connection.

## Connection

```
ws://<localIp>:<localPort>/peer
```

Each device runs a local WebSocket server (default port 27777).

Protocol-level errors (unknown message type, unexpected message for current state, timing violations) MUST NOT cause the transport connection to close. The receiver should ignore, reject, or buffer the message within its local state machine. Connection closure is only triggered by: transport-layer disconnect, explicit close, keepalive timeout, or local resource policy.

## Message Format

Two formats coexist on the wire:

### Bare Format (protocol.hello / protocol.hello-ack only)

```json
{
  "type": "protocol.hello",
  "payload": { "..." }
}
```

`protocol.hello` and `protocol.hello-ack` are the only messages that use this format. They have no version suffix and their structures may only be extended by appending new fields.

### Standard Envelope (all post-hello messages)

```json
{
  "id": "01902a3b-4c5d-7e8f-9a0b-1c2d3e4f5a6b",
  "type": "auth.v1.challenge",
  "from": "660e8400-...",
  "to": "770f9500-...",
  "seq": 1,
  "timestamp": 1718400000000,
  "correlationId": null,
  "payload": { "..." }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | UUIDv7 — globally unique, time-ordered |
| type | string | Yes | Namespaced message type |
| from | string | Yes | Sender's deviceId |
| to | string | Yes | Receiver's deviceId |
| seq | number | Yes | Per-connection, per-direction monotonically increasing counter. Starts at 1 from the first envelope message after hello completes |
| timestamp | number | Yes | Unix milliseconds when the message was created (sender's local clock) |
| correlationId | string? | No | Set to the `id` of the originating message when this is a response |
| payload | object | Yes | Domain-specific data |

**Rules:**

- `seq` is per-connection, per-direction. Each side maintains its own counter.
- A gap in `seq` indicates message loss.
- `timestamp` is the sender's local clock.
- Before authentication completes, `from` is merely a claimed identity. The receiver may use it to look up a candidate trust record, but MUST verify it through `auth.v1` signature verification or `pairing.v1` code confirmation.
- `to` MUST equal the local deviceId. A receiver MUST reject any message where `to` does not match itself.

Type namespaces:

| Namespace | Purpose |
|-----------|---------|
| `protocol` | Version negotiation (bare format, no version suffix) |
| `auth` | Connection authentication for previously paired devices |
| `pairing` | First-time trust establishment |
| `heartbeat` | Application-level keepalive |
| `business` | Encrypted business message transport |

## Protocol Phases

| Phase | Document |
|-------|----------|
| Version Negotiation | [protocol-hello.md](protocol-hello.md) |
| Authentication | [auth.md](auth.md) |
| Pairing | [pairing.md](pairing.md) |
| Business Messages | [business.md](business.md) |
| Keepalive | [keepalive.md](keepalive.md) |

## Connection Lifecycle

```
┌───────────────────────────────────────────────────────────────────────┐
│                        WebSocket Connected                             │
└───────────────────────────┬───────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────────┐
│                   protocol.hello (both sides)                          │
│                   protocol.hello-ack (both sides)                      │
├───────────────────────────┬───────────────────────────────────────────┤
│                           │                                           │
│              compatible: false ──→ Connection idle (no progress)       │
│                           │                                           │
│              compatible: true                                          │
└───────────────────────────┬───────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
┌──────────────────────┐    ┌──────────────────────────┐
│   auth.v1 (mutual    │    │   pairing.v1 (first-time │
│   challenge-response)│    │   trust establishment)   │
├──────────────────────┤    ├──────────────────────────┤
│                      │    │                          │
│  reject (unknown) ───┼───→│                          │
│                      │    │                          │
│  reject (other) ──→ ×│    │  reject ──→ ×            │
│                      │    │                          │
│  verified (both) ────┤    │  complete ───────────────┤
└──────────┬───────────┘    └─────────────┬────────────┘
           │                              │
           └──────────────┬───────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────────────────────────┐
│               business.v1.version / version-ack (both sides)          │
├───────────────────────────┬───────────────────────────────────────────┤
│              compatible: false ──→ Connection idle (no business)       │
│              compatible: true                                          │
└───────────────────────────┬───────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────────────────┐
              │ Both protocolVersion >= 1.1.0?         │
              │   Yes ──→ business.v1.key-exchange     │
              │   No  ──→ skip (legacy derivation)    │
              └─────────────┬─────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────────┐
│               business.v1.negotiate (both sides)                      │
│               Agree on cipher suite                                    │
│               Derive session key                                       │
└───────────────────────────┬───────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    ═══ Session Ready ═══                               │
│                                                                       │
│   • business.v1.message (encrypted application data)                  │
│   • heartbeat.v1.ping / pong (every 15s, 45s timeout)                 │
└───────────────────────────────────────────────────────────────────────┘
```
