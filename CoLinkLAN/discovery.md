# LAN Discovery

Device discovery on local network using mDNS/DNS-SD.

## Service

| Field        | Value                 |
|--------------|-----------------------|
| Service Type | `_colink._tcp.local.` |
| Port         | 27777 (default)        |

## TXT Records

| Key         | Value              | Description                                          |
|-------------|--------------------|------------------------------------------------------|
| accountHash | `a1b2c3d4`         | First 8 chars of SHA-256(userId), for quick filtering |
| deviceId    | `660e8400-...`     | Full device UUID                                     |
| version     | `1`                | Protocol version                                     |

## Flow

1. Device starts → advertises `_colink._tcp.local.` with TXT records
2. Other devices browse for the same service type
3. On discovery → compare `accountHash` with own `SHA-256(userId)[:8]`
4. Match → check `deviceId` against local device list cache (from cloud API)
5. Valid → initiate WebSocket connection to `ws://<ip>:<port>/peer`
6. Perform peer handshake (see `handshake.md`)

## Notes

- `accountHash` is NOT authentication, just a filter to reduce noise
- Actual identity verification happens in the handshake
- Re-advertise on network interface changes (WiFi reconnect, etc.)
- Stop advertising when app is backgrounded (mobile)
