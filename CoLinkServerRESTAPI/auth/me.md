# Me

Get current user information. Also serves as token validity check.

## Endpoint

```
GET /api/v1/me
```

## Request

Header: `Authorization: Bearer <token>`

No body required.

## Response

```json
{
  "code": 0,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "brook.user",
    "createdAt": "2026-01-15T08:30:00Z"
  },
  "message": "ok"
}
```

## Behavior

- Returns HTTP 401 with `1030 unauthorized` if the access token is missing, expired, invalid, or belongs to a disabled account
- Client can use this to check token validity on startup:
  - 200 → token valid, proceed
  - 401 → try refresh; if refresh fails → re-login

## Errors

See [Error Codes](../error-codes.md#global).
