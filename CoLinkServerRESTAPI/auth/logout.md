# Logout

Revoke the current refresh token, ending the session.

## Endpoint

```
POST /api/v1/auth/logout
```

## Request

Header: `Authorization: Bearer <token>`

| Field        | Type   | Required | Description                    |
|--------------|--------|----------|--------------------------------|
| refreshToken | string | yes      | The refresh token to revoke    |

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
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

## Behavior

- The specified refresh token is permanently revoked
- The access token remains valid until its natural expiry (short-lived)
- To logout from all devices, call this endpoint for each refresh token

## Errors

See [Error Codes](../error-codes.md#authentication-1xxx).
