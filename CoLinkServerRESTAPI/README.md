# Server Protocol

## Modules

| Module | Description |
|--------|-------------|
| [`auth`](auth/) | Account authentication and session management |
| [`devices`](devices/) | Account device registration and management |
| [`notes`](notes/) | Account-scoped Markdown notes, tags, attachments, and offline synchronization |
| [`push`](push/) | HTTP push notification delivery |
| [`update`](update/) | Application update metadata and downloads |
| [`websocket`](websocket/) | Cloud WebSocket tickets, presence, relay, and server-originated events |

## HTTP APIs Common Conventions

- Prefixed with `/api`
- Authentication via `Authorization: Bearer <token>` header
- Authenticated endpoints MUST reject an otherwise valid access token when its account is disabled, using `1030 unauthorized`.
- HTTP REST JSON timestamps: ISO 8601 UTC strings in RFC 3339 format (for example, `2026-09-12T05:00:00Z`)
- Cloud WebSocket envelope timestamps: Unix milliseconds, as defined by the Cloud WebSocket protocol
- IDs: UUID v4
- Response envelope: `{ "code": 0, "data": {...}, "message": "ok" }`
- Error envelope: `{ "code": <errorCode>, "data": null, "message": "description" }`

Response body of `/api/push` uses the Bark-compatible format documented in [`push/README.md`](push/README.md) instead of the common response envelope.

Successful attachment content downloads from `GET /api/v1/note-attachments/:attachmentId/content` return the raw binary response defined in [`notes/attachments/download.md`](notes/attachments/download.md), while their errors continue to use the common error envelope.

### Error Codes

See [`error-codes.md`](error-codes.md) for the complete error code registry, including range allocation, global codes, and all module-specific codes.
