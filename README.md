# CoLink API Documentation

## Organization

Documents are organized by protocol layer:

```
ColinkAPI/
├── CoLinkServer/           — Server protocol (device ↔ cloud server)
│   ├── auth/               — Authentication module
│   │   ├── register.md     — User registration
│   │   ├── login.md        — User login
│   │   ├── logout.md       — Logout (revoke refresh token)
│   │   ├── refresh.md      — Refresh access token
│   │   ├── change-password.md — Change password
│   │   └── me.md           — Get current user info / token check
│   ├── devices/            — Device management module
│   │   ├── register.md     — Bind new device
│   │   ├── list.md         — List all devices
│   │   ├── update.md       — Update device name
│   │   ├── delete.md       — Unbind device
│   │   └── rotate-key.md   — Rotate device public key
│   └── websocket/          — Cloud WebSocket module
│       ├── ticket.md       — Obtain WebSocket auth ticket
│       └── v1.md           — WebSocket protocol v1
├── CoLinkLAN/              — LAN protocol (device ↔ device, local network)
│   ├── discovery.md        — mDNS service discovery
│   └── handshake.md        — Peer authentication handshake
└── CoLinkBusiness/         — Business protocol (application-level messages)
    ├── clipboard.md        — Clipboard sync
    ├── file-transfer.md    — File transfer
    └── text-message.md     — Text messaging
```

## Design Principles

- Server protocol: HTTP REST + WebSocket, handles account system and message relay
- LAN protocol: mDNS discovery + WebSocket direct connection, handles local device pairing
- Business protocol: unified message format, transport-agnostic (works over both server relay and LAN direct)

## Common Conventions

- All HTTP APIs prefixed with `/api`
- Authentication via `Authorization: Bearer <token>` header
- Timestamps: ISO 8601 / Unix milliseconds
- IDs: UUID v4
- Response envelope: `{ "code": 0, "data": {...}, "message": "ok" }`
- Error envelope: `{ "code": <errorCode>, "data": null, "message": "description" }`
