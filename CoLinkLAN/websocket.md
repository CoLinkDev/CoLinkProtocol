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

| Namespace | Purpose |
|-----------|---------|
| `pair`    | Device pairing |
| `auth`    | Identity verification |
| (others)  | Business messages as defined in CoLinkBusiness |

## Authentication

After a WebSocket connection is established, the initiator determines which path to take:

```
Connection established
  ├─ Peer's deviceId exists in trust store AND own key has not rotated
  │     → Identity verification (auth.v1.hello exchange)
  │         ├─ Success → Business messages
  │         └─ Signature mismatch (deviceId known, peer may have rotated) 
  │               → Pairing
  │               → Business messages (no hello needed)
  │
  └─ Peer's deviceId is unknown OR own key has rotateds
        → Pairing
        → Business messages (no hello needed)
```

### Identity Verification

For devices that already hold each other's public key in their local trust store (via prior pairing or cloud device list synchronization), identity is verified by a single round-trip signature exchange.

**Event type:** `auth.v1.hello`

**Flow:**

```
Alice → Bob: auth.v1.hello { deviceId, timestamp, nonce, signature }
Bob: verify signature using Alice's public key from trust store
Bob → Alice: auth.v1.hello { deviceId, timestamp, nonce, signature }
Alice: verify signature using Bob's public key from trust store
Connection is ready for business messages
```

If verification fails due to unknown deviceId or timestamp drift > 30s, the verifying side closes the connection.

**Message definition:**

```json
{
  "type": "auth.v1.hello",
  "payload": {
    "deviceId": "660e8400-...",
    "timestamp": 1716451200000,
    "nonce": "random-string-32chars",
    "signature": "base64(sign(deviceId + timestamp + nonce, privateKey))"
  }
}
```

| Field     | Type   | Description |
|-----------|--------|-------------|
| deviceId  | string | Sender's device ID |
| timestamp | number | Current Unix milliseconds (reject if drift > 30s) |
| nonce     | string | Random string, ensures each hello is unique |
| signature | string | Sign `deviceId + timestamp + nonce` with sender's private key |

### Pairing

Pairing establishes mutual trust between two devices that have not previously exchanged public keys. Upon successful pairing, both sides store the peer's `deviceId` and `publicKey` in their local trust store. The connection is then ready for business messages without an additional hello exchange.

**Event types:**

| Type | Direction | Description |
|------|-----------|-------------|
| `pair.v1.request` | Initiator → Receiver | Request to pair |
| `pair.v1.accept`  | Receiver → Initiator | Accept pairing (requires user confirmation) |
| `pair.v1.reject`  | Receiver → Initiator | Reject pairing |

Challenge sub-protocol (Scheme 0: signature verification, optional):

| Type | Direction | Description |
|------|-----------|-------------|
| `pair.v1.challenge.0.v1.request`  | Receiver → Initiator | Send challenge to verify key ownership |
| `pair.v1.challenge.0.v1.response` | Initiator → Receiver | Return signed challenge |

**Basic flow (without challenge):**

```
Alice → Bob: pair.v1.request { deviceId, publicKey, name }
Bob: prompt user "Device Alice (name) requests pairing"
Bob → Alice: pair.v1.accept { deviceId, publicKey, name }   (user confirms)
         or  pair.v1.reject { reason }                      (user rejects)
Both sides store peer's deviceId + publicKey in local trust store
Connection is ready for business messages
```

**Challenge flow (Scheme 0: signature verification):**

```
Alice → Bob: pair.v1.request { deviceId, publicKey, name }
Bob → Alice: pair.v1.challenge.0.v1.request { challenge: <random-bytes> }
Alice → Bob: pair.v1.challenge.0.v1.response { response: sign(challenge, Alice_privateKey) }
Bob: verify response against publicKey from the request
Bob: prompt user for confirmation
Bob → Alice: pair.v1.accept { deviceId, publicKey, name, challenge: <random-bytes> }
Alice: verify that Bob signed the challenge in accept using Bob's publicKey
Connection is ready for business messages
```

### Key Rotation

When the same `deviceId` pairs again with a different public key, the implementation must explicitly warn the user that the key has changed.

**Scenario — hello fails due to peer's key change:**

```
Alice → Bob: auth.v1.hello { ... }
Bob → Alice: auth.v1.hello { ... }  (Bob signs with new key)
Alice: signature verification fails
Alice: prompt user "Bob's key has changed. Re-pair?"
User confirms → Alice → Bob: pair.v1.request { ... }
               Bob → Alice: pair.v1.accept { ... }
               Alice: update trust store
               Connection is ready for business messages
```

**Scenario — initiator knows own key has rotated:**

```
Bob (rotated key) → Alice: pair.v1.request { deviceId, publicKey(new), name }
Alice: detect known deviceId with changed publicKey, warn user
User confirms → Alice → Bob: pair.v1.accept { ... }
Both sides update trust store
Connection is ready for business messages
```

## Keepalive

After authentication completes (via either path), both sides maintain connection liveness using WebSocket Ping/Pong.

- Each side sends one WebSocket `Ping` frame every 15 seconds
- If 45 seconds pass without receiving any frame from the peer, treat the connection as dead and close it
- Any inbound message, `Ping`, or `Pong` resets the 45-second timer
