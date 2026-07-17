# CoLink Business Protocol

> **Current Protocol Version: 1.4.0**
>
> The business protocol uses semantic versioning, independent of the transport layer (P2P / Cloud Relay).
> - **Major** bump: breaking changes — peers with different major versions cannot exchange business messages.
> - **Minor** bump: new message types or backward-compatible additions — required even when old peers simply ignore the unknown types.
> - **Patch** bump: clarifications or bug fixes with no wire-level impact.
>
> When an implementation adopts protocol behavior changes from a newer document revision, it MUST update its advertised version to match the Current Protocol Version declared here.

## Organization

| Document | Description |
|----------|-------------|
| `text-message.md` | Text messaging between devices |
| `clipboard.md` | Clipboard synchronization |
| `file-transfer-v2.md` | File transfer (current) |
| `file-transfer-v1.md` | File transfer (deprecated) |
| `music.md` | Lyrics sync |
| `sysinfo.md` | System resource usage push |
| `filesystem.md` | Remote filesystem browse |

## Version Exchange

The business version is exchanged differently depending on the transport:

- **P2P**: `business.v1.version` / `business.v1.version-ack` signaling messages after auth/pairing, before cipher negotiation. See `CoLinkP2P/websocket/business.md`.
- **Cloud Relay**: Reported via WebSocket query parameter `businessVersion` on connect and distributed through `device.online` events. See `CoLinkServerRESTAPI/websocket/v1.md`.
