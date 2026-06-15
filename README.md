# CoLink Protocol Documentation

## Organization

```
CoLinkProtocol/
├── CoLinkServer/     — Server protocol (device ↔ cloud server)
├── CoLinkLAN/        — LAN protocol (device ↔ device, local network)
└── CoLinkBusiness/   — Business protocol (application-level messages)
```

## Cryptography

All devices generate an **Ed25519** key pair at initialization time.

## Design Principles

- Server protocol: HTTP REST + WebSocket, handles account system and message relay
- LAN protocol: mDNS discovery + WebSocket direct connection, handles local device pairing
- Business protocol: unified message format, transport-agnostic (works over both server relay and LAN direct)

## Reason Format

The `reason` field in protocol messages supports a structured format for machine-parseable reason codes.

### Format

```
colink:{domain}.{code}.{version}
```

| Part       | Description                                            | Example        |
|------------|--------------------------------------------------------|----------------|
| `colink:`  | Fixed prefix, used to identify structured reason codes | —              |
| `{domain}` | Protocol domain the reason belongs to                  | `auth`, `pairing`, `transfer` |
| `{code}`   | Specific reason identifier in snake_case               | `user_rejected`, `storage_full` |
| `{version}`| Format version                                         | `v1`           |

### Parsing Rules

- If the `reason` string starts with `colink:` → structured reason code, parse and handle by semantics.
- Unrecognized structured codes (valid prefix but unknown domain/code) MUST be treated as a generic failure within that domain.
- Each domain defines a `colink:{domain}.generic.v1` reason as the fallback. Senders that cannot find a specific reason MUST use the generic reason for that domain and describe details in `message`.
