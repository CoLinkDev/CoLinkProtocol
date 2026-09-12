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

The `data` in a successful response is a complete [`Attachment`](README.md#attachment). If the attachment does not exist or does not belong to the current account, the server returns `6005 attachment not found`.
