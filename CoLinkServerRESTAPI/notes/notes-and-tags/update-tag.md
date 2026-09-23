# Update Tag

## Endpoint

```http
PUT /api/v1/note-tags/:tagId
```

## Request

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `tagId` | path | UUID v4 | Yes | ID of the tag to rename |

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `baseRevision` | integer | Yes | Tag revision on which this rename is based |
| `name` | string | Yes | Complete new name; must not be empty after trimming leading and trailing whitespace |

```json
{
  "baseRevision": 2,
  "name": "Work Projects"
}
```

## Response

```json
{
  "code": 0,
  "data": {
    "tagId": "c712c0b5-3938-44c3-a3ef-7f09f86745f9",
    "name": "Work Projects",
    "revision": 3,
    "createdAt": "2026-09-10T05:00:00Z",
    "updatedAt": "2026-09-12T06:00:00Z"
  },
  "message": "ok"
}
```

A revision mismatch returns `6002 revision conflict`. On success, the server returns the complete [`Tag`](README.md#tag) with `revision + 1`. Renaming a tag to a name that conflicts with an existing active tag in the account returns `6004 tag name conflict`.

## Errors

| Code | Message | HTTP Status | Description |
|------|---------|-------------|-------------|
| 4001 | invalid request body | 400 | JSON parse error or missing required fields |
| 4002 | invalid parameter | 400 | `tagId` is not a valid UUID v4, or `name` is empty after trimming or contains control characters |
| 6002 | revision conflict | 412 | `baseRevision` does not match the current version |
| 6003 | tag not found | 404 | Tag does not exist, has been deleted, or does not belong to the current account |
| 6004 | tag name conflict | 409 | An active tag with the same normalized name already exists in the account |
| 6007 | note storage limit reached | 413 | The submitted tag name exceeds the server's configured maximum length |

See [Error Codes](../../error-codes.md#notes-6xxx).
