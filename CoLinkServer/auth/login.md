# Login

Authenticate an existing user.

## Endpoint

```
POST /api/v1/auth/login
```

## Request

| Field    | Type   | Required | Description |
|----------|--------|----------|-------------|
| email    | string | yes      | User email  |
| password | string | yes      | Password    |

```json
{
  "email": "user@example.com",
  "password": "securepass123"
}
```

## Response

```json
{
  "code": 0,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  },
  "message": "ok"
}
```

## Errors

| Code | Message             | Description              |
|------|---------------------|--------------------------|
| 1010 | invalid credentials | Wrong email or password  |
| 1011 | account disabled    | Account has been banned  |
