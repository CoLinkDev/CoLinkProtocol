# LAN Membership

Cluster membership and failure detection for the local network.

## Architecture

```
┌─────────────────────────────────┐
│  Upper Layers (WebSocket, App)  │  ← reacts to SWIM state transitions
├─────────────────────────────────┤
│  SWIM (membership authority)    │  ← sole source of truth for node state
├─────────────────────────────────┤
│  mDNS/DNS-SD (address resolver) │  ← internal, not exposed upward
└─────────────────────────────────┘
```

- **SWIM** is the sole authority on whether a peer is alive, suspect, dead, or left.
- **mDNS** is an implementation detail used only for address resolution and initial peer discovery. It does not produce membership events visible to upper layers.
- Upper layers subscribe to SWIM state transitions (e.g. `memberJoined`, `memberLeft`) and act accordingly.

## Discovery (mDNS, Internal)

Address resolution using mDNS/DNS-SD. This layer is invisible to upper layers — it feeds addresses into SWIM, nothing more.

### Service

| Field        | Value                 |
|--------------|-----------------------|
| Service Type | `_colink._tcp.local.` |
| Port         | 27777 (default)       |

### TXT Records

| Key      | Value          | Description      |
|----------|----------------|------------------|
| deviceId | `660e8400-...` | Full device UUID |
| version  | `1`            | Protocol version |

### Behavior

1. Device starts → advertises `_colink._tcp.local.` with TXT records
2. Other devices browse for the same service type
3. On discovery → address is registered for SWIM to use (no upper-layer event emitted)
4. Re-advertise on network interface changes (WiFi reconnect, etc.)
5. Stop advertising when app is backgrounded (mobile)

No identity verification at this layer. No connection is initiated from discovery alone.

## State Management (SWIM)

Runs over HTTP on the existing peer server. Implements [SWIM](https://www.cs.cornell.edu/projects/Quicksilver/public_pdfs/SWIM.pdf) for membership management and failure detection.

### Transport

```
POST http://<ip>:<port>/peer/swim/v1
```

Request and response bodies are SWIM messages. No additional port or persistent connection required. All operations are blocking request-response — one probe round must complete before the next begins.

#### Validation (receiver side)

1. Request body > 16KB → reject
2. Any `incarnation` in gossip > receiver's UTC now + 5 minutes → reject that entry

### Parameters (Recommended Defaults)

| Parameter           | Value   | Note                                            |
|---------------------|---------|-------------------------------------------------|
| protocolPeriod      | 1000ms  | Next round starts only after previous completes |
| directPingTimeout   | 500ms   | Timeout for direct ping HTTP call               |
| indirectPingTimeout | 500ms   | Timeout for intermediary's ping to target       |
| pingReqFanout       | 2       | min(configured, members - 2)                    |
| suspectTimeout      | 5000ms  | Time before suspect becomes dead                |
| maxGossipPerMsg     | 10      | Older entries displaced by newer ones           |

These are recommended starting values. Implementations may adjust based on actual situation.

### Message Format

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

### Flow

- `ping`: POST to target. Target responds with `ack` in the HTTP response body.
- `ping-req`: POST to intermediary with `target` set. Intermediary POSTs a `ping` to target, waits for target's `ack`, then returns **target's original ack** (preserving target's `from` and `seq`) as the HTTP response to the caller.
- Probe round: one round = direct ping attempt + (on timeout) indirect ping-req via `pingReqFanout` intermediaries. Blocking — next round does not start until current round resolves.

### Direct Observation

Receiving a SWIM message from a peer is direct evidence that the peer is alive. This applies regardless of probe-round context:

- Receive `swim.ping` → treat `payload.from` as alive
- Receive `swim.ack` → treat `payload.from` as alive
- As a `ping-req` intermediary, receive target's `ack` → treat `ack.payload.from` as alive

Direct observation follows the same incarnation comparison rules — it cannot override a higher-incarnation state already recorded locally.

### State & Incarnation

#### States

| State   | Meaning                                              |
|---------|------------------------------------------------------|
| alive   | Node is responsive                                   |
| suspect | Node failed to respond, pending confirmation         |
| dead    | Confirmed failure (suspect timeout expired)          |
| left    | Node voluntarily exited (e.g. app went to background)|

#### Incarnation Rules

Incarnation is the node's own UTC millisecond timestamp at the moment it produces a state declaration. Only the node itself ever generates a new incarnation value — other nodes merely relay the last known value when reporting suspect/dead.

**Comparison:**
- Higher incarnation always overrides lower incarnation, regardless of state.
- Same incarnation priority: dead > suspect > alive.
- `left` is only accepted from the node itself (self-declared). Third-party `left` claims are ignored.
- `left` at incarnation N cannot be overridden by suspect/dead at incarnation N.
- Any state at incarnation N+1 overrides any state at incarnation N.

**Refutation:** When a node receives gossip marking itself as `suspect`, it broadcasts `alive` with `incarnation = utcNowMillis` (guaranteed higher), refuting the suspicion.

**Suspect/dead propagation:** When node A suspects node B, A gossips `{deviceId: "B", state: "suspect", incarnation: <B's last known incarnation>}`. A does not generate a new incarnation for B — it reuses whatever value B last declared.

**Tombstone:** Nodes in `dead` or `left` state are retained in the membership table for at least 5 minutes. During this period, gossip with lower or equal incarnation for that node is rejected. This prevents stale gossip from resurrecting removed nodes.

### Gossip

Gossip propagates state changes to nodes that did not directly observe them. It is not the only mechanism for confirming liveness — direct observation (above) is equally authoritative.

#### Priority

When the gossip queue exceeds `maxGossipPerMsg`, entries are selected by priority:
1. Self refutation (own alive with incremented incarnation)
2. Everything else in FIFO order

Excess entries are naturally displaced as newer gossip arrives.

#### Address Resolution

Gossip entries carry only `deviceId`, `state`, and `incarnation` — never IP addresses. Node addresses are resolved via:
- mDNS discovery (internal layer)
- Source IP of incoming requests

This prevents stale IPs from polluting membership state.

### Bootstrap

New nodes join by sending a `ping` to any peer whose address was resolved via mDNS. The ping's gossip carries the new node's own entry: `{ deviceId, state: "alive", incarnation: <utcNowMillis> }`.

The receiver responds with `ack`. Upon receiving the ack, the new node marks the peer as `alive` in its local membership table. This `alive` transition is what triggers upper-layer actions (WebSocket connection setup, etc.).

Receivers that encounter an unknown `deviceId` transitioning to `alive` treat this as a **memberJoined** event.

A node re-joining after `dead` or `left` must use a higher incarnation than its previous value.

### Lifecycle: left

Before entering background mode, a node broadcasts `left` (with current incarnation) via gossip. Peers receiving `left`:
- Clean up WebSocket connections silently (no failure alert)
- Stop selecting this node as a ping target
- Retain tombstone per above rules

When the node returns to foreground, it re-joins with a higher incarnation (same bootstrap flow).

### Relationship to WebSocket

SWIM is the sole authority on membership state. WebSocket manages connection-level liveness.

| Scenario                        | Action                                      |
|---------------------------------|---------------------------------------------|
| SWIM: dead/left, WS: connected  | Clean up WS connection                      |
| SWIM: alive, WS: disconnected   | Reconnect WS only, membership unchanged     |
| WS: active, SWIM ping: failing  | SWIM proceeds normally — WS liveness does not override SWIM |

SWIM and WebSocket keepalive (see `websocket.md`) are orthogonal. WS activity is not used as alive evidence for membership decisions.

#### Connection Direction

When both peers reach `alive` state, the peer with the smaller `deviceId` (lexicographic comparison) initiates the WebSocket connection. The other peer only accepts incoming connections. This prevents duplicate connections from both sides connecting simultaneously.
