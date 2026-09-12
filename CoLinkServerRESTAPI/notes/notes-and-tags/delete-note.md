# Delete Note

## Endpoint

```http
DELETE /api/v1/notes/:noteId?baseRevision=<revision>
```

## Request

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `noteId` | path | UUID v4 | Yes | Note ID |
| `baseRevision` | query | integer | Yes | Note revision on which the deletion is based |

Deletion is a soft delete for synchronization purposes and MUST generate a deletion event with `revision + 1`. The server may remove the note body and unreferenced attachments after the change-log retention period.

## Response

```json
{
  "code": 0,
  "data": {
    "noteId": "0d998630-e4cb-4ef3-8b27-dc451f55b86f",
    "revision": 7,
    "deletedAt": "2026-09-12T06:00:00Z"
  },
  "message": "ok"
}
```
