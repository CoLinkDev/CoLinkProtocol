# CoLink Business Protocol

> **Current Protocol Version: 1.9.0**
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
| `system-control.md` | Remote system control |
| `terminal.md` | Remote terminal control |

## Version Exchange

The business version is exchanged differently depending on the transport:

- **P2P**: `business.v1.version` / `business.v1.version-ack` signaling messages after auth/pairing, before cipher negotiation. See `CoLinkP2P/websocket/business.md`.
- **Cloud Relay**: Reported via WebSocket query parameter `businessVersion` on connect and distributed through `device.online` events. See `CoLinkServerRESTAPI/websocket/v1.md`.

## Forward Compatibility

- A receiver MUST silently ignore a Business message whose `type` it does not recognize. It MUST NOT close the transport connection or send an error solely because the message type is unknown.
- A receiver MUST ignore unknown fields in a recognized Business message unless that message's specification explicitly requires rejection for the field. Unknown fields MUST NOT alter the interpretation of recognized fields.
- When adding a new message type, action value, or field value, its document MUST define the minimum Business Protocol Version and the sender and receiver behavior for peers that predate it.
