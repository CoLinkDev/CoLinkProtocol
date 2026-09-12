# Rotate Device Key

Replace the public key of a device (key rotation).

## Endpoint

```
PUT /api/v1/devices/:deviceId/key
```

## Request

Header: `Authorization: Bearer <token>`

| Field     | Type   | Required | Description                       |
|-----------|--------|----------|-----------------------------------|
| publicKey | string | yes      | New device public key (base64)    |

```json
{
  "publicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A..."
}
```

## Response

```json
{
  "code": 0,
  "data": null,
  "message": "ok"
}
```

## Behavior

- The old public key is immediately invalidated
- Other devices SHOULD refresh their device list cache to get the new key
- Existing LAN connections authenticated with the old key will fail on next handshake

## Errors

See [Error Codes](../error-codes.md#device-2xxx).
