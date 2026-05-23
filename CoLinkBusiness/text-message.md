# Text Message

Send text messages between devices.

## Message Type

`message.v1.text`

## Payload

```json
{
  "type": "message.v1.text",
  "payload": {
    "messageId": "88a3c4d5-e6f7-8901-abcd-ef0123456789",
    "text": "Hello from my phone"
  }
}
```

| Field     | Type   | Description              |
|-----------|--------|--------------------------|
| messageId | string | Unique message ID (UUID) |
| text      | string | Message content          |

## Notes

- Fire and forget (no delivery confirmation)
- Messages are not persisted on server
- Max text length: 10,000 characters
