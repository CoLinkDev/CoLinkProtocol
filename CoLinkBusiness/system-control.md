# System Control

Send a system control command from a controller device to a host device.

## Overview

A controller device sends a one-way command to request the host device to perform a system-level action. The host executes the action immediately upon receipt. No response message is defined; confirmation is the responsibility of the application layer.

- Commands are fire-and-forget: the controller MUST NOT expect a reply
- The host MUST execute the requested action without delay upon receipt
- Whether to prompt the user for confirmation before sending is an application-layer concern

## Message Types

| Type                        | Direction            | Description                    |
|-----------------------------|----------------------|--------------------------------|
| `system-control.v1.command` | controller → host    | Request a system-level action  |

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
