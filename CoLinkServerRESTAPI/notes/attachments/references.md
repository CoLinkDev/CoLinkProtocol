# List Note Attachment References

Lists all active notes in the current account that reference the specified attachment, so those associations can be removed before deleting a shared attachment.

## Endpoint

```http
GET /api/v1/note-attachments/:attachmentId/references?pageToken=<opaque>&limit=100
```

## Request

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `attachmentId` | path | UUID v4 | Yes | Attachment ID |
| `pageToken` | query | string | No | Opaque pagination token issued by the server; the client MUST return it unchanged |
| `limit` | query | integer | No | `1..500`; defaults to 100 |

## Response

```json
{
  "code": 0,
  "data": {
    "noteIds": [
      "0d998630-e4cb-4ef3-8b27-dc451f55b86f",
      "9ee57936-bf6c-4793-b9d4-870d9100dc1d"
    ],
    "nextPageToken": null
  },
  "message": "ok"
}
```

`noteIds` is stably sorted in lexicographic order. A `null` `nextPageToken` means all references have been returned. If the attachment does not exist, has been deleted, or does not belong to the current account, the server returns `6005 attachment not found`.
