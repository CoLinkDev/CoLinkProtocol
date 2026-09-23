# Create Note

## Endpoint

```http
POST /api/v1/notes
```

## Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `noteId` | UUID v4 | Yes | Client-generated; must be unique within the account |
| `title` | string | Yes | May be empty |
| `markdown` | string | Yes | Raw Markdown source |
| `tagIds` | UUID v4[] | Yes | Complete tag set; may be empty |
| `attachmentIds` | UUID v4[] | Yes | Complete attachment set; may be empty. Attachments must already be uploaded and belong to the current account |

```json
{
  "noteId": "0d998630-e4cb-4ef3-8b27-dc451f55b86f",
  "title": "Weekend Plans",
  "markdown": "# Weekend Plans\n\n![Route](colink-attachment://a559d4df-24a8-49ff-8aa5-0fab74be7402)",
  "tagIds": ["c712c0b5-3938-44c3-a3ef-7f09f86745f9"],
  "attachmentIds": ["a559d4df-24a8-49ff-8aa5-0fab74be7402"]
}
```

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
    "revision": 1,
    "createdAt": "2026-09-10T05:00:00Z",
    "updatedAt": "2026-09-10T05:00:00Z"
  },
  "message": "ok"
}
```

On success, the server returns the complete [`Note`](README.md#note) with an initial `revision` of 1.

If the same `noteId` already exists, the server returns `4002 invalid parameter`.

When the request outcome is uncertain, the client queries the `noteId` as defined in [Handling Uncertain Request Outcomes](README.md#handling-uncertain-request-outcomes) and MUST NOT retry creation with a new ID.

## Errors

| Code | Message | HTTP Status | Description |
|------|---------|-------------|-------------|
| 4001 | invalid request body | 400 | JSON parse error or missing required fields |
| 4002 | invalid parameter | 400 | `noteId` is not a valid UUID v4, already exists, or `title` contains control characters |
| 6007 | note storage limit reached | 413 | `markdown` byte length exceeds `maxMarkdownBytes` or the account's Notes storage quota is reached |
| 6008 | invalid note reference | 409 | `tagIds` or `attachmentIds` contains an invalid, deleted, or unowned resource |

See [Error Codes](../../error-codes.md#notes-6xxx).
