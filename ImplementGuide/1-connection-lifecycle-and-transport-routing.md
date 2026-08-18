# Connection Lifecycle & Transport Routing

This guide describes how a CoLink client combines the Cloud WebSocket, LAN discovery, trusted-peer connections, and transport-agnostic Business Protocol into one runtime. It defines client-local state, sequencing, and recovery behavior. It does not define a new wire format or change the requirements in the referenced protocol documents.

## Scope and Authority

This guide applies to the lifecycle after local device identity and trust are available. Identity creation, cloud registration, trust reconciliation, logout cleanup, and key rotation are defined by [Device Identity & Trust Lifecycle](0-device-identity-and-trust.md).

The following protocol documents remain authoritative:

- [Cloud WebSocket v1](../CoLinkServerRESTAPI/websocket/v1.md) defines cloud connection setup, liveness, presence events, relay, and broadcast behavior.
- [P2P WebSocket](../CoLinkP2P/websocket/README.md) defines direct-peer handshake and connection behavior.
- [LAN Membership](../CoLinkP2P/membership.md) defines discovery and SWIM membership state.
- [Business Protocol](../CoLinkBusiness/README.md) and each feature document define the delivery, cancellation, retry, and disconnect semantics of a business operation.

If this guide conflicts with any of those documents, the protocol document takes precedence.

## Terminology

| Term | Meaning |
|------|---------|
| Cloud connection | A client's authenticated WebSocket connection to the CoLink server. |
| LAN availability | A peer has a currently usable LAN endpoint and is in an eligible membership state. It does not imply a direct WebSocket is open. |
| Direct peer connection | An authenticated and negotiated P2P WebSocket session to one trusted peer. |
| Route | The transport selected for one outbound business operation: `lan`, `cloud`, or none. |
| Runtime presence | Online and reachability information derived from the current cloud and LAN runtimes. It is not durable device identity or trust state. |
| Lifecycle generation | A monotonically changing local token that makes callbacks and background work from a stopped or superseded connection manager harmless. |

## State Model

### Persistent State

The client persists only state that must survive process restart:

| State | Owner | Notes |
|-------|-------|-------|
| Local device identity | Identity store | Defined by the device identity guide. |
| Authenticated session | Session store | Tokens and their expiry metadata. |
| Trusted peer records | Trust store | Device ID, public key, key timestamp, LAN trust, and cloud trust. |
| Cached device catalog | Device store | A cache of reconciled device metadata, not an assertion of current presence. |
| Feature-specific durable work | Feature store | Only when the corresponding Business Protocol defines recovery semantics. |

An active WebSocket, authenticated LAN session, negotiated cipher state, ephemeral key material, pending heartbeat, cloud online flag, LAN endpoint, and active route are runtime-only. They are not restored as active after an application restart.

### Runtime State

The connection manager maintains the following independent state machines.

| Area | States | Notes |
|------|--------|-------|
| Client runtime | `stopped` -> `starting` -> `running` -> `stopping` | Only one active lifecycle generation may publish state. |
| Cloud | `offline`, `connecting`, `connected`, `reconnecting`, `authentication-invalid` | `connected` means the WebSocket is open, not that every peer is reachable. |
| LAN service | `stopped`, `discovering`, `available`, `unavailable` | Network loss stops discovery, membership probing, and direct-peer sessions. |
| LAN member | `unknown`, `alive`, `suspect`, `dead`, `left` | Defined by the membership protocol. |
| Per-peer direct session | `absent`, `connecting`, `ready`, `closing` | `ready` requires P2P authentication and business-session negotiation. |

The user-visible device object is a projection of persistent identity/trust and runtime presence. A transient `alive`, `connected`, or `ready` state does not become durable trust.

## Startup and Shutdown

### Startup

On application startup:

1. Load or create the local device identity before starting LAN or cloud work.
2. Start LAN services when the platform has an eligible network. Begin discovery and membership according to the P2P specifications.
3. Load the persisted session.
4. If no session exists, publish the local device and LAN-trusted peers only. Do not start cloud work.
5. If a session exists, validate or refresh it before cloud work. Re-register the local identity before requesting a Cloud WebSocket ticket.
6. Establish the Cloud WebSocket. Once it is open, synchronize any pending key update and fetch the cloud device list before treating cloud presence as current.
7. Reconcile the device list and publish the combined view.

Cloud startup failures are retryable unless authentication is known to be invalid. LAN startup failure does not prevent cloud operation, and cloud failure does not prevent LAN operation.

### Shutdown

On explicit shutdown, increment the lifecycle generation or cancel its equivalent before closing transports. Then:

1. Stop accepting new outbound work.
2. Close the Cloud WebSocket and direct LAN peer connections.
3. Stop discovery and membership work.
4. Release runtime-only sessions and signal feature owners that their transport is gone.
5. Clear runtime presence and active routes, while retaining persistent identity, trust, session, and feature state as appropriate.

Late callbacks from a previous generation do not change the current runtime state, reconnect a transport, or publish stale presence.

## Cloud Connection Lifecycle

### Connection Sequence

Each cloud connection attempt uses the current valid session and current local identity:

1. Re-register the local device identity with `POST /api/v1/devices`.
2. Request a fresh WebSocket ticket.
3. Connect using the current Business and Cloud WebSocket protocol versions.
4. Mark the cloud runtime connected only after the WebSocket opens.
5. Synchronize a pending key update when needed, then fetch and reconcile the cloud device list.
6. Start the cloud liveness and periodic device synchronization tasks.

Registration and ticket acquisition are repeated for a new connection attempt. A ticket is not reused after a failed or closed WebSocket.

### Healthy Connection Work

While connected:

- Send application `ping` at the interval specified by the Cloud WebSocket protocol and respond to WebSocket control `Ping` frames with `Pong`.
- Re-register the current local identity and refresh the cloud device list periodically. The recommended interval is approximately five minutes; a platform can use a shorter interval when its power and network constraints permit.
- Serialize device-list refreshes with device mutations and other refreshes so an older response does not overwrite a newer reconciliation result.
- Read the identity from authoritative local storage for a periodic re-registration, so a locally rotated key or renamed device is not replaced by an identity captured when the connection first opened.

The periodic task is a consistency mechanism. It does not replace immediate synchronization after login, reconnection, local rename, local key rotation, or an explicit user refresh.

### Disconnect and Reconnect

When the Cloud WebSocket closes or its liveness fails:

1. Mark cloud runtime presence unavailable and clear cloud-derived online state.
2. Keep the authenticated session and cloud trust unless authentication is invalid.
3. Stop connection-scoped ping and periodic-sync tasks.
4. Retry with bounded backoff while a valid session remains and the lifecycle generation is current.
5. Before every retry, repeat identity registration and ticket acquisition.

The server does not provide an offline message queue for relay or broadcast delivery. A client does not report an operation as delivered merely because it was queued locally or because a retry has been scheduled. Feature-specific retry behavior is governed by the applicable Business Protocol document.

### Authentication Invalidity

On logout, token expiry that cannot be refreshed, server-side session revocation, or an equivalent authentication failure:

1. Stop the cloud connection and cancel its reconnect work.
2. Clear session credentials.
3. Clear cloud trust, cloud-only device records, cached cloud catalog, cloud presence, and cloud business-version metadata.
4. Rebuild the device view from local identity and LAN trust only.

The local identity and LAN trust survive. This is the same cleanup contract defined by the device identity guide and applies to explicit and implicit authentication loss alike.

## LAN Lifecycle

### Discovery and Membership

LAN discovery and membership are independent of the Cloud WebSocket. When the LAN service is active:

- A discovered peer becomes LAN-reachable only according to the membership protocol's current state and endpoint information.
- `alive` and `suspect` are runtime reachability signals. They do not establish trust and do not authorize business communication by themselves.
- A direct peer connection is created on demand for a trusted peer when an operation needs it. Discovery alone does not eagerly open direct WebSockets.
- An unknown LAN peer can be exposed as a pairing candidate. A cloud-trusted peer is already trusted and is not offered as a separate pairing candidate.

On loss of the eligible LAN network, stop discovery and membership probing, disconnect all direct LAN sessions, and remove LAN endpoint and reachability state. Do not clear LAN trust solely because the network disappeared.

### Direct Peer Connection

Before sending a business operation over LAN:

1. Confirm that the target is trusted through either LAN or cloud trust.
2. Confirm a currently usable LAN endpoint and membership state.
3. Establish a P2P WebSocket only if no ready session exists.
4. Complete the protocol hello, authentication or pairing, business-version exchange, key exchange when applicable, and cipher negotiation required by the P2P protocol.
5. Mark the direct session ready only after those protocol phases succeed.

A transient connection failure, timeout, or membership transition does not delete a trust record. A verified public-key mismatch is different: reject the connection, clear LAN trust for that peer, and require pairing again as defined by the device identity guide.

Key rotation of the local identity invalidates the local LAN runtime: it closes direct sessions, discards active negotiated state and pair-string state bound to the old key, and restarts LAN advertisement/discovery with the new public key. Remote peers then detect the changed key on their next authenticated encounter.

## Route Selection

### Selecting a Route

Route selection occurs for an individual operation, not as a permanent property of a device:

| Condition | Selected route |
|-----------|----------------|
| Target is trusted, LAN-reachable, and a direct session can be established | `lan` |
| LAN is unavailable or no usable direct session can be established, and the target is cloud-online | `cloud` |
| Neither route is available | Fail as unreachable/offline according to the feature contract |

The route shown in a device list reflects current reachability or an active connection. It is not persisted as trust or reused after a restart without re-evaluation.

### Fallback Rules

The route manager does not invent transparent fallback or retry behavior that changes a feature's delivery semantics.

- An operation that has not been sent may choose cloud when LAN is unavailable.
- Once an operation has been sent on a route, its completion, retry, cancellation, duplicate prevention, and fallback behavior are defined by its Business Protocol document.
- In particular, the File Transfer v2 protocol requires cancellation rather than automatic LAN-to-relay fallback after a failed dedicated LAN data-connection attempt.
- A transport failure must be reported to the feature owner with the selected route and failure class so that the feature can apply its protocol-defined behavior.

This prevents a client from delivering duplicate commands or silently changing the semantics of a file, terminal, camera, or other stateful operation.

### Concurrent Route Changes

A runtime can observe LAN and cloud state changes while an operation is connecting or sending. A send attempt is typically bound to one route-generation and one connection/session generation. If either becomes stale before sending, the attempt is cancelled or restarted according to the feature contract rather than writing to a newly selected transport without revalidation.

Existing P2P, terminal, camera, and transfer sessions are not migrated between LAN and cloud merely because the preferred route changes. Their respective protocols determine whether they close, continue, or require a new operation.

## Presence and Device View

Cloud and LAN presence are independently maintained:

| Signal | Meaning | Clearing event |
|--------|---------|----------------|
| Cloud online | The server reports the device has an active cloud connection. | `device.offline`, cloud disconnect, authenticated-state loss, or newer device snapshot. |
| LAN available | Membership and endpoint data indicate local reachability. | Membership loss, endpoint loss, LAN stop, or network change. |
| Direct session ready | A negotiated P2P session is usable now. | Session close, authentication failure, LAN stop, or local key rotation. |

The merged device list overlays these signals on the durable device and trust records. A device can be trusted while offline, cloud-online while LAN-unavailable, or LAN-available while cloud-offline. UI wording and actions preserve those distinctions.

`device.online` and `device.offline` are cloud presence events, not a substitute for LAN membership. Conversely, SWIM state does not override cloud presence. When a feature protocol says that a cloud `device.offline` event is equivalent to its controller disconnecting, the feature owner applies that rule even though the local Cloud WebSocket remains connected.

## Concurrency and Error Handling

Implementations can use these ownership rules:

- One component owns Cloud WebSocket creation, closure, reconnect, ping, and periodic synchronization.
- One component owns LAN discovery, membership, and direct-peer lifecycle.
- Device catalog reconciliation is serialized; route and presence updates may update runtime overlays without replacing durable device metadata.
- Identity and trust writes are atomic from the application's perspective. A failed key rotation or cloud registration leaves a recoverable pending-sync state rather than a partially applied identity.
- Cancellation is normal during shutdown, logout, network changes, and superseding reconnect attempts. It is distinguished from protocol failure in logs and user-visible errors.
- Unknown protocol messages and non-fatal protocol-state errors are handled as required by the protocol documents; they do not by themselves trigger a connection-manager restart.

Logs can identify the lifecycle generation, transport, peer device ID (safely truncated where appropriate), route, and structured failure reason. Logs do not contain access tokens, private keys, session keys, pairing tokens, or plaintext encrypted payloads.
