# LAN Discovery

Device discovery on local network using mDNS/DNS-SD.

## Service

| Field        | Value                 |
|--------------|-----------------------|
| Service Type | `_colink._tcp.local.` |
| Port         | 27777 (default)       |

## TXT Records

| Key      | Value          | Description      |
|----------|----------------|------------------|
| deviceId | `660e8400-...` | Full device UUID |
| version  | `1`            | Protocol version |

## Flow

1. Device starts → advertises `_colink._tcp.local.` with TXT records
2. Other devices browse for the same service type
3. On discovery → check `deviceId` against local trust store
4. Known device → initiate WebSocket connection to `ws://<ip>:<port>/peer`, perform auth handshake (see `websocket.md`)
5. Unknown device → may initiate pairing (see `websocket.md`)

## Notes

- No identity verification at the discovery layer; authentication is handled by the WebSocket protocol
- Re-advertise on network interface changes (WiFi reconnect, etc.)
- Stop advertising when app is backgrounded (mobile)
