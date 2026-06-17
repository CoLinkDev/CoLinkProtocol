# LAN WebSocket Protocol

> **Current Protocol Version: 1.0.0**
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

## Version Negotiation (protocol.hello)

After a WebSocket connection is established, both sides simultaneously send a `protocol.hello` message, then acknowledge with `protocol.hello-ack`.

### Message Definitions

**protocol.hello:**

```json
{
  "type": "protocol.hello",
  "payload": {
    "deviceId": "660e8400-...",
    "protocolVersion": "1.0.0",
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

### Flow

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

### Version Semantics

When a device needs to use a feature introduced in a specific version, it MUST check the peer's `protocolVersion` and fall back to an older behavior if the peer predates that feature. This decision is made inline in the relevant code path.

### Rules

1. `protocol.hello` and `protocol.hello-ack` are the only messages that use bare format (no envelope). Their structures are append-only and permanent.
2. Receivers MUST ignore unknown fields in `payload`.
3. Both sides send hello simultaneously after WebSocket connection is established.
4. Upon receiving the peer's hello, each side checks version compatibility and sends `protocol.hello-ack`.
5. If `protocolVersion` is missing, not a valid semver string, or cannot be parsed, the receiver sends `protocol.hello-ack` with `compatible: false` and an appropriate reason.
6. If major versions differ, the receiver sends `protocol.hello-ack` with `compatible: false`.
7. A side that sends or receives `compatible: false` MUST NOT proceed to auth/pairing. The connection remains open.
8. The hello phase is complete when both sides have sent and received a `compatible: true` ack. Only then may auth/pairing proceed.
9. `deviceId` is a claimed identity before authentication completes. It MUST NOT be treated as an authenticated identity before authentication completes.

## Authentication (auth.v1)

Authentication is used when two previously paired devices reconnect. Both sides verify each other's identity through challenge-response signatures using their stored key pairs.

### Event Types

| Type | Direction | Description |
|------|-----------|-------------|
| `auth.v1.challenge` | Both (initiator first) | Send a random nonce for the peer to sign |
| `auth.v1.response` | Both (initiator first) | Return signature over the peer's nonce |
| `auth.v1.verified` | Both (receiver first) | Signature verified, authentication complete |
| `auth.v1.reject` | Either → Either | Signature invalid, key revoked, or device unknown |

### Message Definitions

**auth.v1.challenge:**

```json
{
  "type": "auth.v1.challenge",
  "timestamp": 1718400000000,
  "payload": {
    "nonce": "random-string-32chars"
  },
  ...
}
```

| Field | Type | Description |
|-------|------|-------------|
| nonce | string | Random string, used as the challenge for the peer to sign |

**auth.v1.response:**

```json
{
  "type": "auth.v1.response",
  "timestamp": 1718400000000,
  "payload": {
    "signature": "base64(...)"
  },
  ...
}
```

| Field | Type | Description |
|-------|------|-------------|
| signature | string | Signature over the canonical string (see below) using sender's private key |

Canonical signature input:

```
from=<envelope.from>\ntimestamp=<envelope.timestamp>\nnonce=<peer_nonce>
```

Where `peer_nonce` is the nonce received in the peer's `auth.v1.challenge`.

**auth.v1.verified:**

```json
{
  "type": "auth.v1.verified",
  "payload": {},
  ...
}
```

No additional fields. Indicates that the sender has successfully verified the peer's signature.

**auth.v1.reject:**

```json
{
  "type": "auth.v1.reject",
  "payload": {
    "reason": "colink:auth.unknown_device.v1",
    "message": "No trust record for this device"
  },
  ...
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reason | string | Yes | Rejection reason |
| message | string | Yes | Human-readable description for logging/debugging |
| details | object | No | Extensible structured metadata. Receivers MUST ignore unknown keys |

Well-known reasons:

| Reason | Description |
|--------|-------------|
| `colink:auth.unknown_device.v1` | No trust record for this device — initiator should fall back to `pairing.v1` |
| `colink:auth.signature_invalid.v1` | Signature verification failed |
| `colink:auth.key_changed.v1` | Public key differs from stored record — trust revoked |
| `colink:auth.generic.v1` | Generic authentication failure not covered by a specific reason |

### Flow

```
Initiator                                      Receiver
  │                                              │
  │─── auth.v1.challenge ─────────────────────→  │  { nonce_a }
  │←── auth.v1.challenge ──────────────────────  │  { nonce_b }
  │                                              │
  │─── auth.v1.response ──────────────────────→  │  { signature }
  │←── auth.v1.response ───────────────────────  │  { signature }
  │                                              │
  │  Both sides verify the peer's signature      │
  │                                              │
  │←── auth.v1.verified ───────────────────────  │
  │─── auth.v1.verified ──────────────────────→  │
  │                                              │
  │        ═══ Authenticated, session ready ═══  │
```

### Rules

1. The initiator sends `auth.v1.challenge` first. The receiver sends its own challenge upon receiving the initiator's.
2. Upon receiving the peer's challenge, each side sends `auth.v1.response` (initiator first).
3. To verify a response, the receiver looks up the public key in its local trust store using the `from` field of the envelope.
4. If verification passes, send `auth.v1.verified`. If it fails, send `auth.v1.reject`.
5. Upon receiving `auth.v1.reject` with reason `colink:auth.unknown_device.v1`, the initiator may fall back to `pairing.v1`.
6. Upon receiving `auth.v1.reject` with reason `colink:auth.key_changed.v1`, the receiver removes the peer from its trust store.

## Pairing (pairing.v1)

Pairing establishes trust between two devices that have never communicated before. It uses a short numeric code displayed on both screens for the user to visually confirm, preventing man-in-the-middle attacks.

### Event Types

| Type | Direction | Description |
|------|-----------|-------------|
| `pairing.v1.request` | Initiator → Receiver | Propose pairing with identity information |
| `pairing.v1.exchange` | Receiver → Initiator | Respond with receiver's identity information |
| `pairing.v1.confirm` | Receiver → Initiator | User confirmed pairing code match |
| `pairing.v1.complete` | Initiator → Receiver | Acknowledge confirmation, both sides store trust |
| `pairing.v1.reject` | Either → Either | User rejected or timeout |

### Message Definitions

**pairing.v1.request:**

```json
{
  "type": "pairing.v1.request",
  "payload": {
    "publicKey": "base64(publicKey)",
    "name": "Alice's Phone",
    "nonce": "random-string-32chars"
  },
  ...
}
```

| Field | Type | Description |
|-------|------|-------------|
| publicKey | string | Sender's public key (Ed25519) |
| name | string | Sender's device display name |
| nonce | string | Random string, participates in pairing code derivation |

**pairing.v1.exchange:**

```json
{
  "type": "pairing.v1.exchange",
  "payload": {
    "publicKey": "base64(publicKey)",
    "name": "Bob's Laptop",
    "nonce": "random-string-32chars"
  },
  ...
}
```

| Field | Type | Description |
|-------|------|-------------|
| publicKey | string | Receiver's public key (Ed25519) |
| name | string | Receiver's device display name |
| nonce | string | Random string, participates in pairing code derivation |

**pairing.v1.confirm:**

```json
{
  "type": "pairing.v1.confirm",
  "payload": {},
  ...
}
```

No additional fields. Indicates the receiver's user has verified the pairing code and accepted the pairing.

**pairing.v1.complete:**

```json
{
  "type": "pairing.v1.complete",
  "payload": {},
  ...
}
```

No additional fields. Acknowledges that the initiator has also stored the trust record.

**pairing.v1.reject:**

```json
{
  "type": "pairing.v1.reject",
  "payload": {
    "reason": "colink:pairing.user_rejected.v1",
    "message": "User declined the pairing request"
  },
  ...
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reason | string | Yes | Rejection reason |
| message | string | Yes | Human-readable description for logging/debugging |
| details | object | No | Extensible structured metadata. Receivers MUST ignore unknown keys |

Well-known reasons:

| Reason | Description |
|--------|-------------|
| `colink:pairing.user_rejected.v1` | User declined the pairing request |
| `colink:pairing.timeout.v1` | User did not respond within the allowed time |
| `colink:pairing.code_mismatch.v1` | Pairing code does not match |
| `colink:pairing.generic.v1` | Generic pairing failure not covered by a specific reason |

### Pairing Code

Both devices derive a short numeric code for the user to visually compare.

**Derivation:**

```
canonical = "domain=colink-lan-pairing-code\n"
          + "publicKeyA=<lexicographically smaller public key>\n"
          + "publicKeyB=<lexicographically larger public key>\n"
          + "nonceA=<pairing.v1.request nonce>\n"
          + "nonceB=<pairing.v1.exchange nonce>"

code = truncate(SHA-256(canonical), 6 digits)
```

- Inputs: both public keys (lexicographically sorted) + both nonces encoded as the canonical string above
- Public key sorting ensures both sides compute the same value regardless of role
- Nonces are not sorted: `nonceA` is the `pairing.v1.request` nonce, `nonceB` is the `pairing.v1.exchange` nonce
- Truncated to 6 decimal digits for easy visual comparison

**Example user experience:**

```
Alice's screen: "Pairing with Bob's Laptop. Confirm the other device shows: 847291"
Bob's screen:   "Alice's Phone wants to pair. Confirm the other device shows: 847291. Accept?"
```

If a man-in-the-middle substitutes public keys, the two sides will compute different codes.

### Flow

```
Initiator                                      Receiver
  │                                              │
  │─── pairing.v1.request ────────────────────→  │  { publicKey, name, nonce }
  │←── pairing.v1.exchange ────────────────────  │  { publicKey, name, nonce }
  │                                              │
  │  Both compute and display pairing code       │
  │                                              │
  │  ┌─ User accepts on receiver ──────────┐     │
  │  │                                     │     │
  │←── pairing.v1.confirm ─────────────────────  │
  │─── pairing.v1.complete ────────────────────→  │  Initiator stores trust; receiver stores trust
  │                                              │
  │        ═══ Paired, session ready ═══         │
  │                                              │
  │  ┌─ User rejects on either side ───────┐    │
  │  │                                     │    │
  │←→─ pairing.v1.reject ─────────────────────  │  { reason }
  │                                              │
```

### Rules

1. The initiator sends `pairing.v1.request` as the first message after hello (when no trust record exists for the peer).
2. The receiver responds with `pairing.v1.exchange`. Both sides then compute and display the pairing code.
3. The receiver's user makes the accept/reject decision. The initiator's user verifies the code visually and may abort by disconnecting or sending `pairing.v1.reject`.
4. Upon receiving `pairing.v1.confirm`, the initiator stores the peer's trust record and responds with `pairing.v1.complete`.
5. The receiver records pending trust when sending `pairing.v1.confirm`, and only stores the peer's trust record after receiving `pairing.v1.complete`.
6. Upon receiving `pairing.v1.complete`, the receiver knows the pairing is fully established. Both sides proceed to business messages.
7. Either side may send `pairing.v1.reject` at any point during the pairing flow.

## Business Messages

After authentication or pairing completes, both sides first exchange business protocol versions, then negotiate a cipher suite. All subsequent messages after negotiation are encrypted.

### Version Exchange

Both sides simultaneously send a `business.v1.version` message to advertise their business protocol version. This message is sent in the standard envelope format, unencrypted. Upon receiving the peer's version, each side responds with `business.v1.version-ack`.

**business.v1.version:**

```json
{
  "type": "business.v1.version",
  "payload": {
    "businessVersion": "1.0.0"
  },
  ...
}
```

| Field | Type | Description |
|-------|------|-------------|
| businessVersion | string | Semantic version of the business protocol implementation (major.minor.patch) |

**business.v1.version-ack (compatible):**

```json
{
  "type": "business.v1.version-ack",
  "payload": {
    "compatible": true
  },
  ...
}
```

**business.v1.version-ack (incompatible):**

```json
{
  "type": "business.v1.version-ack",
  "payload": {
    "compatible": false,
    "reason": "colink:business.major_mismatch.v1",
    "message": "Business major version 2 is incompatible with local major version 1"
  },
  ...
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| compatible | boolean | Yes | Whether the peer's business version is acceptable |
| reason | string | When incompatible | Rejection reason code |
| message | string | When incompatible | Human-readable description for logging/debugging |

Well-known reasons:

| Reason | Description |
|--------|-------------|
| `colink:business.major_mismatch.v1` | Major version differs, business communication is impossible |
| `colink:business.invalid_version.v1` | `businessVersion` is missing, malformed, or not a valid semver string |
| `colink:business.generic.v1` | Generic business version negotiation failure |

**Flow:**

```
A                                              B
│                                                 │
│─── business.v1.version ───────────────────────→ │  { businessVersion }
│←── business.v1.version ──────────────────────── │  { businessVersion }
│                                                 │
│─── business.v1.version-ack ───────────────────→ │  { compatible: true }
│←── business.v1.version-ack ───────────────────  │  { compatible: true }
│                                                 │
│      ═══ Proceed to cipher negotiation ═══      │
```

Both sides MUST complete version exchange (including acks) before proceeding to cipher negotiation. A side that sends or receives `compatible: false` MUST NOT proceed to negotiation. The connection remains open.

### Negotiation

Both sides simultaneously send a `business.v1.negotiate` message to agree on a cipher suite.

```json
{
  "type": "business.v1.negotiate",
  "payload": {
    "supported": ["x25519-aes-256-gcm", "x25519-chacha20-poly1305"],
    "preferred": "x25519-aes-256-gcm"
  },
  ...
}
```

| Field | Type | Description |
|-------|------|-------------|
| supported | string[] | Cipher suites this device supports |
| preferred | string | First choice from the supported list |

Both sides send this message simultaneously. The agreed suite is determined by: take the intersection of both `supported` lists, then pick the one that appears first in the initiator's `supported` list. If the intersection is empty, negotiation fails locally and business messages are rejected until a compatible negotiation succeeds.

**Cipher suite format:** `<key-exchange>-<symmetric-cipher>`

| Suite | Key Exchange | Symmetric Cipher | Description |
|-------|-------------|-----------------|-------------|
| `x25519-aes-256-gcm` | X25519 ECDH | AES-256-GCM | Default, hardware-accelerated on most platforms |
| `x25519-chacha20-poly1305` | X25519 ECDH | ChaCha20-Poly1305 | Better on devices without AES-NI |

### Key Derivation

1. Convert own Ed25519 private key → X25519 private key
2. Convert peer's Ed25519 public key → X25519 public key
3. Perform ECDH: `shared_secret = X25519(my_x25519_private, peer_x25519_public)`
4. Derive symmetric key: `key = HKDF-SHA256(shared_secret, salt="colink-lan-v1", info="encryption")`

The AEAD construction (AES-GCM / ChaCha20-Poly1305) provides both confidentiality and authenticity. Since the shared secret is derived from both parties' key pairs, successful decryption implicitly authenticates the sender.

### Encrypted Messages

All business messages are wrapped in `business.v1.message`:

```json
{
  "type": "business.v1.message",
  "payload": {
    "ciphertext": "base64(AEAD-encrypt(inner message JSON))",
    "nonce": "base64(12-byte IV)"
  },
  ...
}
```

| Field | Type | Description |
|-------|------|-------------|
| ciphertext | string | AEAD-encrypted inner message (includes auth tag) |
| nonce | string | 12-byte initialization vector, must never repeat with the same key |

Decrypted content uses the bare format:

```json
{
  "type": "file.v1.offer",
  "payload": { ... }
}
```

The inner event types are defined in CoLinkBusiness.

## Keepalive

After authentication or pairing completes, both sides maintain connection liveness using application-level heartbeat messages. This replaces reliance on WebSocket Ping/Pong, which can be intercepted or falsely acknowledged by network intermediaries (proxies, load balancers).

### Message Definitions

**heartbeat.v1.ping:**

```json
{
  "type": "heartbeat.v1.ping",
  "payload": {},
  ...
}
```

No additional fields. Requests a liveness acknowledgment from the peer.

**heartbeat.v1.pong:**

```json
{
  "type": "heartbeat.v1.pong",
  "correlationId": "<ping message id>",
  "payload": {},
  ...
}
```

No additional fields. `correlationId` is set to the `id` of the corresponding `heartbeat.v1.ping`.

### Rules

- Each side sends one `heartbeat.v1.ping` every 15 seconds.
- If 45 seconds pass without receiving any frame from the peer (including heartbeat, business messages, or any other application message), treat the connection as dead and close it.
- Any inbound application message resets the 45-second timer.
- A `heartbeat.v1.pong` whose `correlationId` does not match a pending ping MUST be discarded.
