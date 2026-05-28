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
| `auth`    | Authentication handshake |
| (others)  | Business messages as defined in CoLinkBusiness |

## Pairing Flow

Pairing establishes mutual trust between two devices that have not previously exchanged public keys. Upon successful pairing, both sides store the peer's `deviceId` and `publicKey` in their local trust store.

### Event Types

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

### Basic Flow (without challenge)

```
Alice → Bob: connect ws://<Bob_ip>:27777/peer
Alice → Bob: pair.v1.request { deviceId, publicKey, name }
Bob: prompt user "Device Alice (name) requests pairing"
Bob → Alice: pair.v1.accept { deviceId, publicKey, name }   (user confirms)
         or  pair.v1.reject { reason }                      (user rejects)
Both sides store peer's deviceId + publicKey in local trust store
Disconnect, or continue with auth handshake
```

### Challenge Flow (Scheme 0: signature verification)

```
Alice → Bob: pair.v1.request { deviceId, publicKey, name }
Bob → Alice: pair.v1.challenge.0.v1.request { challenge: <random-bytes> }
Alice → Bob: pair.v1.challenge.0.v1.response { response: sign(challenge, Alice_privateKey) }
Bob: verify response against publicKey from the request
Bob: prompt user for confirmation
Bob → Alice: pair.v1.accept { deviceId, publicKey, name, challenge: <random-bytes> }
Alice: verify that Bob signed the challenge in accept using Bob's publicKey
```

### Key Rotation

A device that has rotated its key pair should initiate pairing rather than auth when connecting to peers. When connecting to a device whose key has been rotated, if auth signature verification fails, the implementation should attempt pairing.

Pairing always requires user confirmation. When the same `deviceId` pairs again with a different public key, the implementation must explicitly warn the user that the key has changed.

**Scenario — Alice connects to Bob, Bob's key has changed:**

```
Alice → Bob: auth.v1.request { ... }
Bob → Alice: auth.v1.response { ... }  (Bob signs with new key)
Alice: signature verification fails with stored public key
Alice: prompt user "Bob's key has changed. Re-pair?"
User confirms → Alice → Bob: pair.v1.request { ... }
Bob → Alice: pair.v1.accept { ... }
Alice: update trust store
Alice → Bob: auth.v1.request { ... }  (retry with new public key)
Normal auth flow continues
```

**Scenario — Bob rotated key and connects to Alice:**

```
Bob → Alice: connect ws://<Alice_ip>:27777/peer
Bob → Alice: pair.v1.request { deviceId, publicKey(new), name }
Alice: detect known deviceId with changed publicKey, warn user
User confirms → Alice → Bob: pair.v1.accept { ... }
Both sides update trust store
Bob → Alice: auth.v1.request { ... }
Normal auth flow continues
```

## Auth Handshake

Mutual authentication for devices that already hold each other's public key in their local trust store. Public keys are obtained via LAN pairing or cloud device list synchronization.

### Event Types

| Type | Direction | Description |
|------|-----------|-------------|
| `auth.v1.request`  | Initiator → Receiver | Initiate authentication |
| `auth.v1.response` | Receiver → Initiator | Respond with own proof |
| `auth.v1.confirm`  | Initiator → Receiver | Confirm handshake completion |
| `auth.v1.fail`     | Either → Either      | Authentication failed |

### Flow

```
Alice → Bob: auth.v1.request { deviceId, timestamp, nonce, signature }
Bob: verify Alice's deviceId exists in trust store
Bob: verify signature using Alice's public key
Bob: check timestamp drift ≤ 30s
Bob → Alice: auth.v1.response { deviceId, timestamp, nonce, peerNonce, signature }
Alice: verify Bob's deviceId exists in trust store
Alice: verify Bob's signature using Bob's public key
Alice: confirm peerNonce matches the nonce sent in request
Alice: check timestamp drift ≤ 30s
Alice → Bob: auth.v1.confirm {}
Connection is ready for business messages
```

### Message Definitions

**auth.v1.request**

```json
{
  "type": "auth.v1.request",
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
| nonce     | string | Random string to prevent replay |
| signature | string | Sign `deviceId + timestamp + nonce` with sender's private key |

**auth.v1.response**

```json
{
  "type": "auth.v1.response",
  "payload": {
    "deviceId": "770e8400-...",
    "timestamp": 1716451200001,
    "nonce": "another-random-string",
    "peerNonce": "random-string-32chars",
    "signature": "base64(sign(deviceId + timestamp + nonce + peerNonce, privateKey))"
  }
}
```

| Field     | Type   | Description |
|-----------|--------|-------------|
| deviceId  | string | Responder's device ID |
| timestamp | number | Current Unix milliseconds |
| nonce     | string | Responder's own random string |
| peerNonce | string | Echo of initiator's nonce (binds response to this session) |
| signature | string | Sign `deviceId + timestamp + nonce + peerNonce` with private key |

**auth.v1.confirm**

```json
{
  "type": "auth.v1.confirm",
  "payload": {}
}
```

**auth.v1.fail**

```json
{
  "type": "auth.v1.fail",
  "payload": {
    "reason": "unknown device"
  }
}
```

Connection is closed after `auth.v1.fail`.

## Keepalive

After a successful auth handshake, both sides maintain connection liveness using WebSocket Ping/Pong.

- Each side sends one WebSocket `Ping` frame every 15 seconds
- If 45 seconds pass without receiving any frame from the peer, treat the connection as dead and close it
- Any inbound message, `Ping`, or `Pong` resets the 45-second timer
