# LAN WebSocket Protocol

LAN peer-to-peer communication is carried over a single WebSocket connection.

## Connection

```
ws://<localIp>:<localPort>/peer
```

Each device runs a local WebSocket server (default port 27777). The party that initiates the WebSocket connection sends the first protocol message.

## Event Format

All messages use a unified envelope:

```json
{
  "type": "<type>",
  "payload": { ... }
}
```

Type namespaces:

| Namespace   | Purpose |
|-------------|---------|
| `handshake` | Connection handshake (identity verification + pairing) |
| `business`  | Encrypted business message transport |

## Handshake

After a WebSocket connection is established, the initiator sends a `handshake.v1.request`. The receiver determines how to proceed based on local trust state.

### Event Types

| Type | Direction | Description |
|------|-----------|-------------|
| `handshake.v1.request`  | Initiator → Receiver | Initiate handshake with identity + signature |
| `handshake.v1.exchange` | Receiver → Initiator | Return receiver's identity + signature |
| `handshake.v1.accept`   | Receiver → Initiator | Handshake complete |
| `handshake.v1.reject`   | Receiver → Initiator | Reject connection |

### Message Definitions

**handshake.v1.request / handshake.v1.exchange:**

```json
{
  "type": "handshake.v1.request",
  "payload": {
    "deviceId": "660e8400-...",
    "publicKey": "base64(publicKey)",
    "name": "Alice's Phone",
    "timestamp": 1716451200000,
    "nonce": "random-string-32chars",
    "signature": "base64(sign(deviceId + timestamp + nonce, privateKey))",
    "hasTrust": true
  }
}
```

| Field     | Type   | Description |
|-----------|--------|-------------|
| deviceId  | string | Sender's device ID |
| publicKey | string | Sender's public key |
| name      | string | Sender's device name |
| timestamp | number | Current Unix milliseconds |
| nonce     | string | Random string, ensures each handshake is unique |
| signature | string | Sign `deviceId + timestamp + nonce` with sender's private key |
| hasTrust  | boolean | Whether the sender already trusts the receiver (has a valid trust record). Defaults to `true` if absent (backward compatibility). Does NOT participate in signature computation. |

**handshake.v1.accept:**

```json
{
  "type": "handshake.v1.accept",
  "payload": {
    "deviceId": "770f9500-..."
  }
}
```

| Field    | Type   | Description |
|----------|--------|-------------|
| deviceId | string | Receiver's device ID |

**handshake.v1.reject:**

```json
{
  "type": "handshake.v1.reject",
  "payload": {
    "reason": "colink:handshake.user_rejected.v1"
  }
}
```

| Field  | Type   | Description |
|--------|--------|-------------|
| reason | string | Rejection reason (see [Reason Format](../README.md#reason-format)) |

Well-known reasons (implementations may send other values; receivers should treat unrecognized reasons as a generic rejection):

| Reason | Description |
|--------|-------------|
| `colink:handshake.user_rejected.v1` | User declined the pairing request |
| `colink:handshake.signature_invalid.v1` | Signature verification failed |
| `colink:handshake.key_changed.v1` | Peer's public key has changed since last trust — connection refused, trust revoked |

### Pairing Code

For first-time pairing (Case 2), both devices derive a short numeric code for the user to visually compare, preventing man-in-the-middle attacks where an attacker substitutes public keys.

**Derivation:**

```
code = truncate(SHA-256(sort(publicKey_A, publicKey_B) + nonce_A + nonce_B), 6 digits)
```

- Inputs: both public keys (lexicographically sorted) + both nonces
- Sorting ensures both sides compute the same value regardless of role
- Truncated to 6 decimal digits for easy visual comparison

**Example User experience:**

```
Alice's screen: "Pairing with Bob's Laptop. Confirm the other device shows: 847291"
Bob's screen:   "Alice's Phone wants to pair. Confirm the other device shows: 847291. Accept?"
```

If a man-in-the-middle substitutes public keys, the two sides will compute different codes.

Pairing code is NOT shown when both sides declare `hasTrust: true` (mutual trust) — signature verification alone is sufficient for previously paired devices. If either side sends `hasTrust: false`, both sides MUST display the pairing code and require user confirmation, even if one side has an existing trust record for the other.

### Flow

```
Alice → Bob: handshake.v1.request { deviceId, publicKey, name, timestamp, nonce, signature, hasTrust }
│
Bob checks local trust store
│
├─ deviceId known + publicKey matches
│   │
│   ├─ Verify signature → Fail
│   │   └─ Bob → Alice: handshake.v1.reject { reason: "colink:handshake.signature_invalid.v1" }
│   │
│   └─ Verify signature → Pass
│       │
│       ├─ Bob trusts Alice AND Alice.hasTrust == true (mutual trust → fast path)
│       │   ├─ Bob → Alice: handshake.v1.exchange { ..., hasTrust: true }
│       │   ├─ Alice verifies Bob's signature
│       │   ├─ Bob → Alice: handshake.v1.accept { deviceId }
│       │   └─ → Business messages
│       │
│       └─ Bob does NOT trust Alice OR Alice.hasTrust == false (trust not mutual → pairing required)
│           ├─ Bob → Alice: handshake.v1.exchange { ..., hasTrust: <Bob's actual trust state> }
│           ├─ Alice verifies Bob's signature
│           ├─ Both sides compute and display pairing code
│           │
│           ├─ User accepts
│           │   ├─ Bob → Alice: handshake.v1.accept { deviceId }
│           │   ├─ Both sides store peer's deviceId + publicKey in trust store
│           │   └─ → Business messages
│           │
│           └─ User rejects
│               └─ Bob → Alice: handshake.v1.reject { reason: "colink:handshake.user_rejected.v1" }
│
├─ deviceId unknown (first-time pairing)
│   │
│   ├─ Bob → Alice: handshake.v1.exchange { ..., hasTrust: false }
│   ├─ Alice verifies Bob's signature
│   ├─ Both sides compute and display pairing code
│   │
│   ├─ User accepts
│   │   ├─ Bob → Alice: handshake.v1.accept { deviceId }
│   │   ├─ Both sides store peer's deviceId + publicKey in trust store
│   │   └─ → Business messages
│   │
│   └─ User rejects
│       └─ Bob → Alice: handshake.v1.reject { reason: "colink:handshake.user_rejected.v1" }
│
└─ deviceId known + publicKey mismatch (key changed)
    │
    └─ Bob → Alice: handshake.v1.reject { reason: "colink:handshake.key_changed.v1" }
      └─ Bob removes Alice from trust store (requires re-pairing)
```

**Initiator (Alice) dialog decision after receiving `exchange`:**

- If Alice's own `hasTrust == false` → show pairing dialog (Alice already knows pairing is needed)
- If Alice's own `hasTrust == true` BUT Bob's `hasTrust == false` → show pairing dialog
- If both `hasTrust == true` → fast path, no dialog

## Business Messages

After handshake completes, both sides negotiate a cipher suite, then all subsequent messages are encrypted.

### Negotiation

Immediately after handshake, both sides exchange a `business.v1.negotiate` message to agree on a cipher suite.

**Event type:** `business.v1.negotiate`

```json
{
  "type": "business.v1.negotiate",
  "payload": {
    "supported": ["x25519-aes-256-gcm", "x25519-chacha20-poly1305"],
    "preferred": "x25519-aes-256-gcm"
  }
}
```

| Field     | Type     | Description |
|-----------|----------|-------------|
| supported | string[] | Cipher suites this device supports |
| preferred | string   | First choice from the supported list |

Both sides send this message simultaneously. The agreed suite is determined by: take the intersection of both `supported` lists, then pick the one that appears first in the initiator's `supported` list. If the intersection is empty, both sides close the connection.

**Cipher suite format:** `<key-exchange>-<symmetric-cipher>`

| Suite | Key Exchange | Symmetric Cipher | Description |
|-------|-------------|-----------------|-------------|
| `x25519-aes-256-gcm` | X25519 ECDH | AES-256-GCM | Default, hardware-accelerated on most platforms |
| `x25519-chacha20-poly1305` | X25519 ECDH | ChaCha20-Poly1305 | Better on devices without AES-NI |

**Key derivation after negotiation:**

1. Convert own Ed25519 private key → X25519 private key
2. Convert peer's Ed25519 public key → X25519 public key
3. Perform ECDH: `shared_secret = X25519(my_x25519_private, peer_x25519_public)`
4. Derive symmetric key: `key = HKDF-SHA256(shared_secret, salt="colink-lan-v1", info="encryption")`

The AEAD construction (AES-GCM / ChaCha20-Poly1305) provides both confidentiality and authenticity. Since the shared secret is derived from both parties' key pairs, successful decryption implicitly authenticates the sender.

### Encrypted Messages

All business messages are wrapped in `business.v1.message`:

**Event type:** `business.v1.message`

```json
{
  "type": "business.v1.message",
  "payload": {
    "ciphertext": "base64(AEAD-encrypt(original message JSON))",
    "nonce": "base64(12-byte IV)"
  }
}
```

| Field      | Type   | Description |
|------------|--------|-------------|
| ciphertext | string | AEAD-encrypted original message (includes auth tag) |
| nonce      | string | 12-byte initialization vector, must never repeat with the same key |

Decrypted content is a complete event envelope:

```json
{
  "type": "file.v1.offer",
  "payload": { ... }
}
```

The inner event types are defined in CoLinkBusiness.

## Keepalive

After handshake completes, both sides maintain connection liveness using WebSocket Ping/Pong.

- Each side sends one WebSocket `Ping` frame every 15 seconds
- If 45 seconds pass without receiving any frame from the peer, treat the connection as dead and close it
- Any inbound message, `Ping`, or `Pong` resets the 45-second timer
