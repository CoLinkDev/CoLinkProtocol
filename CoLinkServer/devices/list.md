# List Devices

Get all devices bound to the current account.

## Endpoint

```
GET /api/v1/devices
```

## Request

Header: `Authorization: Bearer <token>`

## Response

```json
{
  "code": 0,
  "data": {
    "devices": [
      {
        "deviceId": "660e8400-e29b-41d4-a716-446655440001",
        "name": "My Desktop",
        "type": "windows",
        "online": true,
        "lastSeen": "2026-05-23T10:30:00Z",
        "publicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A..."
      },
      {
        "deviceId": "770e8400-e29b-41d4-a716-446655440002",
        "name": "My Phone",
        "type": "android",
        "online": false,
        "lastSeen": "2026-05-22T18:00:00Z",
        "publicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A..."
      }
    ]
  },
  "message": "ok"
}
```
