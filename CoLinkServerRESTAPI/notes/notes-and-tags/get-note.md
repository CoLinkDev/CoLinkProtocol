# Get Note

## Endpoint

```http
GET /api/v1/notes/:noteId
```

## Request

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `noteId` | path | UUID v4 | Yes | Note ID |

## Response

```json
{
  "code": 0,
  "data": {
    "noteId": "0d998630-e4cb-4ef3-8b27-dc451f55b86f",
    "title": "Weekend Plans",
    "markdown": "# Weekend Plans\n\n![Route](colink-attachment://a559d4df-24a8-49ff-8aa5-0fab74be7402)",
    "tagIds": [
      "c712c0b5-3938-44c3-a3ef-7f09f86745f9"
    ],
    "attachments": [
      {
        "attachmentId": "a559d4df-24a8-49ff-8aa5-0fab74be7402",
        "kind": "image",
        "fileName": "route.png",
        "mediaType": "image/png",
        "size": 123456,
        "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "createdAt": "2026-09-10T05:00:00Z"
      }
    ],
    "revision": 6,
    "createdAt": "2026-09-10T05:00:00Z",
    "updatedAt": "2026-09-12T05:00:00Z"
  },
  "message": "ok"
}
```

The `data` in a successful response is a complete [`Note`](README.md#note).

## Errors

| Code | Message | HTTP Status | Description |
|------|---------|-------------|-------------|
| 4002 | invalid parameter | 400 | `noteId` is not a valid UUID v4 |
| 6001 | note not found | 404 | Note does not exist, has been deleted, or does not belong to the current account |

See [Error Codes](../../error-codes.md#notes-6xxx).
