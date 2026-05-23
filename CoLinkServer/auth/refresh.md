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
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  },
  "message": "ok"
}
```

## Errors

| Code | Message               | Description                |
|------|-----------------------|----------------------------|
| 1020 | invalid refresh token | Token expired or malformed |
| 1021 | token revoked         | Token has been revoked     |
