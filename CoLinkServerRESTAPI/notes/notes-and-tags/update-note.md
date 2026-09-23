# Update Note

## Endpoint

```http
PUT /api/v1/notes/:noteId
```

## Request

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `noteId` | path | UUID v4 | Yes | ID of the note to update |

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `baseRevision` | integer | Yes | Note revision on which this edit is based |
| `title` | string | Yes | Complete new title |
| `markdown` | string | Yes | Complete new Markdown source |
| `tagIds` | UUID v4[] | Yes | Complete new tag set |
| `attachmentIds` | UUID v4[] | Yes | Complete new attachment set |

```json
{
  "baseRevision": 6,
  "title": "Weekend Plans Updated",
  "markdown": "# Weekend Plans\n\nUpdated route details...",
  "tagIds": [
    "c712c0b5-3938-44c3-a3ef-7f09f86745f9"
  ],
  "attachmentIds": [
    "a559d4df-24a8-49ff-8aa5-0fab74be7402"
  ]
}
```

This is a complete replacement operation; the server does not perform field-level merging. The server MUST use `noteId + userId + baseRevision` for a conditional update and write `revision + 1` only when the revision matches. A revision mismatch returns `6002 revision conflict` with `null` response `data`; the client then retrieves the current note and performs a three-way merge.

## Response

```json
{
  "code": 0,
  "data": {
    "noteId": "0d998630-e4cb-4ef3-8b27-dc451f55b86f",
    "title": "Weekend Plans Updated",
    "markdown": "# Weekend Plans\n\nUpdated route details...",
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
    "revision": 7,
    "createdAt": "2026-09-10T05:00:00Z",
    "updatedAt": "2026-09-12T06:00:00Z"
  },
  "message": "ok"
}
```

On success, the server returns the complete updated [`Note`](README.md#note).

## Errors

| Code | Message | HTTP Status | Description |
|------|---------|-------------|-------------|
| 4001 | invalid request body | 400 | JSON parse error or missing required fields |
| 4002 | invalid parameter | 400 | `noteId` is not a valid UUID v4, or `title` contains control characters |
| 6001 | note not found | 404 | Note does not exist, has been deleted, or does not belong to the current account |
| 6002 | revision conflict | 412 | `baseRevision` does not match the current version |
| 6007 | note storage limit reached | 413 | `markdown` byte length exceeds `maxMarkdownBytes` or the account's Notes storage quota is reached |
| 6008 | invalid note reference | 409 | `tagIds` or `attachmentIds` contains an invalid, deleted, or unowned resource |

See [Error Codes](../../error-codes.md#notes-6xxx).
