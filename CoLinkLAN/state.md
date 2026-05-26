# State Management

Cluster membership and failure detection using [SWIM](https://www.cs.cornell.edu/projects/Quicksilver/public_pdfs/SWIM.pdf). Runs over HTTP on the existing peer server.

## Transport

```
POST http://<ip>:27777/peer/swim
```

Request and response bodies are SWIM messages. No additional port or persistent connection required.

## Parameters

| Parameter         | Value   |
|-------------------|---------|
| protocolPeriod    | 1000ms  |
| pingTimeout       | 500ms   |
| pingReqFanout     | 2       |
| suspectTimeout    | 5000ms  |
| maxGossipPerMsg   | 6       |

## Message Format

All messages use the standard `type` + `payload` envelope:

```json
{
  "type": "swim.ping",
  "payload": {
    "seq": 42,
    "from": "deviceId",
    "gossip": [
      { "deviceId": "...", "state": "alive | suspect | dead", "incarnation": 3 }
    ]
  }
}
```

Types: `swim.ping`, `swim.ack`, `swim.ping-req`.

`swim.ping-req` includes an additional `target` field in payload:

```json
{
  "type": "swim.ping-req",
  "payload": {
    "seq": 42,
    "from": "deviceId",
    "target": "deviceId-B",
    "gossip": []
  }
}
```

### Flow

- `ping`: POST to target, target responds with `ack` in the HTTP response body.
- `ping-req`: POST to intermediary with `target` set. Intermediary POSTs a `ping` to target, then returns the result as the HTTP response to the original caller.

## Bootstrap

SWIM does not handle initial discovery. New nodes join by sending a `join` gossip entry about themselves in their first ping to any peer discovered via mDNS (see `discovery.md`).

A node re-joining after being declared dead gets a fresh incarnation.

## Relationship to WebSocket

SWIM operates at cluster membership level. A node declared `dead` by SWIM should have its WebSocket connection cleaned up. SWIM and WebSocket keepalive (`connection.md`) are orthogonal — SWIM detects node-level failure, keepalive detects connection-level failure.

## Activation

Runs only in realtime mode (app in foreground). Background mode is defined separately.
