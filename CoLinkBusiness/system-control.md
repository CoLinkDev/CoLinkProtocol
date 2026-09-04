# System Control

Send a system control command from a controller device to a host device, or query the host's current system state.

## Overview

A controller device sends a command to request the host device to perform a system-level action. The host executes the action upon receipt, after the delay specified in the command (default: immediately). When both peers advertise Business Protocol Version 1.17.0 or later, the host acknowledges each command with a `system-control.v1.ack` (or a `system-control.v1.error` if the command cannot be fulfilled).

A controller may also query the host's current system state using a request-response pair. The host replies with the requested field values, or an error if the query cannot be fulfilled.

- The host MUST execute the requested action after the delay specified in the command (default: immediately)
- Whether to prompt the user for confirmation before sending is an application-layer concern
- Commands and queries use `correlationId` to associate the acknowledgement or error with the originating command, and the result or error with the originating query

## Message Types

| Type                        | Direction            | Description                          |
|-----------------------------|----------------------|--------------------------------------|
| `system-control.v1.command` | controller → host    | Request a system-level action        |
| `system-control.v1.ack`     | host → controller    | Acknowledge a command was accepted (Business version 1.17.0+) |
| `system-control.v1.query`   | controller → host    | Query current system state fields    |
| `system-control.v1.result`  | host → controller    | Return queried field values          |
| `system-control.v1.error`   | host → controller    | Report a query or command failure    |

---

## system-control.v1.command

```json
{
  "type": "system-control.v1.command",
  "payload": {
    "action": "sleep",
    "delay": null,
    "volume": null,
    "targetMac": null
  }
}
```

| Field     | Type           | Description          |
|-----------|----------------|----------------------|
| action    | string         | The action to perform. See [Actions](#actions). |
| delay     | integer / null | Seconds to wait before executing the action. MUST be `null` or omitted for all actions except `sleep`, `shutdown`, `lock`, `display-off`, and `display-on`. For those actions, MUST be a non-negative integer when present; `null` or omitted means execute immediately (equivalent to `0`). |
| volume    | integer / null | Required when `action` is `set-volume` (0–100 inclusive). MUST be `null` or omitted for all other actions. |
| targetMac | string / null  | Required when `action` is `wake-on-lan`. MUST be `null` or omitted for all other actions. Format: `XX:XX:XX:XX:XX:XX` (hexadecimal, case-insensitive). |

### Actions

| Value          | Description                                              |
|----------------|----------------------------------------------------------|
| `sleep`        | Suspend the host to sleep / low-power state              |
| `shutdown`     | Power off the host                                       |
| `lock`         | Lock the host screen / user session                      |
| `cancel-power` | Cancel a pending delayed `sleep`, `shutdown`, `lock`, `display-off`, or `display-on` action. If no such action is pending, the host MUST silently ignore this command. |
| `play`         | Resume media playback on the host                        |
| `pause`        | Pause media playback on the host                         |
| `next`         | Skip to the next track                                   |
| `previous`     | Return to the previous track                             |
| `set-volume`   | Set the system volume. `volume` MUST be present and in the range 0–100. |
| `mute`         | Mute system audio.                                       |
| `wake-on-lan`  | Send a Wake-on-LAN magic packet to the device identified by `targetMac`. The receiving device acts as a proxy and broadcasts the magic packet (UDP port 9) to its local network. `targetMac` MUST be present. |
| `display-off`  | Turn off the host's display(s) / enter display sleep mode |
| `display-on`   | Wake the host's display(s) from sleep mode               |

### Notes

- The host MUST silently ignore `system-control.v1.command` messages with an unrecognized `action` value to allow forward-compatible extension; an ignored command MUST NOT produce an `ack` or `error`
- The host SHOULD NOT send this message type; the direction is controller → host only
- Media playback actions (`play`, `pause`, `next`, `previous`) are best-effort: the host SHOULD execute them against the active system media session where available and MUST silently ignore the command if no controllable session exists
- For `wake-on-lan`: the host MUST silently ignore the command if `targetMac` is absent, `null`, or does not match the format `XX:XX:XX:XX:XX:XX`
- For `delay`: the host MUST silently ignore the `delay` field when `action` is not `sleep`, `shutdown`, `lock`, `display-off`, or `display-on`. If `delay` is a negative integer, the host MUST treat it as `0`. Only one power or display action with a delay may be pending at a time; a new delayed command MUST replace any existing pending one.
- For `cancel-power`: cancels the most recently scheduled delayed power action, if any. The host MUST silently ignore this command if no delayed action is pending.
- Display actions (`display-off`, `display-on`) are best-effort: the host SHOULD execute them using platform-specific APIs and MUST silently ignore the command if display control is unavailable on the current platform
- `display-off` puts the display(s) into a low-power sleep state; the exact behavior is platform-dependent (may turn off backlight, enter DPMS standby, etc.)
- `display-on` wakes the display(s) from sleep; on some platforms this may require simulating user activity
- When both peers advertise Business Protocol Version 1.17.0 or later, the host MUST acknowledge a recognized command as specified in [system-control.v1.ack](#system-controlv1ack); when either peer is below 1.17.0, the host MUST NOT send an `ack`
- Display actions accept the optional `delay` parameter but do not accept `volume` or `targetMac`; the host MUST silently ignore `volume` and `targetMac` when `action` is `display-off` or `display-on`

---

## system-control.v1.ack

Sent by the host to acknowledge a received `system-control.v1.command`. Introduced in Business Protocol Version 1.17.0. The `correlationId` in the envelope MUST be set to the `id` of the originating command envelope.

```json
{
  "type": "system-control.v1.ack",
  "payload": {}
}
```

The presence of the `ack` message itself indicates that the command was accepted and processed (either executed immediately or scheduled for delayed execution).

### Ack Semantics

- The `ack` acknowledges receipt, validation, and acceptance of the command. It does NOT confirm that the action succeeded, was observed by the user, or will complete.
- A command that cannot be accepted MUST be answered with a `system-control.v1.error` instead of an `ack` (see [Error Reasons](#error-reasons)).
- For immediate actions (`delay` `null`, omitted, or `0`):
  - If the required capability is available and the action executes successfully, the host MUST send `ack`.
  - If the required capability is unavailable (e.g. no controllable media session, display control not supported on this platform), the host MUST send `error` with reason `command_rejected`.
  - If the capability is available but execution fails due to a runtime error (e.g. API call exception, permission denied), the host MUST send `error` with reason `command_failed`.
- For delayed actions (`delay` ≥ 1):
  - If the platform supports the action and scheduling succeeds, the host MUST send `ack`. The host MUST NOT send any further message when the scheduled action later executes or fails.
  - If the platform does not support the action (e.g. system does not support suspend, display control unavailable), the host MUST send `error` with reason `command_rejected`.
  - If the platform supports the action but cannot schedule it due to a runtime error (e.g. timer service unavailable, insufficient resources), the host MUST send `error` with reason `command_failed`.

### Notes

- The host MUST send an `ack` for every recognized command when both peers advertise Business Protocol Version 1.17.0 or later, and MUST NOT send one when either peer is below 1.17.0
- The host MUST NOT send an `ack` for a command it silently ignores (e.g. unrecognized `action` value, malformed `targetMac`, `cancel-power` with nothing pending)
- The controller MUST treat the `ack` as best-effort and MUST NOT rely on its arrival. The controller MUST NOT automatically retransmit a command due to a missing `ack`.
- For delayed actions, the `ack` confirms scheduling only. The host provides no feedback about the eventual execution outcome.

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

| Value           | Description |
|-----------------|-------------|
| `volume`        | Current system master volume (0–100) |
| `muted`         | Whether system audio is muted |
| `playback`      | Current media playback state |
| `pending-power` | The currently pending delayed power action, if any |

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
    "playback": "playing",
    "pending-power": {
      "action": "shutdown",
      "remainingMs": 42000
    }
  }
}
```

Only fields that were both requested and recognized by the host are included in the payload.

| Field           | Type         | Description |
|-----------------|--------------|-------------|
| volume          | integer/null | Current system master volume, 0–100. `null` if unavailable. |
| muted           | boolean/null | Whether system audio is currently muted. `null` if unavailable. |
| playback        | string/null  | Current media playback state. One of `"playing"`, `"paused"`, `"stopped"`. `null` if no controllable media session exists or the state is unavailable. |
| pending-power   | object/null  | The currently pending delayed power action. `null` if no delayed power action is pending. See [Pending Power Object](#pending-power-object). |

### Pending Power Object

| Field        | Type    | Description |
|--------------|---------|-------------|
| action       | string  | The pending action. One of `"sleep"`, `"shutdown"`, `"lock"`, `"display-off"`, `"display-on"`. |
| remainingMs  | integer | Milliseconds remaining until the action executes, calculated at the moment the host processes the query. Minimum value is `0` (action is imminent). |

### Notes

- The host SHOULD NOT send this message type unsolicited
- A field whose value cannot be determined MUST be reported as `null` rather than omitted
- `remainingMs` is computed as `scheduledTime + delayMs − now`, clamped to a minimum of `0`. If the action executes between the host computing and sending the result, the host SHOULD return `null` for `pending-power`

---

## system-control.v1.error

Sent by the host when a query or a command (Version 1.17.0+) cannot be fulfilled. The `correlationId` in the envelope MUST be set to the `id` of the originating query or command envelope.

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
| `colink:system-control.query_failed.v1` | The host encountered an error reading one or more requested fields (query only). |
| `colink:system-control.invalid_request.v1` | The query or command payload is malformed (e.g. `fields` is empty or missing in a query). |
| `colink:system-control.command_rejected.v1` | The host cannot fulfill the command because the required platform capability is unavailable, hardware is not present, or preconditions are not met. Examples: no media session for playback control, display control not supported, system does not support suspend/hibernate. |
| `colink:system-control.command_failed.v1` | The host has the required capability but encountered a runtime error when attempting to execute or schedule the command. Examples: API call exception, permission denied, scheduling service unavailable. Only sent for immediate actions or scheduling failures; delayed actions that fail during later execution produce no additional message. |
| `colink:system-control.generic.v1` | Fallback for unclassified errors. |

### Notes

- The host SHOULD NOT send this message type unsolicited
- In response to a command, the host MUST send exactly one of `system-control.v1.ack` or `system-control.v1.error` when both peers are at Version 1.17.0 or later; it MUST NOT send both
- The host MUST NOT send an `error` for a command it silently ignores (e.g. unrecognized `action` value)
- For delayed actions that were acknowledged with an `ack`, no subsequent message is sent regardless of execution outcome
- `command_failed`/`command_rejected` are introduced in Version 1.17.0. Hosts below 1.17.0 use neither, and a controller that receives an `error` carrying an unrecognized reason code MUST treat it as a generic failure per the standard reason-format rules

## Version Compatibility

- `sleep`, `shutdown`, and `lock` require Business Protocol Version 1.5.0 or later. `play`, `pause`, `next`, `previous`, `set-volume`, and `mute` require Version 1.6.0 or later. `system-control.v1.query`, `system-control.v1.result`, and `system-control.v1.error` require Version 1.7.0 or later. `wake-on-lan` requires Version 1.8.0 or later. `delay` (on `sleep`, `shutdown`, `lock`) and `cancel-power` require Version 1.11.0 or later. `display-off`, `display-on`, and `delay` on either display action require Version 1.16.0 or later. `system-control.v1.ack` and the command-failure reasons (`command_failed`, `command_rejected`) require Version 1.17.0 or later.
- Before sending a command, a controller MUST verify that the target's advertised `businessVersion` is valid, has the same major version, and is at least the version required by the selected action. If the version is missing, malformed, has a different major version, or is too old, the controller MUST NOT send the command.
- Before sending a query, a controller MUST verify that the target's advertised `businessVersion` is valid, has the same major version, and is at least 1.7.0. If the version requirement is not met, the controller MUST NOT send the query.
- A host that recognizes `system-control.v1.command` but does not recognize its `action` value MUST silently ignore the entire command. The presence of unknown fields MUST NOT cause that host to reject the command.
- A host supporting Version 1.6.0 or later MUST accept Version 1.5.0 power commands with `action` set to `sleep`, `shutdown`, or `lock` and with `volume` omitted.
- Hosts below Version 1.7.0 encounter `system-control.v1.query` as an unknown message type and silently ignore it per existing forward-compatibility rules. Controllers MUST NOT send a query to such hosts.
- Hosts below Version 1.8.0 encounter `wake-on-lan` as an unknown action value and silently ignore the command per existing forward-compatibility rules. Controllers MUST NOT send a `wake-on-lan` command to such hosts.
- Hosts below Version 1.11.0 encounter `cancel-power` as an unknown action value and silently ignore the command. They also silently ignore the `delay` field in power commands per existing unknown-field rules. Controllers MUST NOT use `delay` or send `cancel-power` to hosts below Version 1.11.0.
- The `pending-power` query field requires Version 1.12.0 or later. Hosts below Version 1.12.0 silently ignore the unrecognized field name per existing forward-compatibility rules and return a result without it. Controllers MUST NOT rely on `pending-power` from hosts below Version 1.12.0.
- Hosts below Version 1.16.0 encounter `display-off` and `display-on` as unknown action values and silently ignore the command per existing forward-compatibility rules. Controllers MUST NOT send `display-off` or `display-on` commands, with or without `delay`, to hosts below Version 1.16.0.
- Version 1.17.0 hosts continue to execute commands sent by older controllers. When either peer is below Version 1.17.0, the host MUST NOT send an `ack` for a command and the interaction reverts to the legacy fire-and-forget behavior of previous versions.
- Hosts below Version 1.17.0 encounter `system-control.v1.ack` as an unknown message type and silently ignore it per existing forward-compatibility rules. Controllers MUST NOT rely on receiving an `ack` from such hosts; a controller that sends a command without an `ack` expectation MUST NOT interpret the later absence of an `ack` as a failure.
