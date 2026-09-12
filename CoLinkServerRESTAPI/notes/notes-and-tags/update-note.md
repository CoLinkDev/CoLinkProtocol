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

This is a complete replacement operation; the server does not perform field-level merging. The server MUST use `noteId + userId + baseRevision` for a conditional update and write `revision + 1` only when the revision matches. A revision mismatch returns `6002 revision conflict` with `null` response `data`; the client then retrieves the current note and performs a three-way merge. A missing or unparseable `baseRevision` returns `4002 invalid parameter`.

## Response

On success, the server returns the complete updated [`Note`](README.md#note).
