# Delete Tag

## Endpoint

```http
DELETE /api/v1/note-tags/:tagId?baseRevision=<revision>
```

## Request

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `tagId` | path | UUID v4 | Yes | Tag ID |
| `baseRevision` | query | integer | Yes | Tag revision on which the deletion is based |

Deleting a tag MUST perform the following operations in one transaction: lock the tag and every associated note, soft-delete the tag, remove its `tagId` from the associated notes, increment each affected note's `revision`, and write a separate incremental change event for the tag and every affected note. This ensures that whenever `tagIds` changes in a note response, that note's `revision` also changes.

Tag deletion and note updates MUST be ordered through database row locks or an equivalent serialization mechanism. When row locks are used, all relevant write transactions MUST first lock tags in ascending `tagId` order and then notes in ascending `noteId` order; they MUST NOT use the reverse order. After deletion commits, any note write that still includes the deleted tag MUST return `6008 invalid note reference`. See [Recovering from Invalid References](README.md#recovering-from-invalid-references) for the client recovery flow.

## Response

```json
{
  "code": 0,
  "data": {
    "tagId": "c712c0b5-3938-44c3-a3ef-7f09f86745f9",
    "revision": 3,
    "deletedAt": "2026-09-12T06:00:00Z"
  },
  "message": "ok"
}
```
