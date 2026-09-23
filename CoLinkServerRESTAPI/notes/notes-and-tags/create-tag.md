# Create Tag

## Endpoint

```http
POST /api/v1/note-tags
```

## Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tagId` | UUID v4 | Yes | Client-generated; supports offline creation |
| `name` | string | Yes | Must not be empty after trimming leading and trailing whitespace |

```json
{
  "tagId": "c712c0b5-3938-44c3-a3ef-7f09f86745f9",
  "name": "Work"
}
```

## Response

```json
{
  "code": 0,
  "data": {
    "tagId": "c712c0b5-3938-44c3-a3ef-7f09f86745f9",
    "name": "Work",
    "revision": 1,
    "createdAt": "2026-09-10T05:00:00Z",
    "updatedAt": "2026-09-10T05:00:00Z"
  },
  "message": "ok"
}
```

On success, the server returns the complete [`Tag`](README.md#tag) with an initial `revision` of 1. A duplicate active tag name returns `6004 tag name conflict`.

If the same `tagId` already exists, the server returns `4002 invalid parameter`.

If two offline devices create tags with different `tagId` values but the same normalized name, the later submission receives `6004 tag name conflict`. That client MUST find the existing tag in the tag list, change pending local note references to the existing `tagId`, and discard the duplicate local tag. When the request outcome is uncertain, the client queries the tag list as defined in [Handling Uncertain Request Outcomes](README.md#handling-uncertain-request-outcomes).

## Errors

| Code | Message | HTTP Status | Description |
|------|---------|-------------|-------------|
| 4001 | invalid request body | 400 | JSON parse error or missing required fields |
| 4002 | invalid parameter | 400 | `tagId` is not a valid UUID v4, already exists, or `name` is empty after trimming or contains control characters |
| 6004 | tag name conflict | 409 | An active tag with the same normalized name already exists in the account |
| 6007 | note storage limit reached | 413 | The submitted tag name exceeds the server's configured maximum length |

See [Error Codes](../../error-codes.md#notes-6xxx).
