# CoLink Protocol Documentation

## Organization

```
CoLinkProtocol/
├── CoLinkServerRESTAPI/ — Server protocol (device ↔ cloud server)
├── CoLinkLAN/        — LAN protocol (device ↔ device, local network)
└── CoLinkBusiness/   — Business protocol (application-level messages)
```

## Cryptography

All devices generate an **Ed25519** key pair at initialization time.

## Design Principles

- Server protocol: HTTP REST + WebSocket, handles account system and message relay
- LAN protocol: mDNS discovery + WebSocket direct connection, handles local device pairing
- Business protocol: unified message format, transport-agnostic (works over both server relay and LAN direct)

## Versioning

There are two independent version axes. They are bumped separately and serve different purposes:

| Version | Where declared | Exchanged when | Governs |
|---------|---------------|----------------|---------|
| **LAN Protocol Version** | `CoLinkLAN/websocket.md` top | `protocol.hello` → `protocolVersion` | Transport-layer handshake: message envelope format, auth/pairing flow, cipher negotiation, key exchange method |
| **Business Protocol Version** | `CoLinkBusiness/README.md` top | `business.v1.version` → `businessVersion` | Application-layer messages: text, clipboard, file transfer, music sync |

The `v1` in message type names (e.g. `business.v1.version`, `auth.v1.challenge`) is a message schema major version. It is part of the message type string, but it is not the same thing as the advertised LAN or Business semver. Each document defines which advertised version governs a message. For example, `business.v1.key-exchange` is part of the LAN encrypted-session setup and is governed by the LAN Protocol Version.

**Version compatibility rules** are defined independently by each protocol (see respective documents).

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
