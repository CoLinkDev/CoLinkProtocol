# CoLink URL Scheme

The `colink://` URL scheme enables external applications, web browsers, and system components to trigger actions within CoLink applications. All URLs share the same scheme and follow a versioned path structure for forward compatibility.

## Scheme Format

```
colink://<authority>/<version>?<query>
```

| Component | Description |
|-----------|-------------|
| `colink` | The registered URL scheme for all CoLink deeplinks. |
| `<authority>` | The action category (e.g., `pair` for pairing). |
| `<version>` | Format version (e.g., `v1`, `v2`). Allows independent evolution of each action. |
| `<query>` | Query parameters carrying the action payload. |

## Supported Actions

| Action | Document | Description |
|--------|----------|-------------|
| Pairing | [pair.md](pair.md) | Authorize a first-time pairing with a receiver device. |

## General Rules

- Parsers MUST reject URLs with an unsupported scheme, authority, or version.
- Parsers MUST treat the scheme comparison as case-insensitive (`COLINK://` equals `colink://`), but authority and path segments are case-sensitive.
- Implementations MUST ignore unknown query parameters within a supported version for forward compatibility.
- When generating URLs for display as QR codes or text, implementations SHOULD use the latest recommended version unless compatibility with older clients is required.
