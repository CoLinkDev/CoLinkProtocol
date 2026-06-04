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

## HTTP APIs Common Conventions

- Prefixed with `/api`
- Authentication via `Authorization: Bearer <token>` header
- Timestamps: ISO 8601 / Unix milliseconds
- IDs: UUID v4
- Response envelope: `{ "code": 0, "data": {...}, "message": "ok" }`
- Error envelope: `{ "code": <errorCode>, "data": null, "message": "description" }`

### Error Codes

Code `0` = success. Positive codes are module-specific (defined in each API doc). Negative codes are global.

### Global Error Codes

| Code | Message              | HTTP Status | Description                                    |
|------|----------------------|-------------|------------------------------------------------|
| -1   | internal error       | 500         | Unhandled error, catch-all fallback            |
| 1030 | unauthorized         | 401         | Missing or invalid access token (middleware)   |
| 3001 | rate limited         | 429         | Too many requests                              |
| 4001 | invalid request body | 400         | JSON parse error or missing required fields    |
| 4002 | invalid parameter    | 400         | Path/query parameter validation failure        |

Notes:
- Code `-1` is returned when no specific error code matches. Never expose internal details (stack trace, SQL) in the message.
- Module-specific codes: `1xxx` = auth, `2xxx` = device. See individual endpoint docs.

## Reason Format

The `reason` field in protocol messages supports a structured format for machine-parseable reason codes.

### Format

```
colink:{domain}.{code}.{version}
```

| Part       | Description                                            | Example        |
|------------|--------------------------------------------------------|----------------|
| `colink:`  | Fixed prefix, used to identify structured reason codes | —              |
| `{domain}` | Protocol domain the reason belongs to                  | `handshake`, `transfer` |
| `{code}`   | Specific reason identifier in snake_case               | `user_rejected`, `storage_full` |
| `{version}`| Format version                                         | `v1`           |

### Parsing Rules

- If the `reason` string starts with `colink:` → structured reason code, parse and handle by semantics.
- If the `reason` string does NOT start with `colink:` → plain text, display as-is to the user.
- Receivers MUST check the `colink:` prefix before attempting to parse.
- Unrecognized structured codes (valid prefix but unknown domain/code) should be treated as a generic failure.
