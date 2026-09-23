# Get Note Attachment Metadata

Returns an attachment's name, type, size, and digest without returning its file content.

## Endpoint

```http
GET /api/v1/note-attachments/:attachmentId
```

## Request

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `attachmentId` | path | UUID v4 | Yes | Attachment ID |

## Response

```json
{
  "code": 0,
  "data": {
    "attachmentId": "a559d4df-24a8-49ff-8aa5-0fab74be7402",
    "kind": "file",
    "fileName": "hello.txt",
    "mediaType": "text/plain",
    "size": 5,
    "sha256": "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    "createdAt": "2026-09-12T05:00:00Z"
  },
  "message": "ok"
}
```

The `data` in a successful response is a complete [`Attachment`](README.md#attachment).

## Errors

| Code | Message | HTTP Status | Description |
|------|---------|-------------|-------------|
| 4002 | invalid parameter | 400 | `attachmentId` is not a valid UUID v4 |
| 6005 | attachment not found | 404 | Attachment does not exist, has been deleted, or does not belong to the current account |

See [Error Codes](../../error-codes.md#notes-6xxx).
