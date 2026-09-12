# Note Images and Attachments Protocol

Images and other attachments use the same resource model. Attachment content is not included in note synchronization responses. Clients download it on demand when the user opens an image or attachment and MAY cache it locally.

## API

| Document | Method and Path | Purpose |
|----------|-----------------|---------|
| [`upload.md`](upload.md) | `POST /api/v1/note-attachments` | Stage an image or other attachment |
| [`get.md`](get.md) | `GET /api/v1/note-attachments/:attachmentId` | Get attachment metadata |
| [`download.md`](download.md) | `GET /api/v1/note-attachments/:attachmentId/content` | Download attachment content |
| [`references.md`](references.md) | `GET /api/v1/note-attachments/:attachmentId/references` | Find notes that reference an attachment |
| [`delete.md`](delete.md) | `DELETE /api/v1/note-attachments/:attachmentId` | Delete an attachment not referenced by any note |

All endpoints follow the authentication, resource limit, and error-code conventions in the [Cloud Notes Protocol](../README.md). A successful content download returns raw binary data. Other successful responses and all error responses use the common Server REST API JSON envelope.

## Attachment

| Field | Type | Description |
|-------|------|-------------|
| `attachmentId` | UUID v4 | Permanent client-generated identifier |
| `kind` | string | `image` or `file` |
| `fileName` | string | Original file name, used only for display |
| `mediaType` | string | MIME type confirmed by the server |
| `size` | integer | File size in bytes |
| `sha256` | string | Lowercase hexadecimal SHA-256 digest of the file content |
| `createdAt` | string | Server-generated ISO 8601 timestamp |

Attachments are immutable account-scoped resources. Associations are determined solely by a note's `attachmentIds`. The same attachment MAY be referenced by multiple notes in the current account, so reusing an image or moving an attachment does not require another upload.

Attachment content and metadata cannot be modified after creation. To replace a file, the client MUST create a new `attachmentId`, then update the relevant notes' `attachmentIds` and Markdown references. Because attachments are immutable, neither `revision` nor `updatedAt` is defined.

## Markdown References

Embedded images and download links in Markdown MUST use stable URIs:

```markdown
![Image description](colink-attachment://a559d4df-24a8-49ff-8aa5-0fab74be7402)

[View attachment](colink-attachment://95b91af8-f6f9-441e-ac36-c54cd01aec31)
```

The client renderer resolves each URI to either a local cache entry or an authenticated download request. Bearer tokens MUST NOT be written into Markdown.

The only valid URI form is `colink-attachment://<attachmentId>`, where `attachmentId` is a lowercase hyphenated UUID v4. The URI MUST NOT contain a username, port, additional path, query, or fragment. Receivers MUST reject attachment URIs that do not match this form:

```text
colink-attachment://xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
```

Here, `x` is a lowercase hexadecimal character and `y` is `8`, `9`, `a`, or `b`.

`attachmentIds` is the authoritative set of attachment associations. Every `colink-attachment` URI in the Markdown MUST also appear in that note's `attachmentIds`. IDs not referenced in the Markdown are displayed as ordinary attachments.

## Lifecycle

Uploading an attachment is a staging operation. It does not increment a note's `revision` or generate a synchronization event. The client MUST upload attachments first, then formally associate them through `attachmentIds` when creating or updating a note. If association fails or a note conflict occurs, uploaded attachments remain staged and can be reused for a retry.

The server MUST retain attachments not referenced by any active note for at least 7 days and MAY automatically remove them afterward. An attachment still referenced by at least one note MUST NOT be removed automatically. After a note is deleted, only attachments no longer referenced by any other note enter the unassociated-attachment retention period.

Whether an attachment is explicitly deleted by a client or automatically removed by the server, its `attachmentId` MUST remain permanently reserved as a tombstone within the current account until the account is deleted. Later uploads MUST NOT reuse the ID. Metadata and content queries continue to return `6005 attachment not found`. This rule prevents client caches from mistaking new content for a deleted attachment. Tombstones do not count toward the user's storage quota.

## Offline Upload Sequence

1. The client generates an `attachmentId` locally, and the Markdown immediately references `colink-attachment://<attachmentId>`.
2. After reconnecting, the client uploads all new attachments.
3. After all attachment uploads succeed, the client creates or updates the note.
4. If the note write encounters a revision conflict, the client retains the uploaded attachments and retries after merging.
