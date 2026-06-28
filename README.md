# CoLink Protocol Documentation

## Organization

- [`CoLinkServerRESTAPI`](CoLinkServerRESTAPI/) — HTTP and WebSocket protocols between devices and the cloud server.
- [`CoLinkP2P`](CoLinkP2P/) — Device-to-device discovery, authentication, pairing, connection and transport protocols.
- [`CoLinkBusiness`](CoLinkBusiness/) — Transport-agnostic application-level messages.
- Normative requirements in protocol directories take precedence over `ImplementGuide`. If the two conflict, the implementation guide should be corrected — guides MUST NOT override protocol text.
- This repository is the sole source of protocol definitions. Implementations MUST strictly align with published protocol documents and MUST NOT define or modify protocol semantics through implementation code.

## Conventions

The key words "MUST", "MUST NOT", "SHOULD", "SHOULD NOT", "MAY" in all documents within this repository are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

## Device Identity & Cryptography

Each device generates a local identity on first launch. A device identity consists of:

| Component | Source | Mutability |
|-----------|--------|-----------|
| Device ID | Random UUID v4 | Immutable |
| Display name | System hostname or device model | Mutable (user can rename) |
| Platform type | OS detection (`windows`, `macos`, `linux`, `android`, `ios`) | Immutable |
| Ed25519 key pair | Cryptographic generation | Mutable (explicit key rotation only) |

### Cryptography Change Rules

- Signature inputs MUST precisely define field order, character encoding, binary encoding, domain separation strings, and canonicalization rules.
- Nonce, IV, random values, and keys MUST specify length, generation method, uniqueness requirements, and lifecycle.
- Any change that alters signature results, pairing codes, key derivation, encrypted frame format, or authentication semantics MUST undergo protocol version and bidirectional compatibility assessment.
- Example keys and signatures are for format illustration only — they MUST NOT imply use of fixed keys, fixed nonces, or predictable randomness.

## Design Principles

- Server protocol: HTTP REST + WebSocket, handles account system and message relay
- P2P protocol: peer discovery + WebSocket direct connection, handles device pairing
- Business protocol: unified message format, transport-agnostic (works over both server relay and P2P direct connections)

## Versioning

There are two independent version axes. They are bumped separately and serve different purposes:

| Version | Where declared | Exchanged when | Governs |
|---------|---------------|----------------|---------|
| **P2P Protocol Version** | `CoLinkP2P/websocket/README.md` top | `protocol.hello` → `protocolVersion` | Transport-layer handshake: message envelope format, auth/pairing flow, cipher negotiation, key exchange method |
| **Business Protocol Version** | `CoLinkBusiness/README.md` top | `business.v1.version` → `businessVersion` | Application-layer messages: text, clipboard, file transfer, music sync, system info |

The `vx` in message type names (e.g. `business.v1.version`, `auth.v1.challenge`) is a message schema major version. It is part of the message type string, but it is not the same thing as the advertised P2P or Business semver. Each document defines which advertised version governs a message. For example, `business.v1.key-exchange` is part of the P2P encrypted-session setup and is governed by the P2P Protocol Version.

P2P and Business each follow their own semantic versioning rules declared in their respective READMEs. Modifying one protocol MUST NOT automatically bump the other.

## Compatibility Rules

- Adding backward-compatible capabilities bumps the minor version. Clarifications with no wire-level impact use a patch version. Breaking changes MUST bump the major version. If a change cannot satisfy both forward and backward compatibility, a new protocol version MUST be released.
- Within the same minor version: existing field semantics, data types, required status, default behavior, and lifecycle semantics MUST NOT change. New fields MUST be optional with well-defined fallback handling when absent. Existing fields, message types, or behaviors MUST NOT be removed directly; deprecated items MUST retain backward-compatible semantics for older peers.
- Receivers SHOULD only read fields required for current logic and MUST ignore unknown fields — messages MUST NOT be rejected due to unrecognized fields. When adding new enum values, message types, or reason codes, fallback behavior for older implementations MUST be defined.
- New capabilities (minor version bumps) MUST document the minimum peer version required. Within the same major version, the higher-version peer MUST detect the peer's advertised version during handshake and gracefully degrade when the peer does not meet the minimum — the protocol document MUST specify the exact degradation path (which phase to skip, which derivation to use, etc.). Documents MUST NOT describe only the ideal flow between peers at the same new version.
- When bumping a protocol version, the corresponding README's `Current Protocol Version`, version negotiation rules, flow diagrams, field tables, examples, and cross-references MUST be updated accordingly. Version files in implementation repositories only record which published protocol version the implementation currently aligns with.

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
