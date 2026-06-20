# System Info Push

Push system resource usage from a source device to receivers.

## Overview

A source device periodically samples CPU, memory, and GPU usage and pushes the current values to each alive receiver at a fixed interval.

- Source samples and pushes at a fixed interval (recommended: 3000ms)
- Source tracks receiver liveness per receiver. A receiver is alive only while its own `sysinfo.v1.alive` heartbeat remains within the timeout window.

## Message Types

| Type                | Direction         | Description                          |
|---------------------|-------------------|--------------------------------------|
| `sysinfo.v1.stats`  | source → receiver | Current resource usage snapshot      |
| `sysinfo.v1.alive`  | receiver → source | Receiver presence heartbeat          |

---

## sysinfo.v1.stats

Sent at the fixed push interval while the receiver is alive.

```json
{
  "type": "sysinfo.v1.stats",
  "payload": {
    "cpu": 85.5,
    "mem": 72.3,
    "gpu": 90.1,
    "net_up": 1048576,
    "net_down": 5242880,
    "disk_read": 10485760,
    "disk_write": 2097152
  }
}
```

| Field      | Type         | Description                                                      |
|------------|--------------|------------------------------------------------------------------|
| cpu        | number       | CPU usage percentage (0–100)                                     |
| mem        | number       | Memory usage percentage (0–100)                                  |
| gpu        | number/null  | GPU usage percentage (0–100). `null` if unavailable.             |
| net_up     | number/null  | Total network upload rate in bytes/s. `null` if unavailable.     |
| net_down   | number/null  | Total network download rate in bytes/s. `null` if unavailable.   |
| disk_read  | number/null  | Total disk read rate in bytes/s. `null` if unavailable.          |
| disk_write | number/null  | Total disk write rate in bytes/s. `null` if unavailable.         |

---

## sysinfo.v1.alive

Sent periodically by receivers to indicate they are still interested in receiving system info data.

```json
{
  "type": "sysinfo.v1.alive",
  "payload": {}
}
```

No payload fields required.

### Notes

- Receivers SHOULD send at a fixed interval (recommended: 5s)
- Source SHOULD stop pushing data to a receiver if no `alive` message is received from that receiver within a timeout period (recommended: 15s)
- Source SHOULD resume fixed-interval pushes to a receiver when a new `alive` message arrives from that receiver
