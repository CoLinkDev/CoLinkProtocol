# File Transfer

Transfer files between devices via multi-step negotiation.

## Message Type

`file.v1.*`

## Flow

```
Sender                          Receiver
  |--- file.v1.offer ---------->|
  |<-- file.v1.accept / reject -|
  |--- file.v1.chunk (0) ----->|
  |--- file.v1.chunk (1) ----->|
  |--- ...                      |
  |--- file.v1.chunk (last) -->|
  |<-- file.v1.done ------------|
```

## Messages

### file.v1.offer

```json
{
  "type": "file.v1.offer",
  "payload": {
    "fileId": "uuid",
    "fileName": "report.pdf",
    "fileSize": 1048576,
    "totalChunks": 16,
    "chunkSize": 65536,
    "checksum": "sha256:e3b0c44298fc1c149afbf4c8..."
  }
}
```

| Field       | Type   | Description                                 |
|-------------|--------|---------------------------------------------|
| fileId      | string | Unique transfer ID                          |
| fileName    | string | Original file name                          |
| fileSize    | number | Total size in bytes                         |
| totalChunks | number | Total number of chunks                      |
| chunkSize   | number | Bytes per chunk (last chunk may be smaller) |
| checksum    | string | `sha256:<hash>` of the full file            |

### file.v1.accept

```json
{
  "type": "file.v1.accept",
  "payload": { "fileId": "uuid" }
}
```

### file.v1.reject

```json
{
  "type": "file.v1.reject",
  "payload": { "fileId": "uuid", "reason": "storage full" }
}
```

### file.v1.chunk

```json
{
  "type": "file.v1.chunk",
  "payload": {
    "fileId": "uuid",
    "index": 0,
    "totalChunks": 16,
    "data": "base64encodeddata..."
  }
}
```

| Field       | Type   | Description                   |
|-------------|--------|-------------------------------|
| fileId      | string | Transfer ID                   |
| index       | number | Chunk sequence (0-based)      |
| totalChunks | number | Total chunks in this transfer |
| data        | string | Base64 encoded chunk bytes    |

Default chunk size: 64KB (65536 bytes).

### file.v1.done

Sent by receiver after all chunks received and checksum verified.

```json
{
  "type": "file.v1.done",
  "payload": { "fileId": "uuid", "success": true }
}
```

Checksum mismatch:

```json
{
  "type": "file.v1.done",
  "payload": { "fileId": "uuid", "success": false, "reason": "checksum mismatch" }
}
```

### file.v1.cancel

Either side can cancel:

```json
{
  "type": "file.v1.cancel",
  "payload": { "fileId": "uuid", "reason": "user cancelled" }
}
```

## Notes

- Offer expires after 60s with no response
- Cloud relay: max 10MB recommended
- LAN direct: no size limit
