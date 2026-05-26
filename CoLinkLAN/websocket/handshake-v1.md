# Peer Handshake (v1)

Mutual authentication handshake for direct device-to-device WebSocket connections.

## Protocol Version

`v1`

## Connection

```
ws://<localIp>:<localPort>/peer
```

Each device runs a local WebSocket server (default port 27777).

## Handshake Flow

```
Initiator (A)                              Receiver (B)
    |                                           |
    |--- auth.request (A signs) -------------->|
    |                                           | validate A's deviceId
    |                                           | verify A's signature
    |                                           |
    |<-- auth.response (B signs) --------------|
    |                                           |
    | validate B's deviceId                     |
    | verify B's signature                      |
    |                                           |
    |--- auth.confirm ------------------------>|
    |                                           |
    |    (connection ready for business messages)
```

Both sides prove their identity. Neither trusts the other until verified.

## Step 1: Initiator sends auth.request

```json
{
  "type": "auth.request",
  "payload": {
    "deviceId": "660e8400-...",
    "timestamp": 1716451200000,
    "nonce": "random-string-32chars",
    "signature": "base64(sign(deviceId + timestamp + nonce, A_privateKey))"
  }
}
```

| Field     | Type   | Description                                         |
|-----------|--------|-----------------------------------------------------|
| deviceId  | string | Initiator's device ID                               |
| timestamp | number | Current Unix ms (reject if drift > 30s)             |
| nonce     | string | Random string to prevent replay                     |
| signature | string | Sign `deviceId + timestamp + nonce` with private key |

## Step 2: Receiver validates and responds

Receiver validates:
1. Check `deviceId` exists in local device list cache
2. Look up A's public key
3. Verify signature
4. Check timestamp drift ≤ 30 seconds

If valid, Receiver responds with its own signed proof:

```json
{
  "type": "auth.response",
  "payload": {
    "deviceId": "770e8400-...",
    "timestamp": 1716451200001,
    "nonce": "another-random-string",
    "peerNonce": "random-string-32chars",
    "signature": "base64(sign(deviceId + timestamp + nonce + peerNonce, B_privateKey))"
  }
}
```

| Field     | Type   | Description                                                  |
|-----------|--------|--------------------------------------------------------------|
| deviceId  | string | Receiver's device ID                                         |
| timestamp | number | Current Unix ms                                              |
| nonce     | string | Receiver's own random string                                 |
| peerNonce | string | Echo back initiator's nonce (binds response to this session) |
| signature | string | Sign `deviceId + timestamp + nonce + peerNonce`              |

If validation fails:

```json
{
  "type": "auth.fail",
  "payload": {
    "reason": "unknown device"
  }
}
```

Connection is closed on `auth.fail`.

## Step 3: Initiator validates and confirms

Initiator validates:
1. Check B's `deviceId` in local device list cache
2. Verify B's signature using B's public key
3. Confirm `peerNonce` matches the nonce sent in Step 1
4. Check timestamp drift ≤ 30 seconds

If valid, send confirmation:

```json
{
  "type": "auth.confirm",
  "payload": {}
}
```

If invalid, close connection immediately.

## Post-Handshake

After `auth.confirm`, both sides exchange business protocol messages directly (same format as cloud relay payloads).

## Security Properties

- **Mutual authentication**: both sides prove identity via signature
- **Replay protection**: nonce + timestamp prevent replaying old handshakes
- **Session binding**: `peerNonce` echo ensures response is for this specific session
- **No MITM**: attacker cannot forge signatures without private keys
