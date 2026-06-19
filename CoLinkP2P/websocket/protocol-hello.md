# Version Negotiation (protocol.hello)

After a WebSocket connection is established, both sides simultaneously send a `protocol.hello` message, then acknowledge with `protocol.hello-ack`.

## Message Definitions

**protocol.hello:**

```json
{
  "type": "protocol.hello",
  "payload": {
    "deviceId": "660e8400-...",
    "protocolVersion": "1.1.0",
    "extensions": {}
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| deviceId | string | Sender's device ID |
| protocolVersion | string | Semantic version of the protocol implementation (major.minor.patch) |
| extensions | object | Optional extension parameters. Receivers MUST ignore unknown keys |

**protocol.hello-ack (compatible):**

```json
{
  "type": "protocol.hello-ack",
  "payload": {
    "compatible": true
  }
}
```

**protocol.hello-ack (incompatible):**

```json
{
  "type": "protocol.hello-ack",
  "payload": {
    "compatible": false,
    "reason": "colink:protocol.major_mismatch.v1",
    "message": "Local major version 2 is incompatible with peer major version 1"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| compatible | boolean | Yes | Whether the peer's version is acceptable |
| reason | string | When incompatible | Rejection reason code |
| message | string | When incompatible | Human-readable description for logging/debugging |

Well-known reasons:

| Reason | Description |
|--------|-------------|
| `colink:protocol.major_mismatch.v1` | Major version differs, communication is impossible |
| `colink:protocol.invalid_version.v1` | `protocolVersion` is missing, malformed, or not a valid semver string |
| `colink:protocol.generic.v1` | Generic version negotiation failure |

## Flow

```
A                                          B
│                                          │
│─── protocol.hello ─────────────────────→ │  { deviceId, protocolVersion, extensions }
│←── protocol.hello ────────────────────── │  { deviceId, protocolVersion, extensions }
│                                          │
│  Both check version compatibility        │
│                                          │
│─── protocol.hello-ack ─────────────────→ │  { compatible: true }
│←── protocol.hello-ack ────────────────── │  { compatible: true }
│                                          │
│      ═══ Proceed to auth/pairing ═══     │
```

## Version Semantics

When a device needs to use a feature introduced in a specific version, it MUST check the peer's `protocolVersion` and fall back to an older behavior if the peer predates that feature. This decision is made inline in the relevant code path.

## Rules

1. `protocol.hello` and `protocol.hello-ack` are the only messages that use bare format (no envelope). Their structures are append-only and permanent.
2. Receivers MUST ignore unknown fields in `payload`.
3. Both sides send hello simultaneously after WebSocket connection is established.
4. Upon receiving the peer's hello, each side checks version compatibility and sends `protocol.hello-ack`.
5. If `protocolVersion` is missing, not a valid semver string, or cannot be parsed, the receiver sends `protocol.hello-ack` with `compatible: false` and an appropriate reason.
6. If major versions differ, the receiver sends `protocol.hello-ack` with `compatible: false`.
7. A side that sends or receives `compatible: false` MUST NOT proceed to auth/pairing. The connection remains open.
8. The hello phase is complete when both sides have sent and received a `compatible: true` ack. Only then MAY auth/pairing proceed.
9. `deviceId` is a claimed identity before authentication completes. It MUST NOT be treated as an authenticated identity before authentication completes.
