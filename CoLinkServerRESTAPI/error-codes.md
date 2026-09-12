# Error Codes

Code `0` = success. Positive codes are allocated to global categories or modules by the table below. Negative codes are global catch-all errors.

## Range Allocation

| Range | Allocation |
|-------|------------|
| `1xxx` | Authentication module |
| `2xxx` | Device module |
| `3xxx` | Reserved for global rate, quota, and request-policy errors |
| `4xxx` | Reserved for global request parsing and parameter-validation errors |
| `5xxx` | Update module |
| `6xxx` | Notes module |

Future modules MUST use an unallocated range and MUST NOT define module errors in the reserved `3xxx` or `4xxx` ranges.

## Global

| Code | Message | HTTP Status | Description |
|------|---------|-------------|-------------|
| -1 | internal error | 500 | Unhandled error, catch-all fallback |
| 1030 | unauthorized | 401 | Missing or invalid access token (middleware) |
| 3001 | rate limited | 429 | Too many requests |
| 4001 | invalid request body | 400 | JSON parse error or missing required fields |
| 4002 | invalid parameter | 400 | Path/query parameter validation failure |

Notes:
- Code `-1` is returned when no specific error code matches. Never expose internal details (stack trace, SQL) in the message.
- Code `1030` is in the `1xxx` authentication range but applies globally: authenticated endpoints MUST reject an otherwise valid access token when its account is disabled, using `1030 unauthorized`.
- The range table above is authoritative for allocating new codes.

## Authentication (1xxx)

| Code | Message | HTTP Status | Description | Used By |
|------|---------|-------------|-------------|---------|
| 1001 | email already exists | 400 | Email already in use | [register](auth/register.md) |
| 1002 | invalid email format | 400 | Malformed email | [register](auth/register.md) |
| 1003 | password too short | 400 | Less than 8 characters | [register](auth/register.md), [change-password](auth/change-password.md) |
| 1004 | username already exists | 400 | Username already in use | [register](auth/register.md), [update-username](auth/update-username.md) |
| 1005 | invalid username | 400 | Invalid username | [register](auth/register.md), [update-username](auth/update-username.md) |
| 1010 | invalid credentials | 401 | Wrong identifier or password | [login](auth/login.md), [change-password](auth/change-password.md) |
| 1011 | account disabled | 401 | Account has been banned | [login](auth/login.md), [refresh](auth/refresh.md) |
| 1020 | invalid refresh token | 401 | Token expired or malformed | [logout](auth/logout.md), [refresh](auth/refresh.md) |
| 1021 | token revoked | 401 | Token has been revoked | [refresh](auth/refresh.md) |

## Device (2xxx)

Compatibility note: assigning `2005 invalid device id` to invalid registration `deviceId` values is a breaking correction from the legacy overloaded `2003 invalid device id` response. Valid requests are unaffected. Clients MUST treat unknown nonzero codes as generic request failures; the server does not emit both legacy and replacement codes for one response.

The Push API uses Bark-specific HTTP status rules. Its response body retains the CoLink error code from this registry, while the HTTP status is `400` for an invalid or unknown target and `500` for a delivery failure. These Push overrides are shown below; other endpoints use the default status.

| Code | Message | HTTP Status | Description | Used By |
|------|---------|-------------|-------------|---------|
| 2001 | device limit reached | 400 | Max devices per account exceeded | [register device](devices/register.md) |
| 2002 | invalid device type | 400 | Unsupported device type | [register device](devices/register.md) |
| 2003 | invalid key | 400 | Public key format is invalid | [register device](devices/register.md), [rotate-key](devices/rotate-key.md) |
| 2004 | device id conflict | 400 | The submitted deviceId already exists | [register device](devices/register.md) |
| 2005 | invalid device id | 400 | The submitted `deviceId` is not a UUID v4 | [register device](devices/register.md) |
| 2010 | device not found | 404; Push: 400 | Device does not exist or does not belong to this account | [delete device](devices/delete.md), [update device](devices/update.md), [rotate-key](devices/rotate-key.md), [ws/ticket](websocket/ticket.md), [push](push/README.md) |
| 2011 | device offline | Push: 500 | Device exists but has no active WebSocket connection | [push](push/README.md) |
| 2012 | push not supported | Push: 500 | Device is online but does not support Cloud WebSocket Protocol 1.1.0 Push capability | [push](push/README.md), [websocket/v1](websocket/v1.md) |
| 2013 | push timeout | Push: 500 | Push was delivered to the WebSocket but no ACK received within 10 seconds | [push](push/README.md) |

## Update (5xxx)

| Code | Message | HTTP Status | Description | Used By |
|------|---------|-------------|-------------|---------|
| 5001 | platform not supported | 400 | Unsupported platform value | [check](update/check.md), [download](update/download.md) |
| 5002 | release not found | 404 | Release does not exist for the platform and version | [download](update/download.md) |
| 5003 | asset not found | 404 | Asset does not exist or cached file is missing | [download](update/download.md) |

## Notes (6xxx)

| Code | Message | HTTP Status | Description | Used By |
|------|---------|-------------|-------------|---------|
| 6001 | note not found | 404 | Note does not exist, has been deleted, or does not belong to the current account | [get-note](notes/notes-and-tags/get-note.md), [update-note](notes/notes-and-tags/update-note.md), [delete-note](notes/notes-and-tags/delete-note.md) |
| 6002 | revision conflict | 412 | `baseRevision` does not match the current version | [update-note](notes/notes-and-tags/update-note.md), [delete-note](notes/notes-and-tags/delete-note.md), [update-tag](notes/notes-and-tags/update-tag.md), [delete-tag](notes/notes-and-tags/delete-tag.md) |
| 6003 | tag not found | 404 | Tag does not exist, has been deleted, or does not belong to the current account | [list-notes](notes/notes-and-tags/list-notes.md), [update-tag](notes/notes-and-tags/update-tag.md), [delete-tag](notes/notes-and-tags/delete-tag.md) |
| 6004 | tag name conflict | 409 | A tag with the same normalized name already exists in the account | [create-tag](notes/notes-and-tags/create-tag.md), [update-tag](notes/notes-and-tags/update-tag.md) |
| 6005 | attachment not found | 404 | Attachment does not exist or does not belong to the current account | [get attachment](notes/attachments/get.md), [download attachment](notes/attachments/download.md), [delete attachment](notes/attachments/delete.md), [attachment references](notes/attachments/references.md) |
| 6006 | attachment in use | 409 | Attachment is still referenced by one or more notes | [delete attachment](notes/attachments/delete.md) |
| 6007 | note storage limit reached | 413 | A configured per-item limit or the account's Notes storage quota has been reached | [Notes limits](notes/README.md#limits-and-pagination), [upload attachment](notes/attachments/upload.md) |
| 6008 | invalid note reference | 409 | `tagIds` or `attachmentIds` contains an invalid, deleted, or misowned resource | [create-note](notes/notes-and-tags/create-note.md), [update-note](notes/notes-and-tags/update-note.md), [delete-tag](notes/notes-and-tags/delete-tag.md), [delete attachment](notes/attachments/delete.md) |
| 6009 | sync cursor expired | 410 | Incremental sync cursor has expired; client must perform a full snapshot sync | [incremental sync](notes/notes-and-tags/README.md#incremental-changes) |
| 6010 | attachment checksum mismatch | 422 | Uploaded content SHA-256 does not match the `sha256` in the request | [upload attachment](notes/attachments/upload.md) |
