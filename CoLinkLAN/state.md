# State Management

Cluster membership and failure detection using [SWIM](https://www.cs.cornell.edu/projects/Quicksilver/public_pdfs/SWIM.pdf). Runs over HTTP on the existing peer server.

## Transport & Security

```
POST http://<ip>:<port>/peer/swim
```

Request and response bodies are SWIM messages. No additional port or persistent connection required. All operations are blocking request-response — one probe round must complete before the next begins.

### Request Signing

Every request includes authentication headers:

```
POST /peer/swim
Content-Type: application/json
X-Device-Id: <sender's deviceId>
X-Timestamp: <utcNowMillis>
X-Signature: base64(sign(body + timestamp, senderPrivateKey))
```

### Validation (receiver side)

1. `X-Device-Id` not in local known device list → reject
2. Verify signature using sender's public key → fail → reject
3. `X-Timestamp` drift > 30s from local UTC → reject
4. Request body > 16KB → reject
5. Any `incarnation` in gossip > receiver's UTC now + 5 minutes → reject that entry

## Parameters (Recommended Defaults)

| Parameter         | Value   | Note                         |
|-------------------|---------|------------------------------|
| protocolPeriod    | 1000ms  | Next round starts only after previous completes |
| directPingTimeout | 500ms   | Timeout for direct ping HTTP call |
| indirectPingTimeout | 500ms | Timeout for intermediary's ping to target |
| pingReqFanout     | 2       | min(configured, members - 2) |
| suspectTimeout    | 5000ms  | Time before suspect becomes dead |
| maxGossipPerMsg   | 10       | Older entries displaced by newer ones |

These are recommended starting values. Implementations may adjust based on actual situation.

## Message Format

All messages use the standard `type` + `payload` envelope:

```json
{
  "type": "swim.ping",
  "payload": {
    "seq": 42,
    "from": "deviceId",
    "gossip": [
      { "deviceId": "...", "state": "alive | suspect | dead | left", "incarnation": 1748352000000 }
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

## Flow

- `ping`: POST to target. Target responds with `ack` in the HTTP response body.
- `ping-req`: POST to intermediary with `target` set. Intermediary POSTs a `ping` to target, waits for target's `ack`, then returns **target's original ack** (preserving target's `from` and `seq`) as the HTTP response to the caller.
- Probe round: one round = direct ping attempt + (on timeout) indirect ping-req via `pingReqFanout` intermediaries. Blocking — next round does not start until current round resolves.

## State & Incarnation

### States

| State   | Meaning |
|---------|---------|
| alive   | Node is responsive |
| suspect | Node failed to respond, pending confirmation |
| dead    | Confirmed failure (suspect timeout expired) |
| left    | Node voluntarily exited (e.g. app went to background) |

### Incarnation Rules

Incarnation is the node's own UTC millisecond timestamp (`System.currentTimeMillis()` / `Date.now()`) at the moment it produces a state declaration. Only the node itself ever generates a new incarnation value — other nodes merely relay the last known value when reporting suspect/dead.

**Comparison:**
- Higher incarnation always overrides lower incarnation, regardless of state.
- Same incarnation priority: dead > suspect > alive.
- `left` is only accepted from the node itself (self-declared). Third-party `left` claims are ignored.
- `left` at incarnation N cannot be overridden by suspect/dead at incarnation N.
- Any state at incarnation N+1 overrides any state at incarnation N.

**Refutation:** When a node receives gossip marking itself as `suspect`, it broadcasts `alive` with `incarnation = utcNowMillis` (guaranteed higher), refuting the suspicion.

**Suspect/dead propagation:** When node A suspects node B, A gossips `{deviceId: "B", state: "suspect", incarnation: <B's last known incarnation>}`. A does not generate a new incarnation for B — it reuses whatever value B last declared.

### Tombstone

Nodes in `dead` or `left` state are retained in the membership table for at least 5 minutes. During this period, gossip with lower or equal incarnation for that node is rejected. This prevents stale gossip from resurrecting removed nodes.

## Gossip

### Priority

When the gossip queue exceeds `maxGossipPerMsg`, entries are selected by priority:
1. Self refutation (own alive with incremented incarnation)
2. Everything else in FIFO order

Excess entries are naturally displaced as newer gossip arrives.

### Address Resolution

Gossip entries carry only `deviceId`, `state`, and `incarnation` — never IP addresses. Node addresses are resolved via:
- mDNS discovery
- Source IP of incoming requests

This prevents stale IPs from polluting membership state.

## Bootstrap

New nodes join by sending a `ping` to any peer discovered via mDNS (see `discovery.md`). The ping's gossip carries the new node's own entry: `{ deviceId, state: "alive", incarnation: <utcNowMillis> }`.

Receivers that encounter an unknown `deviceId` transitioning to `alive` treat this as a **memberJoined** event (triggering WebSocket connection setup, etc.).

A node re-joining after `dead` or `left` must use a higher incarnation than its previous value.

## Lifecycle: left

Before entering background mode, a node broadcasts `left` (with current incarnation) via gossip. Peers receiving `left`:
- Clean up WebSocket connections silently (no failure alert)
- Stop selecting this node as a ping target
- Retain tombstone per above rules

When the node returns to foreground, it re-joins with a higher incarnation (same bootstrap flow).

## Relationship to WebSocket

SWIM is the sole authority on membership state. WebSocket manages connection-level liveness.

| Scenario | Action |
|----------|--------|
| SWIM: dead/left, WS: connected | Clean up WS connection |
| SWIM: alive, WS: disconnected | Reconnect WS only, membership unchanged |
| WS: active, SWIM ping: failing | SWIM proceeds normally — WS liveness does not override SWIM |

SWIM and WebSocket keepalive (`connection.md`) are orthogonal. WS activity is not used as alive evidence for membership decisions.
