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

## Response

On success, the server returns the complete [`Tag`](README.md#tag) with an initial `revision` of 1. A duplicate tag name returns `6004 tag name conflict`.
