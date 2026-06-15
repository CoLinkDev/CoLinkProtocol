# Update Device

Update device display name.

## Endpoint

```
PUT /api/v1/devices/:deviceId
```

## Request

Header: `Authorization: Bearer <token>`

| Field | Type   | Required | Description      |
|-------|--------|----------|------------------|
| name  | string | no       | New display name |

```json
{
  "name": "Office PC"
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

## Errors

| Code | Message          | Description       |
|------|------------------|-------------------|
| 2010 | device not found | Device ID invalid |
