# Register

Create a new user account.

## Endpoint

```
POST /api/v1/auth/register
```

## Request

| Field    | Type   | Required | Description     |
|----------|--------|----------|-----------------|
| email    | string | yes      | User email      |
| username | string | yes      | Unique username |
| password | string | yes      | Password (min 8) |

```json
{
  "email": "user@example.com",
  "username": "brook.user",
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

| Code | Message              | Description          |
|------|----------------------|----------------------|
| 1001 | email already exists    | Email already in use    |
| 1002 | invalid email format    | Malformed email         |
| 1003 | password too short      | Less than 8 chars       |
| 1004 | username already exists | Username already in use |
| 1005 | invalid username        | Invalid username        |
