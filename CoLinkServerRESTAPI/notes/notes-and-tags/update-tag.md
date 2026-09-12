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

## Response

A revision mismatch returns `6002 revision conflict`. On success, the server returns the complete [`Tag`](README.md#tag) with `revision + 1`.

If two offline devices create tags with different `tagId` values but the same normalized name, the later submission receives `6004 tag name conflict`. That client MUST find the existing tag in the tag list, change pending local note references to the existing `tagId`, and discard the duplicate local tag.
