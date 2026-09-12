# Delete Unassociated Note Attachment

Deletes an attachment that has never been associated or has been disassociated from all notes.

## Endpoint

```http
DELETE /api/v1/note-attachments/:attachmentId
```

## Request

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `attachmentId` | path | UUID v4 | Yes | ID of the attachment to delete |

## Response

```json
{
  "code": 0,
  "data": null,
  "message": "ok"
}
```

If the attachment is still referenced by a note, the server returns `6006 attachment in use`. The client can call the [attachment references API](references.md) to obtain the `noteId` values whose associations must be removed. If the attachment does not exist or does not belong to the current account, the server returns `6005 attachment not found`.

The server MUST serialize attachment deletion with updates to note attachment associations and recheck references within the deletion transaction. After deletion commits, any note write that attempts to associate the attachment returns `6008 invalid note reference`.

The correct sequence for removing a note attachment is to update the note's `markdown` and `attachmentIds` first, then delete the attachment after the update succeeds. A client may also omit explicit deletion and allow the server to remove the attachment after the unassociated-attachment retention period.

After successful deletion, the server MUST retain a permanent tombstone for the `attachmentId`. The ID MUST NOT be uploaded or associated again in the same account. See [Attachment Lifecycle](README.md#lifecycle) for the complete rules.
