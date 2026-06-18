# Business Messages

After authentication or pairing completes, both sides first exchange business protocol versions, then negotiate an encrypted business session. After negotiation completes, business messages are encrypted in `business.v1.message`.

## Version Exchange (business.v1.version, business.v1.version-ack)

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
│  ┌─ If both protocolVersion >= 1.1.0 ────────┐  │
│  │                                           │  │
│  │─── business.v1.key-exchange ────────────→ │  │  { ephemeralPublicKey, signature }
│  │←── business.v1.key-exchange ───────────── │  │  { ephemeralPublicKey, signature }
│  │                                           │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│      ═══ Proceed to cipher negotiation ═══      │
```

Both sides MUST complete version exchange (including acks) before proceeding. If both peers' `protocolVersion` is >= 1.1.0, ephemeral key exchange follows (see below); otherwise proceed directly to cipher negotiation. A side that sends or receives `compatible: false` MUST NOT proceed. The connection remains open.

## Encrypted Session

### Ephemeral Key Exchange (business.v1.key-exchange)

When both peers' `protocolVersion` is >= 1.1.0, both sides perform an ephemeral key exchange before cipher negotiation. This provides **forward secrecy**: even if a device's long-term Ed25519 private key is later compromised, past session traffic cannot be decrypted.

When either peer's `protocolVersion` is < 1.1.0, this phase is skipped — proceed directly to Negotiation. The higher-version peer degrades gracefully: the connection still functions using the legacy key derivation path, without forward secrecy.

#### Message Definition

**business.v1.key-exchange:**

```json
{
  "type": "business.v1.key-exchange",
  "payload": {
    "ephemeralPublicKey": "base64(32-byte X25519 public key)",
    "signature": "base64(Ed25519 signature)"
  },
  ...
}
```

| Field | Type | Description |
|-------|------|-------------|
| ephemeralPublicKey | string | A freshly generated X25519 public key for this connection only (base64-encoded, 32 bytes) |
| signature | string | Ed25519 signature over the canonical string below, using the sender's long-term identity key (base64-encoded, 64 bytes) |

**Signature canonical string:**

```
domain=colink-lan-key-exchange\nfrom=<envelope.from>\nto=<envelope.to>\nephemeralPublicKey=<base64 of ephemeral public key>\ntimestamp=<envelope.timestamp>
```

The signature binds the ephemeral key to the sender's long-term identity, the specific peer pair (`from`/`to` device IDs), and a timestamp, preventing replay attacks, key substitution, and cross-connection reuse.

**business.v1.key-exchange-reject:**

```json
{
  "type": "business.v1.key-exchange-reject",
  "payload": {
    "reason": "colink:key_exchange.signature_invalid.v1",
    "message": "Ephemeral key signature verification failed"
  },
  ...
}
```

| Field | Type | Description |
|-------|------|-------------|
| reason | string | Rejection reason code |
| message | string | Human-readable description for logging/debugging |

Well-known reasons:

| Reason | Description |
|--------|-------------|
| `colink:key_exchange.signature_invalid.v1` | The Ed25519 signature over the ephemeral key did not verify |
| `colink:key_exchange.timestamp_expired.v1` | The `timestamp` is outside the ±30 second acceptance window |
| `colink:key_exchange.generic.v1` | Generic key exchange failure |

Upon receiving or sending `business.v1.key-exchange-reject`, the key exchange has failed. Both sides MUST NOT proceed to cipher negotiation; encrypted business messages are unavailable for this connection. The connection remains open, but no business communication occurs.

#### Flow

```
A                                              B
│                                              │
│─── business.v1.key-exchange ────────────────→│  { ephemeralPublicKey, signature }
│←── business.v1.key-exchange ─────────────────│  { ephemeralPublicKey, signature }
│                                              │
│  Both verify signature and keep verified     │
│  ephemeral public keys for key derivation    │
│                                              │
│      ═══ Proceed to cipher negotiation ═══   │
```

Both sides send simultaneously. Upon receiving the peer's message, each side:

1. Verifies `signature` using the peer's long-term Ed25519 public key (from the trust record established during auth/pairing).
2. Verifies that `timestamp` is within ±30 seconds of local time.
3. If verification fails, sends `business.v1.key-exchange-reject` with an appropriate reason. The key exchange fails and encrypted business messages are unavailable for this connection.
4. On success, computes the shared secret from ephemeral keys (see Key Derivation below).

#### Rules

1. Each connection MUST generate a fresh X25519 key pair. Ephemeral private keys MUST NOT be persisted to storage and MUST be erased from memory once key derivation is complete.
2. Implementations MUST NOT reuse an ephemeral key pair across connections.
3. The ephemeral public key in `payload` MUST match the key used for ECDH in key derivation.
4. The long-term Ed25519 key used for signing MUST be the same key authenticated during `auth.v1` or established during `pairing.v1`.

### Negotiation

Both sides simultaneously send a `business.v1.negotiate` message to agree on a cipher suite.

```json
{
  "type": "business.v1.negotiate",
  "payload": {
    "supported": ["x25519-aes-256-gcm", "x25519-chacha20-poly1305"]
  },
  ...
}
```

| Field | Type | Description |
|-------|------|-------------|
| supported | string[] | Cipher suites this device supports |

Both sides send this message simultaneously. The agreed suite is determined by: take the intersection of both `supported` lists, then pick the one that appears first in the initiator's `supported` list. If the intersection is empty, negotiation fails locally and business messages are rejected until a compatible negotiation succeeds.

**Cipher suite format:** `<key-exchange>-<symmetric-cipher>`

| Suite | Key Exchange | Symmetric Cipher | Description |
|-------|-------------|-----------------|-------------|
| `x25519-aes-256-gcm` | X25519 ECDH | AES-256-GCM | Default, hardware-accelerated on most platforms |
| `x25519-chacha20-poly1305` | X25519 ECDH | ChaCha20-Poly1305 | Better on devices without AES-NI |

### Key Derivation

#### When `business.v1.key-exchange` was performed (protocol version >= 1.1.0, forward secrecy)

The session key is derived exclusively from ephemeral keys exchanged during `business.v1.key-exchange`:

1. Perform ECDH: `shared_secret = X25519(my_ephemeral_private, peer_ephemeral_public)`
2. Derive symmetric key:

```
info = "domain=colink-lan-session-key\n"
     + "from=<lexicographically smaller deviceId>\n"
     + "to=<lexicographically larger deviceId>\n"
     + "ephemeralA=<base64 ephemeral public key of 'from' side>\n"
     + "ephemeralB=<base64 ephemeral public key of 'to' side>\n"
     + "protocolVersion=<min(local_version, peer_version)>\n"
     + "suite=<negotiated cipher suite>"

key = HKDF-SHA256(shared_secret, salt="colink-lan-v2", info=info)
```

The `from`/`to` fields are lexicographically sorted by deviceId to ensure both sides compute the same info string regardless of connection direction. `ephemeralA`/`ephemeralB` follow the same sort order.

The long-term identity keys are NOT used in key derivation — they are only used for authentication (auth.v1 challenge-response) and signing (business.v1.key-exchange signature).

**Forward secrecy guarantee:** After key derivation completes, the ephemeral private key is destroyed. A future compromise of the long-term identity key cannot recover past session keys because the ephemeral private keys no longer exist.

#### When `business.v1.key-exchange` was NOT performed (protocol version < 1.1.0, legacy)

> This derivation method does not provide forward secrecy. It is used when one or both peers predate protocol version 1.1.0, and the higher-version peer gracefully degrades to this path. Under this derivation, the same device pair always derives the same session key; if a device's long-term private key is compromised, all past recorded traffic between that device pair can be decrypted. Additionally, nonce counters reset to zero on each new connection while the key remains the same, which creates a theoretical nonce-reuse risk. Implementations SHOULD upgrade to protocol version >= 1.1.0 to gain forward secrecy.

The session key is derived from the long-term identity keys:

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
