# Get Notes Storage Usage

Returns Notes storage usage, remaining capacity, and per-item protocol limits for the current account. Clients SHOULD call this endpoint before displaying storage management or preparing to upload a large attachment.

## Endpoint

```http
GET /api/v1/notes/storage
```

## Request

There are no request parameters. Only the common `Authorization` header is required.

## Response

```json
{
  "code": 0,
  "data": {
    "usedBytes": 125829120,
    "limitBytes": 1073741824,
    "remainingBytes": 947912704,
    "attachmentBytes": 123731968,
    "markdownBytes": 2097152,
    "maxAttachmentBytes": 104857600,
    "maxMarkdownBytes": 2097152
  },
  "message": "ok"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `usedBytes` | integer | Total bytes used against the quota |
| `limitBytes` | integer | Total Notes capacity for the account |
| `remainingBytes` | integer | `max(limitBytes - usedBytes, 0)` |
| `attachmentBytes` | integer | Bytes used by all attachments, including unassociated attachments still within their retention period |
| `markdownBytes` | integer | UTF-8 byte length of Markdown across all active notes |
| `maxAttachmentBytes` | integer | Maximum permitted size of one attachment in bytes |
| `maxMarkdownBytes` | integer | Maximum permitted UTF-8 byte length of one note's Markdown |

`usedBytes` MUST equal `attachmentBytes + markdownBytes`. Database indexes, tags, titles, and internal metadata do not count toward the user-visible quota. The server MUST use the same calculation as this endpoint when enforcing capacity limits on writes.
