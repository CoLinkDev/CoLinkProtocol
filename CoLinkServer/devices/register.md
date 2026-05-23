# Register Device

Bind a new device to the current user account.

## Endpoint

```
POST /api/v1/devices
```

## Request

Header: `Authorization: Bearer <token>`

| Field     | Type   | Required | Description                                           |
|-----------|--------|----------|-------------------------------------------------------|
| name      | string | yes      | Device display name                                   |
| type      | string | yes      | `windows` \| `android` \| `macos` \| `linux` \| `ios` |
| publicKey | string | yes      | Device public key (base64), generated locally         |

```json
{
  "name": "My Desktop",
  "type": "windows",
  "publicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A..."
}
```

## Response

```json
{
  "code": 0,
  "data": {
    "deviceId": "660e8400-e29b-41d4-a716-446655440001",
    "deviceSecret": "a1b2c3d4e5f6..."
  },
  "message": "ok"
}
```

`deviceSecret` is used for WebSocket authentication. Store securely on device.

## Errors

| Code | Message              | Description                      |
|------|----------------------|----------------------------------|
| 2001 | device limit reached | Max devices per account exceeded |
| 2002 | invalid device type  | Unsupported device type          |
