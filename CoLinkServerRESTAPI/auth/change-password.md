# Change Password

Change the password for the authenticated user.

## Endpoint

```
POST /api/v1/auth/change-password
```

## Request

Header: `Authorization: Bearer <token>`

| Field       | Type   | Required | Description          |
|-------------|--------|----------|----------------------|
| oldPassword | string | yes      | Current password     |
| newPassword | string | yes      | New password (min 8) |

```json
{
  "oldPassword": "currentpass123",
  "newPassword": "newsecurepass456"
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

- All existing refresh tokens are revoked after password change
- The current access token remains valid until expiry
- Client SHOULD re-login after password change

## Errors

See [Error Codes](../error-codes.md#authentication-1xxx).
