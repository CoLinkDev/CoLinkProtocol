# WebSocket Ticket

Obtain a short-lived ticket for WebSocket authentication.

## Endpoint

```
POST /api/v1/ws/ticket
```

## Request

Header: `Authorization: Bearer <token>`

| Field    | Type   | Required | Description |
|----------|--------|----------|-------------|
| deviceId | string | yes      | Device UUID |

```json
{
  "deviceId": "660e8400-e29b-41d4-a716-446655440001"
}
```

## Response

```json
{
  "code": 0,
  "data": {
    "ticket": "random-opaque-string-64chars",
    "expiresIn": 30
  },
  "message": "ok"
}
```

| Field     | Type   | Description                        |
|-----------|--------|------------------------------------|
| ticket    | string | One-time use ticket                |
| expiresIn | number | Validity in seconds (default: 30)  |

## Behavior

- Ticket is single-use: consumed on WebSocket connection
- Ticket expires after 30 seconds if unused
- Server validates that the device belongs to the authenticated user

## Errors

| Code | Message          | Description                              |
|------|------------------|------------------------------------------|
| 2010 | device not found | Device does not belong to this account   |
| 3001 | rate limited     | Too many ticket requests (max 5/minute)  |
