# Push Notification API

Server-initiated push notifications delivered to connected devices.

## Overview

The Push API allows any caller to send a notification payload to a specific device through the CoLink server. When the server receives a push request, it delivers the notification to the target device's active WebSocket connection and waits for the device to acknowledge receipt before returning an HTTP response.

The API is compatible with the [Bark](https://github.com/Finb/Bark) request paths and parameters. Existing Bark integrations must change the base URL, use a CoLink `deviceId` as the target device, and add a Bearer token.

## Target Device

The `deviceId` (UUID v4) identifies the target device. Obtain it from `GET /api/v1/devices`.

The `deviceId` is not an authentication credential. The target device must belong to the account identified by the request's Bearer token.

## Requirements

- The caller must provide a valid Bearer access token.
- The target device must be **online** (active WebSocket connection).
- The target device must advertise a compatible Cloud WebSocket Protocol Version `1.1.0` capability. Devices running `wsVersion` `1.0.x`, or not reporting a parseable `wsVersion`, do not support push and return `2012 push not supported` immediately. See [`websocket/v1.md`](../websocket/v1.md#version-exchange-and-compatibility).

## Behavior

1. Server validates the Bearer token and derives the caller's account.
2. Server validates that the `deviceId` belongs to that account and the device is online.
3. Server checks the device's advertised Cloud WebSocket Protocol Version. If it does not support the `1.1.0` Push capability, returns `2012 push not supported` without sending any WebSocket message.
4. Server sends a `notification.push` WebSocket message to the device.
5. Server waits up to **10 seconds** for a `notification.push-ack` from the device.
6. On ACK received: returns HTTP success.
7. On timeout: returns `2013 push timeout`.

## Authentication

All push endpoints require an access token in the `Authorization` header:

```http
Authorization: Bearer <access-token>
```

The server only permits pushes to devices owned by the token's account. A missing or invalid token returns `1030 unauthorized` with HTTP status `401`. A `deviceId` outside the account is reported as `2010 device not found` and MUST NOT reveal whether that device exists in another account.

## Response Format

All push endpoints use the Bark response format:

**Success:**
```json
{ "code": 200, "message": "success", "timestamp": 1722038400000 }
```

**Error:**
```json
{ "code": 2011, "message": "device offline", "timestamp": 1722038400000 }
```

**Unauthorized:**
```json
{ "code": 1030, "message": "unauthorized", "timestamp": 1722038400000 }
```

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 1030 | unauthorized | Missing or invalid Bearer token (HTTP 401) |
| 2010 | device not found | The `deviceId` is not a device of the authenticated account |
| 2011 | device offline | Device exists but has no active WebSocket connection |
| 2012 | push not supported | Device is online but does not support the Cloud WebSocket Protocol `1.1.0` Push capability |
| 2013 | push timeout | Push was delivered to the WebSocket but no ACK received within 10 seconds |
| 4001 | invalid request body | Request body could not be parsed |
| 4002 | invalid parameter | Path or query parameter validation failed |
