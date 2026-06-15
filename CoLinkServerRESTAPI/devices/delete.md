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

| Code | Message          | Description       |
|------|------------------|-------------------|
| 2010 | device not found | Device ID invalid |
