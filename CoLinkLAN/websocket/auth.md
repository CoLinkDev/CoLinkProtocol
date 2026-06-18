# Authentication (auth.v1)

Authentication is used when two previously paired devices reconnect. Both sides verify each other's identity through challenge-response signatures using their stored key pairs.

## Event Types

| Type | Direction | Description |
|------|-----------|-------------|
| `auth.v1.challenge` | Both (initiator first) | Send a random nonce for the peer to sign |
| `auth.v1.response` | Both (initiator first) | Return signature over the peer's nonce |
| `auth.v1.verified` | Both (receiver first) | Signature verified, authentication complete |
| `auth.v1.reject` | Either → Either | Signature invalid, key revoked, or device unknown |

## Message Definitions

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

## Flow

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
  │        ═══ Authenticated ═══                 │
```

## Rules

1. The initiator sends `auth.v1.challenge` first. The receiver sends its own challenge upon receiving the initiator's.
2. Upon receiving the peer's challenge, each side sends `auth.v1.response` (initiator first).
3. To verify a response, the receiver looks up the public key in its local trust store using the `from` field of the envelope.
4. If verification passes, send `auth.v1.verified`. If it fails, send `auth.v1.reject`.
5. Upon receiving `auth.v1.reject` with reason `colink:auth.unknown_device.v1`, the initiator may fall back to `pairing.v1`.
6. Upon receiving `auth.v1.reject` with reason `colink:auth.key_changed.v1`, the receiver removes the peer from its trust store.
