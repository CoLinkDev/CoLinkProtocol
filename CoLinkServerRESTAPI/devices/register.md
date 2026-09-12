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
| deviceId  | string | yes      | Client-generated UUID v4                              |
| name      | string | yes      | Device display name: 1–100 Unicode code points, containing at least one non-whitespace character and no control characters |
| type      | string | yes      | `windows` \| `android` \| `macos` \| `linux` \| `ios` |
| publicKey | string | yes      | Device public key (base64), generated locally         |

```json
{
  "deviceId": "660e8400-e29b-41d4-a716-446655440001",
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
    "deviceSecret": ""
  },
  "message": "ok"
}
```

`deviceId` is echoed back from the client-submitted value. `deviceSecret` is deprecated and always returns an empty string — it has no functional purpose and will be removed in a future protocol version.

## Errors

See [Error Codes](../error-codes.md#device-2xxx).
