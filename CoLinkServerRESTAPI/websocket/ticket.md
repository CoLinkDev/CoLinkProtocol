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
- Ticket issuance is limited independently per device over a rolling one-minute window. The recommended default limit is 20 tickets per device per minute; deployments MAY configure a different positive limit.

## Errors

| HTTP Status | Code | Condition |
|-------------|------|-----------|
| 404 | 2010 | The device does not exist or does not belong to the authenticated account. |
| 429 | 3001 | The device exceeded the configured ticket issuance limit. |

See [Error Codes](../error-codes.md) for authentication errors and the canonical code definitions.
