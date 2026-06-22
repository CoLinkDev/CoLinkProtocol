# Refresh Token

Get a new access token using a refresh token.

## Endpoint

```
POST /api/v1/auth/refresh
```

## Request

| Field        | Type   | Required | Description          |
|--------------|--------|----------|----------------------|
| refreshToken | string | yes      | Current refresh token |

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

## Response

```json
{
  "code": 0,
  "data": {
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
| token            | string | New access token                    |
| refreshToken     | string | New refresh token                   |
| expiresIn        | number | Access token validity in seconds    |
| refreshExpiresIn | number | Refresh token validity in seconds   |

Refresh tokens are rotated. After a refresh token is used successfully, the same refresh token may be retried for 5 minutes and returns the same refresh result. After that replay window, it is treated as revoked.

## Errors

| Code | Message               | Description                |
|------|-----------------------|----------------------------|
| 1020 | invalid refresh token | Token expired or malformed |
| 1021 | token revoked         | Token has been revoked     |
