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

Code `0` = success. Positive codes are allocated to global categories or modules by the table below. Negative codes are global catch-all errors.

Positive error-code ranges are allocated as follows:

| Range | Allocation |
|-------|------------|
| `1xxx` | Authentication module |
| `2xxx` | Device module |
| `3xxx` | Reserved for global rate, quota, and request-policy errors |
| `4xxx` | Reserved for global request parsing and parameter-validation errors |
| `5xxx` | Notes module |

Future modules MUST use an unallocated range and MUST NOT define module errors in the reserved `3xxx` or `4xxx` ranges.

Global error codes:

| Code | Message              | HTTP Status | Description                                    |
|------|----------------------|-------------|------------------------------------------------|
| -1   | internal error       | 500         | Unhandled error, catch-all fallback            |
| 1030 | unauthorized         | 401         | Missing or invalid access token (middleware)   |
| 3001 | rate limited         | 429         | Too many requests                              |
| 4001 | invalid request body | 400         | JSON parse error or missing required fields    |
| 4002 | invalid parameter    | 400         | Path/query parameter validation failure        |

Notes:
- Code `-1` is returned when no specific error code matches. Never expose internal details (stack trace, SQL) in the message.
- Module-specific errors are documented by each module. The range table above is authoritative for allocating new codes.
