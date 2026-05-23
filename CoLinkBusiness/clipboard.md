# Clipboard Sync

Synchronize clipboard content between devices.

## Message Type

`clipboard.v1.sync`

## Payload

```json
{
  "type": "clipboard.v1.sync",
  "payload": {
    "contentType": "text/plain",
    "content": "Hello world",
    "data": null
  }
}
```

| Field       | Type        | Description                               |
|-------------|-------------|-------------------------------------------|
| contentType | string      | MIME type of clipboard content             |
| content     | string/null | Text content (for text types)             |
| data        | string/null | Base64 encoded binary (for non-text)      |

## Supported Types

| contentType  | content | data | Description |
|--------------|---------|------|-------------|
| text/plain   | yes     | no   | Plain text  |
| text/html    | yes     | no   | Rich text   |
| image/png    | no      | yes  | PNG image   |
| image/jpeg   | no      | yes  | JPEG image  |

## Behavior

- Push model: clipboard change → broadcast to all connected devices
- Receiver writes to local clipboard silently
- Skip content > 1MB

## Examples

Text:
```json
{
  "type": "clipboard.v1.sync",
  "payload": { "contentType": "text/plain", "content": "copied text", "data": null }
}
```

Image:
```json
{
  "type": "clipboard.v1.sync",
  "payload": { "contentType": "image/png", "content": null, "data": "iVBORw0KGgo..." }
}
```
