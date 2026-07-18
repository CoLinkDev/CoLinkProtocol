# Remote Filesystem Browse

Browse the remote device's filesystem and request file downloads.

## Message Type

`fs.v1.*`

## Minimum Business Protocol Version

v1.4.0

## Design Overview

- **Request-response model**: the requester sends a query, the host returns the result.
- **Flat listing**: each `fs.v1.list` returns one directory level (non-recursive) with pagination support.
- **Download via file.v2**: the requester signals intent with `fs.v1.download`; the host initiates a standard `file.v2.offer` back to the requester.
- **No access control at protocol level**: the host exposes its entire filesystem. Implementations MAY add local access restrictions outside the protocol.

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
| `fs.v1.error` | host → requester | Error response for any fs.v1 request |

## Correlation

All responses use the Business Envelope's `correlationId` to match the originating request. The host MUST set `correlationId` on every `*-result` and `fs.v1.error` message to the `id` of the corresponding request envelope.

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
| `colink:fs.io_error.v1` | I/O error reading from filesystem |
| `colink:fs.generic.v1` | Generic filesystem error not covered by a specific reason |

---

## Version Compatibility

- Peers advertising Business Protocol Version < 1.4.0 do not support `fs.v1.*` messages
- A requester MUST check the peer's advertised `businessVersion` before sending `fs.v1.*` messages; if the peer's version is below 1.4.0, the requester MUST NOT send these messages
- If a host with version < 1.4.0 receives an unknown `fs.v1.*` message, it ignores it per the standard unknown-message handling rule
