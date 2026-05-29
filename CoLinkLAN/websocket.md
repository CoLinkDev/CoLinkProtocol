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
    "signature": "base64(sign(deviceId + timestamp + nonce, privateKey))"
  }
}
```

| Field     | Type   | Description |
|-----------|--------|-------------|
| deviceId  | string | Sender's device ID |
| publicKey | string | Sender's public key |
| name      | string | Sender's device name |
| timestamp | number | Current Unix milliseconds (reject if drift > 30s) |
| nonce     | string | Random string, ensures each handshake is unique |
| signature | string | Sign `deviceId + timestamp + nonce` with sender's private key |

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
    "reason": "user_rejected"
  }
}
```

| Field  | Type   | Description |
|--------|--------|-------------|
| reason | string | Rejection reason |

### Pairing Code

For first-time pairing (Case 2) and key rotation (Case 3), both devices derive a short numeric code for the user to visually compare, preventing man-in-the-middle attacks where an attacker substitutes public keys.

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

Pairing code is NOT shown for Case 1 (known device with matching key) — signature verification alone is sufficient for previously paired devices.

### Flow

```
Alice → Bob: handshake.v1.request { deviceId, publicKey, name, timestamp, nonce, signature }
│
Bob checks local trust store
│
├─ deviceId known + publicKey matches
│   │
│   ├─ Verify signature → Fail
│   │   └─ Bob → Alice: handshake.v1.reject { reason: "signature_invalid" }
│   │
│   └─ Verify signature → Pass
│       ├─ Bob → Alice: handshake.v1.exchange { ... signature }
│       ├─ Alice verifies Bob's signature
│       ├─ Bob → Alice: handshake.v1.accept { deviceId }
│       └─ → Business messages
│
├─ deviceId unknown (first-time pairing)
│   │
│   ├─ Bob → Alice: handshake.v1.exchange { ... signature }
│   ├─ Alice verifies Bob's signature
│   ├─ Both sides compute and display pairing code
│   │
│   ├─ User accepts
│   │   ├─ Bob → Alice: handshake.v1.accept { deviceId }
│   │   ├─ Both sides store peer's deviceId + publicKey in trust store
│   │   └─ → Business messages
│   │
│   └─ User rejects
│       └─ Bob → Alice: handshake.v1.reject { reason: "user_rejected" }
│
└─ deviceId known + publicKey mismatch (key rotation)
    │
    ├─ Warn user about key change
    ├─ Bob → Alice: handshake.v1.exchange { ... signature }
    ├─ Alice verifies Bob's signature
    ├─ Both sides compute and display pairing code
    │
    ├─ User accepts
    │   ├─ Bob → Alice: handshake.v1.accept { deviceId }
    │   ├─ Both sides update trust store
    │   └─ → Business messages
    │
    └─ User rejects
        └─ Bob → Alice: handshake.v1.reject { reason: "key_changed_rejected" }
```

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
