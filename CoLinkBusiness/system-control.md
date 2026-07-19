# System Control

Send a system control command from a controller device to a host device, or query the host's current system state.

## Overview

A controller device sends a one-way command to request the host device to perform a system-level action. The host executes the action immediately upon receipt. No response message is defined for commands; confirmation is the responsibility of the application layer.

A controller may also query the host's current system state using a request-response pair. The host replies with the requested field values, or an error if the query cannot be fulfilled.

- Commands are fire-and-forget: the controller MUST NOT expect a reply
- The host MUST execute the requested action without delay upon receipt
- Whether to prompt the user for confirmation before sending is an application-layer concern
- Queries use `correlationId` to associate the result or error with the originating request

## Message Types

| Type                        | Direction            | Description                          |
|-----------------------------|----------------------|--------------------------------------|
| `system-control.v1.command` | controller → host    | Request a system-level action        |
| `system-control.v1.query`   | controller → host    | Query current system state fields    |
| `system-control.v1.result`  | host → controller    | Return queried field values          |
| `system-control.v1.error`   | host → controller    | Report a query failure               |

---

## system-control.v1.command

```json
{
  "type": "system-control.v1.command",
  "payload": {
    "action": "sleep",
    "volume": null
  }
}
```

| Field  | Type           | Description          |
|--------|----------------|----------------------|
| action | string         | The action to perform. See [Actions](#actions). |
| volume | integer / null | Required when `action` is `set-volume` (0–100 inclusive). MUST be `null` or omitted for all other actions. |

### Actions

| Value        | Description                                              |
|--------------|----------------------------------------------------------|
| `sleep`      | Suspend the host to sleep / low-power state              |
| `shutdown`   | Power off the host                                       |
| `lock`       | Lock the host screen / user session                      |
| `play`       | Resume media playback on the host                        |
| `pause`      | Pause media playback on the host                         |
| `next`       | Skip to the next track                                   |
| `previous`   | Return to the previous track                             |
| `set-volume` | Set the system volume. `volume` MUST be present and in the range 0–100. |
| `mute`       | Mute system audio. |

### Notes

- The host MUST silently ignore `system-control.v1.command` messages with an unrecognized `action` value to allow forward-compatible extension
- The host SHOULD NOT send this message type; the direction is controller → host only
- Media playback actions (`play`, `pause`, `next`, `previous`) are best-effort: the host SHOULD execute them against the active system media session where available and MUST silently ignore the command if no controllable session exists

---

## system-control.v1.query

Sent by the controller to request the current value of one or more system state fields.

```json
{
  "type": "system-control.v1.query",
  "payload": {
    "fields": ["volume", "muted", "playback"]
  }
}
```

| Field  | Type     | Description |
|--------|----------|-------------|
| fields | string[] | One or more field names to query. See [Queryable Fields](#queryable-fields). |

### Queryable Fields

| Value      | Description |
|------------|-------------|
| `volume`   | Current system master volume (0–100) |
| `muted`    | Whether system audio is muted |
| `playback` | Current media playback state |

- The host MUST silently ignore unrecognized field names in `fields` and return only the fields it recognizes
- If all requested fields are unrecognized, the host MUST return a `system-control.v1.result` with an empty payload object
- `fields` MUST NOT be empty; the host MUST return a `system-control.v1.error` if `fields` is empty or missing

---

## system-control.v1.result

Sent by the host in response to a `system-control.v1.query`. The `correlationId` in the envelope MUST be set to the `id` of the originating query envelope.

```json
{
  "type": "system-control.v1.result",
  "payload": {
    "volume": 75,
    "muted": false,
    "playback": "playing"
  }
}
```

Only fields that were both requested and recognized by the host are included in the payload.

| Field     | Type            | Description |
|-----------|-----------------|-------------|
| volume    | integer/null    | Current system master volume, 0–100. `null` if unavailable. |
| muted     | boolean/null    | Whether system audio is currently muted. `null` if unavailable. |
| playback  | string/null     | Current media playback state. One of `"playing"`, `"paused"`, `"stopped"`. `null` if no controllable media session exists or the state is unavailable. |

### Notes

- The host SHOULD NOT send this message type unsolicited
- A field whose value cannot be determined MUST be reported as `null` rather than omitted

---

## system-control.v1.error

Sent by the host when the query cannot be fulfilled. The `correlationId` in the envelope MUST be set to the `id` of the originating query envelope.

```json
{
  "type": "system-control.v1.error",
  "payload": {
    "reason": "colink:system-control.query_failed.v1",
    "message": "Failed to read system state",
    "details": {}
  }
}
```

| Field   | Type        | Description |
|---------|-------------|-------------|
| reason  | string      | Machine-readable reason code. See [Error Reasons](#error-reasons). |
| message | string      | Human-readable description for logging and debugging. MUST NOT expose internal stack traces or sensitive details. |
| details | object/null | Optional structured context. Receivers MUST ignore unknown keys. |

### Error Reasons

| Reason | Description |
|--------|-------------|
| `colink:system-control.query_failed.v1` | The host encountered an error reading one or more requested fields. |
| `colink:system-control.invalid_request.v1` | The query payload is malformed (e.g. `fields` is empty or missing). |
| `colink:system-control.generic.v1` | Fallback for unclassified query errors. |

### Notes

- The host SHOULD NOT send this message type unsolicited

## Version Compatibility

- `sleep`, `shutdown`, and `lock` require Business Protocol Version 1.5.0 or later. `play`, `pause`, `next`, `previous`, `set-volume`, and `mute` require Version 1.6.0 or later. `system-control.v1.query`, `system-control.v1.result`, and `system-control.v1.error` require Version 1.7.0 or later.
- Before sending a command, a controller MUST verify that the target's advertised `businessVersion` is valid, has the same major version, and is at least the version required by the selected action. If the version is missing, malformed, has a different major version, or is too old, the controller MUST NOT send the command.
- Before sending a query, a controller MUST verify that the target's advertised `businessVersion` is valid, has the same major version, and is at least 1.7.0. If the version requirement is not met, the controller MUST NOT send the query.
- A host that recognizes `system-control.v1.command` but does not recognize its `action` value MUST silently ignore the entire command. The presence of unknown fields MUST NOT cause that host to reject the command.
- A host supporting Version 1.6.0 or later MUST accept Version 1.5.0 power commands with `action` set to `sleep`, `shutdown`, or `lock` and with `volume` omitted.
- Hosts below Version 1.7.0 encounter `system-control.v1.query` as an unknown message type and silently ignore it per existing forward-compatibility rules. Controllers MUST NOT send a query to such hosts.
