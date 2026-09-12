# Notes and Tags Protocol

## API

| Document | Method and Path | Purpose |
|----------|-----------------|---------|
| [`list-notes.md`](list-notes.md) | `GET /api/v1/notes` | List notes with pagination and optional tag filtering |
| [`get-note.md`](get-note.md) | `GET /api/v1/notes/:noteId` | Get one complete note |
| [`create-note.md`](create-note.md) | `POST /api/v1/notes` | Create a note |
| [`update-note.md`](update-note.md) | `PUT /api/v1/notes/:noteId` | Update a complete note |
| [`delete-note.md`](delete-note.md) | `DELETE /api/v1/notes/:noteId` | Delete a note |
| [`list-tags.md`](list-tags.md) | `GET /api/v1/note-tags` | List tags |
| [`create-tag.md`](create-tag.md) | `POST /api/v1/note-tags` | Create a tag |
| [`update-tag.md`](update-tag.md) | `PUT /api/v1/note-tags/:tagId` | Rename a tag |
| [`delete-tag.md`](delete-tag.md) | `DELETE /api/v1/note-tags/:tagId` | Delete a tag |
| [Full Snapshot](#full-snapshot) | `GET /api/v1/notes/sync/snapshot` | Get a synchronization snapshot |
| [Incremental Changes](#incremental-changes) | `GET /api/v1/notes/sync/changes` | Fetch changes after a snapshot |

All endpoints follow the authentication, capacity, pagination, and error-code conventions in the [Cloud Notes Protocol](../README.md).

## Data Model

### Note

| Field | Type | Description |
|-------|------|-------------|
| `noteId` | UUID v4 | Permanent client-generated identifier; supports offline creation |
| `title` | string | Title; may be empty |
| `markdown` | string | Raw Markdown source |
| `tagIds` | UUID v4[] | Set of associated tag IDs; order has no meaning and duplicates are not allowed |
| `attachments` | Attachment[] | Metadata for associated attachments; does not include file content |
| `revision` | integer | Server-assigned, monotonically increasing revision for one note, starting at 1 |
| `createdAt` | string | Server-generated ISO 8601 timestamp |
| `updatedAt` | string | Server-generated ISO 8601 timestamp |

Client timestamps MUST NOT participate in conflict resolution. The `revision` MUST increase whenever a note's title, Markdown, tag set, or attachment set changes. Renaming a tag does not change the `tagIds` stored by notes and therefore does not change the `revision` of all related notes. Deleting a tag removes associations as defined in [Delete Tag](delete-tag.md).

### NoteSummary

`GET /api/v1/notes` returns `NoteSummary` objects for list presentation. They do not include Markdown or attachment details.

| Field | Type | Description |
|-------|------|-------------|
| `noteId` | UUID v4 | Note ID |
| `title` | string | Title; may be empty |
| `tagIds` | UUID v4[] | Set of currently active tag IDs |
| `attachmentCount` | integer | Number of currently associated attachments |
| `revision` | integer | Current note revision |
| `createdAt` | string | Server-generated ISO 8601 timestamp |
| `updatedAt` | string | Server-generated ISO 8601 timestamp |

### Tag

| Field | Type | Description |
|-------|------|-------------|
| `tagId` | UUID v4 | Permanent client-generated identifier |
| `name` | string | Tag display name |
| `revision` | integer | Server-assigned, monotonically increasing revision for one tag, starting at 1 |
| `createdAt` | string | Server-generated ISO 8601 timestamp |
| `updatedAt` | string | Server-generated ISO 8601 timestamp |

Tag names MUST be unique within an account after Unicode NFC normalization and Unicode default case folding. The server stores and returns the display form submitted by the user.

## Synchronization Protocol

### Design Principles

- The local database is an offline working copy; the cloud is the synchronization source through which devices in an account exchange revisions.
- Each note and tag uses an independent `revision` for optimistic concurrency control. Client timestamps do not determine overwrite order.
- Every resource change is also written to an account-level change log, which clients fetch in order using an opaque `cursor`.
- Image and attachment content is downloaded on demand; synchronization transfers only attachment metadata.

At minimum, the client stores `baseRevision`, the current local content, the content from the most recent successful synchronization, and `syncState` locally. Recommended `syncState` values are `synced`, `pending`, and `conflict`.

### Pagination Tokens and Synchronization Cursors

`pageToken` and `cursor` serve different purposes and MUST NOT be used interchangeably:

| Name | Lifetime | Purpose |
|------|----------|---------|
| `pageToken` | Short-lived; only for the current full snapshot | Continue reading the next page of the same fixed snapshot; discard after the snapshot is complete |
| `cursor` | Long-lived; persisted locally | Record the position applied from the account change log; use for subsequent incremental synchronization |

A `null` `nextPageToken` indicates that the snapshot has been read completely. The incremental endpoint's `hasMore` explicitly indicates whether the client should immediately continue fetching with `nextCursor`. The names differ to distinguish temporary pagination state from persistent synchronization progress.

### Full Snapshot

Perform a full snapshot when synchronization is first enabled, the account changes, or an incremental cursor expires:

```http
GET /api/v1/notes/sync/snapshot?pageToken=<opaque>&limit=100
```

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `pageToken` | query | string | No | Omit from the first request; return unchanged for subsequent pages |
| `limit` | query | integer | No | Resources per page, `1..500`; defaults to 100 |

```json
{
  "code": 0,
  "data": {
    "notes": [],
    "tags": [],
    "nextPageToken": "opaque-or-null",
    "cursor": "opaque-snapshot-cursor"
  },
  "message": "ok"
}
```

`notes` contains complete Markdown and attachment metadata; `tags` contains complete tags. Both resource types share the `limit`, and the server may return an empty array for either type on any page.

On the first request, the server MUST fix the account change sequence number for the snapshot and keep the `cursor` unchanged throughout the same pagination chain. Each resource row records its most recent change sequence number. Snapshot pagination returns only current resources whose most recent change sequence number is no greater than the snapshot sequence number. A resource modified again during pagination and thereby moved outside the snapshot MUST be returned through incremental changes after that `cursor`, preventing synchronization gaps. The client MUST save the `cursor` only after `nextPageToken` is `null` and every page has been persisted successfully, then immediately fetch incremental changes after that cursor.

The full snapshot contains only currently active resources and no deletion records. It is authoritative for local resources with no pending local changes: such local resources absent from the server snapshot should be deleted. Resources with pending local changes must be retained and enter conflict checking.

### Incremental Changes

```http
GET /api/v1/notes/sync/changes?cursor=<opaque>&limit=100
```

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `cursor` | query | string | Yes | Cursor returned by the previous full snapshot or incremental response |
| `limit` | query | integer | No | `1..500`; defaults to 100 |

```json
{
  "code": 0,
  "data": {
    "changes": [
      {
        "type": "note",
        "operation": "upsert",
        "note": {
          "noteId": "0d998630-e4cb-4ef3-8b27-dc451f55b86f",
          "title": "Weekend Plans",
          "markdown": "# Weekend Plans",
          "tagIds": [],
          "attachments": [],
          "revision": 6,
          "createdAt": "2026-09-10T05:00:00Z",
          "updatedAt": "2026-09-12T05:00:00Z"
        }
      },
      {
        "type": "tag",
        "operation": "delete",
        "tagId": "c712c0b5-3938-44c3-a3ef-7f09f86745f9",
        "revision": 3
      }
    ],
    "nextCursor": "opaque-next-cursor",
    "hasMore": false
  },
  "message": "ok"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `note` or `tag` |
| `operation` | string | `upsert` or `delete` |
| `note` / `tag` | object | Present for `upsert`; contains the complete current resource at query time |
| `noteId` / `tagId` | UUID v4 | Present for `delete` |
| `revision` | integer | New resource revision produced by `delete` |
| `nextCursor` | string | New cursor covering every event on this page; MUST be saved even when `changes` is empty |
| `hasMore` | boolean | Whether immediately subsequent changes remain |

Changes are returned in strictly increasing account change sequence order. The server MAY coalesce consecutive changes to the same resource. An `upsert` returns the current resource at query time, so its `revision` may be higher than the revision that triggered the change entry. The client MUST apply each page in order and atomically save `nextCursor`, then continue fetching when `hasMore=true`. A revision that has already been applied MUST be ignored safely if received again.

The server may compact old change-log entries. When a cursor has expired, the server returns `6009 sync cursor expired`; the client retains pending local changes and performs another full snapshot.

### Writes and Conflicts

The client uses `baseRevision` locally to record the revision on which an edit is based. Update requests send this value in the JSON request body; delete requests send it as a query parameter. The server permits the write only when its current `revision` matches; otherwise, it returns HTTP `412 Precondition Failed` with `6002 revision conflict` and MUST NOT apply last-writer-wins behavior.

When a note conflicts, the client performs a three-way merge using these three versions:

| Version | Source |
|---------|--------|
| Common ancestor | Complete note saved after the most recent successful synchronization |
| Local version | Complete note currently edited offline or not yet uploaded |
| Cloud version | Complete current note returned by `GET /api/v1/notes/:noteId` |

Markdown uses a textual three-way merge. The title, `tagIds`, and `attachmentIds` are each merged relative to the common ancestor. Attachment content is immutable, so merging operates only on attachment ID sets. When an unambiguous merge is possible, the client submits again using the cloud's current `revision` as the new `baseRevision`. If both sides changed the same field to different values or the body has overlapping text conflicts, the client MUST retain both the local and cloud content and let the user choose the local version, choose the cloud version, edit the merged result, or save it as a new note. The client MUST NOT silently discard either version.

If the cloud note has been deleted while local edits are still pending, the client MUST retain the local content and prompt the user either to discard the local changes or save them as a new note with a new `noteId`. The client MUST NOT implicitly restore a deleted note using the old `noteId`. A delete request encountering a newer cloud revision likewise returns a revision conflict; deletion can proceed only after user confirmation based on the latest revision.

The title, Markdown, tag set, and attachment set form one atomic note update. Tag rename conflicts are resolved using the tag's `revision` and do not involve a Markdown three-way merge.

### Recovering from Invalid References

When a note write returns `6008 invalid note reference`, a tag or attachment in the request has been deleted, belongs to another account, or is unavailable. The client MUST:

1. Fetch incremental changes and retrieve the current active tags and relevant attachment metadata again.
2. Remove deleted tags from the pending note. If an attachment is missing but its local file still exists, upload it again with a new `attachmentId`. If the local file is also missing, remove the corresponding Markdown reference and `attachmentIds` entry and notify the user.
3. If the cloud note's `revision` changed during synchronization, perform the normal three-way merge first.
4. Submit again using the `baseRevision` for the latest revision. Do not repeatedly submit the same invalid reference.

### Recommended Synchronization Times

Clients SHOULD fetch incremental changes:

- after application startup and authentication restoration;
- after the cloud connection is restored;
- when the user explicitly refreshes;
- periodically at a reasonable interval while the application remains running.

Local edits MUST be persisted locally before entering the upload queue. Before sending a write request, the client MUST save the resource ID, `baseRevision`, and complete content to be written. It may remove the local task only after confirming the server state.

### Handling Uncertain Request Outcomes

When a request times out or the connection is interrupted, the client MUST NOT immediately assume the write failed or generate a new resource ID. The client first queries the current server state, then follows these rules:

| Operation | Query Result | Handling |
|-----------|--------------|----------|
| Create note | `noteId` does not exist | Retry creation with the original `noteId` |
| Create note | `noteId` exists | Retrieve the current note; treat identical content as success, otherwise enter conflict handling |
| Create tag | `tagId` does not exist | Retry creation with the original `tagId` |
| Create tag | `tagId` exists | Treat an identical name as success; treat a different name as an ID conflict. Use the existing tag merge rules for duplicate names |
| Upload attachment | `attachmentId` does not exist | Retry the upload with the original `attachmentId` |
| Upload attachment | `attachmentId` exists | Treat matching `kind`, `size`, and `sha256` as success; otherwise treat it as an ID conflict |
| Update note or tag | Current `revision` equals `baseRevision` | The original write did not take effect; retry with the original content and `baseRevision` |
| Update note or tag | Current content equals the content intended for the write | Treat the original write as successful and save the server's current `revision` |
| Update note or tag | `revision` increased and content differs | Use normal revision conflict handling |
| Delete note or tag | Resource no longer exists | Treat deletion as successful |
| Delete note or tag | Current `revision` equals `baseRevision` | Retry deletion with the original `baseRevision` |
| Delete note or tag | Current `revision` increased | Enter deletion conflict handling; do not delete the new revision directly |

Content comparison covers only client-writable fields and excludes server-generated fields such as `createdAt` and `updatedAt`.
