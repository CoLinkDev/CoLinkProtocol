# Send Push Notification

Send a push notification to a device.

## Authentication

All requests require a Bearer access token:

```http
Authorization: Bearer <access-token>
```

The server only accepts target device IDs owned by the token's account. `device_key` is retained as the Bark-compatible field name, but it identifies a target device and is not a credential.

## Endpoints

All endpoints accept both GET and POST.

### Path form

```
GET  /api/push/:deviceId
POST /api/push/:deviceId

GET  /api/push/:deviceId/:body
POST /api/push/:deviceId/:body

GET  /api/push/:deviceId/:title/:body
POST /api/push/:deviceId/:title/:body

GET  /api/push/:deviceId/:title/:subtitle/:body
POST /api/push/:deviceId/:title/:subtitle/:body
```

Path segments provide shorthand for `title`, `subtitle`, and `body`. All other parameters are passed as query string (GET) or request body (POST).

**Example:**

```sh
curl -H 'Authorization: Bearer <access-token>' \
     "https://server/api/push/660e8400-.../Deploy%20complete/prod%20v2.3.1%20is%20live?group=ci&url=https://github.com/runs/123"
```

### POST with form body

Parameters in `application/x-www-form-urlencoded` body:

```sh
curl -X POST https://server/api/push/660e8400-... \
     -H 'Authorization: Bearer <access-token>' \
     -d 'body=Deploy complete&group=ci'
```

### POST with JSON body (key in path)

```sh
curl -X POST https://server/api/push/660e8400-... \
     -H 'Authorization: Bearer <access-token>' \
     -H 'Content-Type: application/json' \
     -d '{"body":"Deploy complete","group":"ci"}'
```

### POST with JSON body (key in body)

Use `/api/push` (no `deviceId` in path). The `device_key` field carries the `deviceId`:

```sh
curl -X POST https://server/api/push \
     -H 'Authorization: Bearer <access-token>' \
     -H 'Content-Type: application/json' \
     -d '{"device_key":"660e8400-...","body":"Deploy complete","group":"ci"}'
```

### Batch push

Use `device_keys` (array) instead of `device_key` to push to multiple devices in one request. Only supported in JSON body form:

```sh
curl -X POST https://server/api/push \
     -H 'Authorization: Bearer <access-token>' \
     -H 'Content-Type: application/json' \
     -d '{"device_keys":["660e8400-...","770e8400-..."],"body":"Deploy complete"}'
```

Each device is processed independently. The response lists per-device results. Authorization is checked before processing the batch; an invalid token rejects the whole request with `1030 unauthorized`.

**Batch response:**
```json
{
  "code": 200,
  "message": "success",
  "timestamp": 1722038400000,
  "results": [
    { "device_key": "660e8400-...", "code": 200, "message": "success" },
    { "device_key": "770e8400-...", "code": 2011, "message": "device offline" }
  ]
}
```

## Parameters

All parameters are optional unless required by the chosen path form. Parameters in the path take precedence over the same name in query string or body.

| Parameter | Type | Description |
|-----------|------|-------------|
| title | string | Push title |
| subtitle | string | Push subtitle |
| body | string | Push content |
| markdown | string | Push content in Markdown; when provided, `body` is ignored |
| device_key | string | Target `deviceId` owned by the authenticated account; used in key-in-body form only |
| device_keys | string[] | Target `deviceId` array owned by the authenticated account; used for batch push only (JSON only) |
| level | string | Interruption level: `active` (default) / `timeSensitive` / `passive` / `critical` |
| volume | integer | Alert volume for `critical` level, 0–10 (default: 5) |
| badge | integer | Notification badge number |
| sound | string | Notification sound name |
| icon | string | Custom notification icon URL |
| image | string | Notification image URL |
| group | string | Notification group name |
| url | string | URL to open when notification is tapped |
| copy | string | Text to copy when notification is copied; defaults to full push content |
| autoCopy | boolean | Automatically copy push content on receipt |
| call | boolean | Repeat notification sound for 30 seconds |
| isArchive | boolean | Whether to save the push to history |
| ttl | integer | Retention duration for archived pushes in seconds; expired entries are deleted automatically |
| id | string | Notification identifier; sending with the same `id` updates the existing notification |
| delete | boolean | Delete the notification identified by `id`; must be used with `id` |
| action | string | Set to `"alert"` to show an action popup when the app is opened from the notification |
| ciphertext | string | Encrypted push ciphertext |

## Response

**Success:**
```json
{ "code": 200, "message": "success", "timestamp": 1722038400000 }
```

## Errors

See `README.md` for the full error code table.
