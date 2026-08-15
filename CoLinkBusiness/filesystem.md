# Remote Filesystem Browse

Browse the remote device's filesystem, download remote files, and upload local files to an authorized remote path.

## Message Type

`fs.v1.*`

## Minimum Business Protocol Version

v1.4.0

## Design Overview

- **Request-response model**: the requester sends a query, the host returns the result.
- **Flat listing**: each `fs.v1.list` returns one directory level (non-recursive) with pagination support.
- **File transfer via file.v2**: downloads use `fs.v1.download` to request that the host initiate a standard `file.v2.offer`; uploads use `fs.v1.upload` to reserve a remote destination before the requester initiates a standard `file.v2.offer`.
- **Local access policy**: the protocol does not define filesystem access-control configuration. The host MUST enforce its local read and write policy when serving filesystem requests.

## Message Types

| Type | Direction | Description |
|------|-----------|-------------|
| `fs.v1.roots` | requester → host | Request available root paths (drives / mount points) |
| `fs.v1.roots-result` | host → requester | Return root paths |
| `fs.v1.list` | requester → host | Request directory listing |
| `fs.v1.list-result` | host → requester | Return directory listing |
| `fs.v1.stat` | requester → host | Request metadata for a single path |
| `fs.v1.stat-result` | host → requester | Return path metadata |
| `fs.v1.download` | requester → host | Request file download (triggers file.v2.offer from host) |
| `fs.v1.upload` | requester → host | Request authorization to upload one file to a remote path |
| `fs.v1.upload-ready` | host → requester | Confirm that the remote path is reserved for the requested upload |
| `fs.v1.error` | host → requester | Error response for any fs.v1 request |

## Correlation

All responses and transfer follow-ups use the Business Envelope's `correlationId` to match the originating request. The host MUST set `correlationId` on every `*-result`, `fs.v1.upload-ready`, and `fs.v1.error` message to the `id` of the corresponding request envelope. For an `fs.v1.download` flow, the host's `file.v2.offer` MUST use the originating download request `id` as its `correlationId`. For an `fs.v1.upload` flow, the requester's `file.v2.offer` MUST use the originating upload request `id` as its `correlationId`.

---

## fs.v1.roots

Request the list of filesystem roots available on the host device.

```json
{
  "type": "fs.v1.roots",
  "payload": {}
}
```

No payload fields required.

### fs.v1.roots-result

```json
{
  "type": "fs.v1.roots-result",
  "payload": {
    "roots": [
      { "path": "C:\\", "label": "OS (C:)", "totalBytes": 512110190592, "freeBytes": 128849018880 },
      { "path": "D:\\", "label": "Data (D:)", "totalBytes": 1099511627776, "freeBytes": 549755813888 }
    ]
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| roots | RootEntry[] | Available filesystem roots |

**RootEntry**

| Field | Type | Description |
|-------|------|-------------|
| path | string | Absolute root path (e.g. `"C:\\"`, `"/"`, `"/mnt/data"`) |
| label | string/null | Volume label or friendly name. `null` if unavailable |
| totalBytes | number/null | Total capacity in bytes. `null` if unavailable |
| freeBytes | number/null | Available space in bytes. `null` if unavailable |

### Notes

- On Windows, roots are drive letters (e.g. `C:\`, `D:\`)
- On Unix-like systems, roots SHOULD include at minimum `/` and MAY include other mount points
- Implementations SHOULD exclude virtual/pseudo filesystems (e.g. `/proc`, `/sys`)

---

## fs.v1.list

Request the contents of a directory.

```json
{
  "type": "fs.v1.list",
  "payload": {
    "path": "D:\\Documents",
    "offset": 0,
    "limit": 200
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | Yes | Absolute path of the directory to list |
| offset | number | No | Pagination offset (0-based). Default: 0 |
| limit | number | No | Maximum entries to return. Default: 200. Maximum: 1000 |

### fs.v1.list-result

```json
{
  "type": "fs.v1.list-result",
  "payload": {
    "path": "D:\\Documents",
    "entries": [
      {
        "name": "project",
        "kind": "dir",
        "size": null,
        "modified": 1718400000000,
        "created": 1716000000000,
        "readonly": false,
        "hidden": false
      },
      {
        "name": "report.pdf",
        "kind": "file",
        "size": 1048576,
        "modified": 1718300000000,
        "created": 1716000000000,
        "readonly": false,
        "hidden": false
      }
    ],
    "total": 42,
    "offset": 0,
    "hasMore": false
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| path | string | Echoed request path |
| entries | Entry[] | Directory entries for the requested page |
| total | number | Total number of entries in the directory |
| offset | number | Current pagination offset |
| hasMore | boolean | Whether more entries exist beyond this page |

**Entry**

| Field | Type | Description |
|-------|------|-------------|
| name | string | Entry name (filename or directory name, without path) |
| kind | string | `"file"`, `"dir"`, or `"symlink"` |
| size | number/null | File size in bytes. `null` for directories and unresolvable symlinks |
| modified | number/null | Last modification time (Unix milliseconds). `null` if unavailable |
| created | number/null | Creation time (Unix milliseconds). `null` if unavailable or unsupported |
| readonly | boolean | Whether the entry is read-only |
| hidden | boolean | Whether the entry is hidden (dot-prefix on Unix, hidden attribute on Windows) |

### Notes

- The host MUST NOT recurse into subdirectories
- The host MUST NOT compute directory sizes (return `null`)
- For symlinks, `size` and `modified` SHOULD reflect the link target when resolvable; otherwise `null`
- If `limit` exceeds 1000, the host SHOULD clamp it to 1000
- The host SHOULD skip entries that cannot be read due to OS-level permissions and exclude them from `total`

---

## fs.v1.stat

Request metadata for a single path.

```json
{
  "type": "fs.v1.stat",
  "payload": {
    "path": "D:\\Documents\\report.pdf"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | Yes | Absolute path to stat |

### fs.v1.stat-result

When the path exists:

```json
{
  "type": "fs.v1.stat-result",
  "payload": {
    "path": "D:\\Documents\\report.pdf",
    "exists": true,
    "kind": "file",
    "size": 1048576,
    "modified": 1718300000000,
    "created": 1716000000000,
    "readonly": false,
    "hidden": false
  }
}
```

When the path does not exist:

```json
{
  "type": "fs.v1.stat-result",
  "payload": {
    "path": "D:\\nonexistent",
    "exists": false
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | Always | Echoed request path |
| exists | boolean | Always | Whether the path exists |
| kind | string | When exists | `"file"`, `"dir"`, or `"symlink"` |
| size | number/null | When exists | Size in bytes (`null` for directories) |
| modified | number/null | When exists | Last modification time (Unix ms) |
| created | number/null | When exists | Creation time (Unix ms) |
| readonly | boolean | When exists | Whether read-only |
| hidden | boolean | When exists | Whether hidden |

---

## fs.v1.download

Request the host to send a file via the file transfer protocol.

```json
{
  "type": "fs.v1.download",
  "payload": {
    "path": "D:\\Documents\\report.pdf"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | Yes | Absolute path of the file to download |

### Behavior

Upon receiving `fs.v1.download`, the host:

1. Validates that the path exists and is a regular file (not a directory or unresolvable symlink)
2. If validation fails, responds with `fs.v1.error` (with `correlationId` set to the request's envelope `id`)
3. If validation succeeds, initiates a `file.v2.offer` to the requester as the sender — the envelope's `correlationId` MUST be set to the `id` of the originating `fs.v1.download` envelope

The requester uses the `correlationId` on the incoming `file.v2.offer` to match it against a pending download request. When matched, the requester SHOULD auto-accept the offer without prompting the user. An offer without a recognized `correlationId` is treated as a normal unsolicited file transfer.

The standard file transfer v2 flow proceeds from there.

### Notes

- The host MUST NOT send any success acknowledgment for `fs.v1.download`; the `file.v2.offer` itself serves as implicit confirmation
- If the file becomes unavailable between validation and transfer start, the host SHOULD send `file.v2.cancel`
- The `file.v2.offer.fileName` SHOULD be the filename component of the requested path

---

## fs.v1.upload

Request authorization to upload one local file to an absolute destination path on the host. The requester MUST send this message before sending the associated `file.v2.offer`.

```json
{
  "type": "fs.v1.upload",
  "payload": {
    "path": "D:\\Documents\\report.pdf"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | Yes | Absolute final file path on the host |

### Behavior

Upon receiving `fs.v1.upload`, the host:

1. Validates that `path` is absolute; that its parent exists and is a directory; and that the target is permitted by its local filesystem policy.
2. Validates that the target path does not already exist. Version 1.13.0 defines no overwrite or automatic rename behavior.
3. If validation fails, sends `fs.v1.error` with `correlationId` set to the request envelope `id` and MUST NOT create an upload authorization.
4. If validation succeeds, creates a one-time pending upload authorization bound to the requesting device and destination path. It then sends `fs.v1.upload-ready` with `correlationId` set to the request envelope `id`.

The requester MUST NOT send the associated `file.v2.offer` before receiving `fs.v1.upload-ready`. It MUST wait no longer than 60 seconds after sending `fs.v1.upload`. A correlated `fs.v1.error` fails the upload request immediately. If no correlated `fs.v1.upload-ready` arrives before the timeout, the requester MUST mark the upload request as failed and MUST NOT send an offer. It MUST ignore a matching `fs.v1.upload-ready` received after that timeout. After receiving a timely `fs.v1.upload-ready`, the requester initiates the standard `file.v2.offer` flow as sender. The offer's envelope `correlationId` MUST be the `id` of the originating `fs.v1.upload` envelope.

When receiving a `file.v2.offer` with a `correlationId`, the host MUST treat it as an authorized filesystem upload only if it matches an unexpired, unused pending upload authorization from the same device. A matching offer consumes the authorization. The host MUST validate the offer according to `file-transfer-v2.md`, including available storage, and MUST automatically accept it only if that validation succeeds; otherwise it MUST use the standard `file.v2` rejection flow. A missing, expired, or consumed authorization MUST NOT be consumed; the offer MUST instead be handled as a normal unsolicited file transfer.

For an authorized upload, the destination path is exclusively the path recorded in the authorization. The host MUST NOT derive or replace that path from `file.v2.offer.payload.fileName`; `fileName` remains transfer metadata only. The host MUST write incoming data to a newly created temporary file in the authorized destination directory, then commit it to the authorized final path only after the standard `file.v2` checksum verification succeeds. The commit MUST be atomic and MUST fail if the final path already exists; it MUST NOT overwrite, replace, or follow a final-path symlink or reparse point. If the platform cannot provide an atomic no-replace commit for a destination, the host MUST reject the upload before accepting its offer.

The host MUST revalidate the destination directory and local write policy immediately before creating the temporary file and immediately before committing it. Path resolution at both points MUST prevent symlinks, reparse points, mounts, or concurrent filesystem changes from redirecting the write outside the path and policy validated for the authorization. If either revalidation or the atomic commit fails, the host MUST report transfer failure through the standard `file.v2` flow, preserve any pre-existing destination file, and remove the temporary file.

### fs.v1.upload-ready

```json
{
  "type": "fs.v1.upload-ready",
  "payload": {}
}
```

No payload fields are required. Its envelope `correlationId` MUST reference the `id` of the corresponding `fs.v1.upload` request. This confirms only that the host has created a pending upload authorization; it does not confirm successful transfer or final file creation.

### Authorization Lifecycle

- A pending upload authorization MUST expire 60 seconds after the host sends `fs.v1.upload-ready` if no matching `file.v2.offer` arrives.
- The host MUST NOT maintain more than one unexpired, unused upload authorization for the same resolved destination path.
- A host that cannot send either `fs.v1.upload-ready` or `fs.v1.error` leaves the requester to expire the request after its 60-second wait. It MUST NOT retain an upload authorization unless it successfully sends `fs.v1.upload-ready`.
- A matching offer consumes the authorization before the host validates or accepts it. The authorization MUST NOT be reused, including after transfer rejection, cancellation, failure, or completion.
- The host MUST discard all pending upload authorizations when its Business transport session to the requesting device ends.
- The protocol defines no cancellation message before an offer is sent. A requester that abandons an upload allows the authorization to expire.

### Flow

```
Uploader (requester)                    Host (remote filesystem)
        |--- fs.v1.upload ----------------------------------->|  { path }
        |<-- fs.v1.upload-ready -------------------------------|  correlationId = upload request id
        |                                                       |  (creates one-time authorization)
        |--- file.v2.offer ----------------------------------->|  correlationId = upload request id
        |<-- file.v2.accept -----------------------------------|  (automatic after file.v2 validation)
        |                                                       |
        |============= standard file.v2 data transfer =========|
        |<-- file.v2.done -------------------------------------|
```

---

## fs.v1.error

Sent by the host when a request cannot be fulfilled.

```json
{
  "type": "fs.v1.error",
  "payload": {
    "reason": "colink:fs.not_found.v1",
    "message": "Path does not exist",
    "details": { "path": "D:\\nonexistent" }
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reason | string | Yes | Structured reason code (see [Reason Format](../README.md#reason-format)) |
| message | string | Yes | Human-readable description for logging/debugging |
| details | object | No | Extensible structured metadata. Receivers MUST ignore unknown keys |

### Well-Known Reasons

| Reason | Description |
|--------|-------------|
| `colink:fs.not_found.v1` | Path does not exist |
| `colink:fs.permission_denied.v1` | OS-level permission denied |
| `colink:fs.not_directory.v1` | `fs.v1.list` target is not a directory |
| `colink:fs.not_file.v1` | `fs.v1.download` target is not a regular file |
| `colink:fs.already_exists.v1` | `fs.v1.upload` target path already exists |
| `colink:fs.invalid_path.v1` | `fs.v1.upload` path is invalid |
| `colink:fs.io_error.v1` | I/O error reading from filesystem |
| `colink:fs.generic.v1` | Generic filesystem error not covered by a specific reason |

---

## Version Compatibility

- Peers advertising Business Protocol Version < 1.4.0 do not support `fs.v1.*` messages
- Before sending `fs.v1.*`, a requester MUST verify that the target's advertised `businessVersion` is valid, has the same major version, and is at least 1.4.0. If the version is missing, malformed, incompatible, or too old, the requester MUST NOT send these messages.
- `fs.v1.upload` and `fs.v1.upload-ready` require Business Protocol Version 1.13.0 or later. Before sending `fs.v1.upload`, a requester MUST verify that the target's advertised version has the same major version and is at least 1.13.0. For peers below 1.13.0, the requester MUST disable remote uploads while retaining the Version 1.4.0 filesystem browsing and download behavior.
- A host that predates Version 1.4.0 treats an incoming `fs.v1.*` message as an unknown Business message and silently ignores it according to the standard forward-compatibility rule.
- A host with Business Protocol Version 1.4.0 through 1.12.x silently ignores `fs.v1.upload` as an unknown Business message according to the standard forward-compatibility rule. A requester in that version range silently ignores an incoming `fs.v1.upload-ready` as an unknown Business message.
