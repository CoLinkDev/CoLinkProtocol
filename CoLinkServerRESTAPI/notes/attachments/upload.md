# Upload Note Attachment

Stages an image or another attachment. The attachment is associated through `attachmentIds` when a note is later created or updated and can be reused by multiple notes in the current account.

## Endpoint

```http
POST /api/v1/note-attachments
Content-Type: multipart/form-data
```

## Request

In addition to the common request headers, the request contains the following multipart parts:

| Part | Type | Required | Description |
|------|------|----------|-------------|
| `attachmentId` | UUID v4 | Yes | Client-generated; supports offline upload queues |
| `kind` | string | Yes | `image` or `file` |
| `sha256` | string | Yes | Client-computed lowercase hexadecimal SHA-256 digest |
| `file` | binary | Yes | Raw file; the file name and MIME type come from this part. The file name must be valid UTF-8 and contain no control characters |

The server MUST stream the file while calculating its size and SHA-256 digest. If the file exceeds the server's current maximum attachment size or the account has insufficient remaining capacity, the server returns `6007 note storage limit reached`. A digest mismatch returns `6010 attachment checksum mismatch`. A failed request MUST NOT leave an incomplete file behind.

## Response

The `data` in a successful response is a complete [`Attachment`](README.md#attachment). The file in the following example is the 5-byte UTF-8 text `hello` with no trailing newline:

```json
{
  "code": 0,
  "data": {
    "attachmentId": "a559d4df-24a8-49ff-8aa5-0fab74be7402",
    "kind": "file",
    "fileName": "hello.txt",
    "mediaType": "text/plain",
    "size": 5,
    "sha256": "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    "createdAt": "2026-09-12T05:00:00Z"
  },
  "message": "ok"
}
```

If the `attachmentId` already exists or was previously used in the same account, the server returns `4002 invalid parameter`. When the upload outcome is uncertain, the client MUST first query the attachment metadata. If `kind`, `size`, and `sha256` all match the file being uploaded, the upload is considered successful. The client retries the upload only if the attachment does not exist. A field mismatch is treated as an ID conflict, and the existing attachment MUST NOT be overwritten.
