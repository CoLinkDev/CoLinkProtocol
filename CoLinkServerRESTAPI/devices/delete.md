# Delete Device

Unbind a device from the account.

## Endpoint

```
DELETE /api/v1/devices/:deviceId
```

## Request

Header: `Authorization: Bearer <token>`

## Response

```json
{
  "code": 0,
  "data": null,
  "message": "ok"
}
```

## Errors

See [Error Codes](../error-codes.md#device-2xxx).
