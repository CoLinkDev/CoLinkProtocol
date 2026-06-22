# Login

Authenticate an existing user.

## Endpoint

```
POST /api/v1/auth/login
```

## Request

| Field      | Type   | Required | Description       |
|------------|--------|----------|-------------------|
| identifier | string | yes      | Email or username |
| password   | string | yes      | Password          |

```json
{
  "identifier": "user@example.com",
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
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 259200,
    "refreshExpiresIn": 2592000
  },
  "message": "ok"
}
```

| Field            | Type   | Description                         |
|------------------|--------|-------------------------------------|
| userId           | string | User ID                             |
| token            | string | Access token                        |
| refreshToken     | string | Refresh token                       |
| expiresIn        | number | Access token validity in seconds    |
| refreshExpiresIn | number | Refresh token validity in seconds   |

## Errors

| Code | Message             | Description              |
|------|---------------------|--------------------------|
| 1010 | invalid credentials | Wrong identifier or password |
| 1011 | account disabled    | Account has been banned  |
