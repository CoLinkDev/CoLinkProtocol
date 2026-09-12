# Download Note Attachment

Downloads an attachment's raw binary content on demand, with support for local caching and resumable downloads.

## Endpoint

```http
GET /api/v1/note-attachments/:attachmentId/content
```

## Request

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `attachmentId` | path | UUID v4 | Yes | Attachment ID |
| `Range` | header | string | No | Single byte range, for example `bytes=0-1048575` |
| `If-None-Match` | header | string | No | `ETag` of the locally cached attachment |

## Response

On success, the server returns the raw binary content directly without a JSON response envelope. The server MUST set:

| Header | Description |
|--------|-------------|
| `Content-Type` | `Attachment.mediaType` |
| `Content-Length` | Number of bytes in this response body; the range length for a range response |
| `ETag` | The `sha256` enclosed in double quotes |
| `Content-Disposition` | Safely encoded `fileName` |
| `Accept-Ranges` | `bytes` |

The server MUST support single-range HTTP Range requests and `If-None-Match`. A complete response returns HTTP `200`; a successful range response returns HTTP `206` and sets `Content-Range`; a still-valid cache returns HTTP `304`; and an invalid or multi-range request returns HTTP `416`.

If the attachment does not exist or does not belong to the current account, the server returns `6005 attachment not found` in the common JSON error envelope.
