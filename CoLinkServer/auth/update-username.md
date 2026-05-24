# Update Username

Update the current user's username.

## Endpoint

```
PUT /api/v1/me/username
```

## Request

Header: `Authorization: Bearer <token>`

| Field    | Type   | Required | Description         |
|----------|--------|----------|---------------------|
| username | string | yes      | New unique username |

```json
{
  "username": "brook.user"
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

## Errors

| Code | Message                 | Description             |
|------|-------------------------|-------------------------|
| 1004 | username already exists | Username already in use |
| 1005 | invalid username        | Invalid username        |
