# Implementation Guide — Device Identity & Trust Lifecycle

This guide describes how clients should implement device identity management, cloud synchronization, trust state, and device list reconciliation. It serves as the authoritative reference for all client implementations (Desktop, Android, iOS, etc.).

## Terminology

| Term | Definition |
|------|-----------|
| Device Identity | A locally-generated profile that uniquely identifies a device, including its cryptographic key pair and metadata. See [Section 1](#1-device-identity-generation) for full details. |
| Trust Record | A locally-stored record representing a known remote peer and the basis on which it is trusted. See [Section 4](#4-trust-state) for schema. |
| Cloud Sync | The bidirectional process of pushing local device identity to the server and pulling the account's device list from the server. |
| LAN Pairing | The process of establishing mutual trust between two devices via LAN handshake with user-confirmed pairing code. See [CoLinkLAN/websocket/pairing.md](../CoLinkLAN/websocket/pairing.md) for protocol details. |
| Device List | The merged, deduplicated list of all known devices presented to the user, combining multiple sources. |

## 1. Device Identity Generation

### When

On first app launch — specifically, when no persisted device identity is found in local storage.

### What to Generate

A device identity consists of:

| Component | Source | Mutability |
|-----------|--------|-----------|
| Unique device identifier | Random UUID v4 | Immutable — never changes once generated |
| Display name | System hostname or device model | Mutable — user can rename |
| Platform type | OS detection (`windows`, `macos`, `linux`, `android`, `ios`) | Immutable |
| Ed25519 key pair | Cryptographic generation | Mutable — only via explicit key rotation |

### Rules

- Generate exactly once. On subsequent launches, load from persistent storage.
- The device identifier is the universal key for this device across all subsystems. It should not change across app reinstalls on the same logical device (where possible).
- The private key should be stored securely (platform keystore, encrypted storage, etc.).
- No network call is made during identity generation. This is a purely local operation.

## 2. Cloud Identity Synchronization

Cloud sync refers to registering the local device's identity with the server via `POST /api/v1/devices`. See [CoLinkServerRESTAPI/devices/register.md](../CoLinkServerRESTAPI/devices/register.md) for the endpoint specification.

### Prerequisites

- A valid cloud session (user is logged in with access token).

### When to Sync

Identity is pushed to the server at these points:

| Trigger | Description |
|---------|-------------|
| Login / Registration | Immediately after successful authentication, before any other cloud operation |
| App Startup (bootstrap) | If a persisted session exists, re-register identity during initialization |
| WebSocket (re)connection | Before each WebSocket connection attempt, push identity to ensure server has current data |
| Every 5 minutes (recommended) | While the cloud WebSocket is connected and healthy, periodically re-push identity |

The periodic sync ensures the server always has up-to-date device metadata (name changes, etc.) even if no reconnection event occurs. The recommended interval is 5 minutes; implementations may adjust based on platform constraints.

### LAN-Only Mode

If no cloud session exists (user is not logged in), device identity remains local. No cloud sync occurs.

### Server Idempotency

The server's `POST /api/v1/devices` endpoint should be idempotent:
- Same device ID + same data → no meaningful change (response is identical)
- Same device ID + different public key → updates key and `publicKeyUpdatedAt`
- Same device ID + different user → 409 Conflict (prevents cross-user collision)

Clients can call this endpoint freely without worrying about duplicate registration.

### Pending Key Sync

When a key is rotated while offline (no cloud connection), the client needs a mechanism to ensure the new key is eventually pushed to the server:

1. Persist a flag or marker indicating a key sync is pending.
2. On next successful cloud connection, check for this pending state.
3. If pending, push the new key to the server (via `POST /api/v1/devices` or `PUT /api/v1/devices/:id/key`).
4. Clear the pending state only after server confirmation.

This ensures key rotations are never silently lost, regardless of network conditions at the time of rotation.

## 3. Device List Management

### Sources

The device list presented to the user is a merge of three sources:

| Source | Origin | Contains |
|--------|--------|----------|
| Local Device | Local identity store | Always exactly one entry: this device |
| Cloud Devices | `GET /api/v1/devices` | All devices registered to the same account |
| Trusted Peer Keys | Local trust store | Devices previously paired via LAN |

### When to Refresh the Cloud Device List

| Trigger | Description |
|---------|-------------|
| WebSocket connect | Fetch full device list on every successful WS connection |
| Every 5 minutes (recommended) | While connected, periodically refresh to catch changes not covered by push events |
| User-initiated refresh | Manual pull-to-refresh or equivalent UI action |
| After mutations | After rename, delete, or key rotation operations |

### Reconciliation

When a new cloud device list arrives, reconcile with existing local state:

```
for each cloud device (excluding self):
    if trust record exists for this device:
        merge keys (see Key Merge below)
    else:
        create trust record with cloud trust enabled

for each existing trust record NOT in cloud list:
    disable cloud trust (device may have been removed from account)

rebuild merged device list:
    = local device
    + cloud devices (with trust and LAN state overlaid)
    + trust-only devices (LAN-paired but not in cloud)
```

### Device Object

After reconciliation, each device in the merged list should convey the following information (naming and structure are implementation-defined):

| Information | Description |
|-------------|-------------|
| Device identifier | The unique device ID |
| Display name | Human-readable name |
| Platform type | Device platform |
| Online status | Whether the device is reachable (cloud online OR LAN available) |
| Public key | Current known public key for this device |
| LAN trust state | Whether this device has been trusted via LAN pairing |
| Cloud trust state | Whether this device appears in the cloud device list |
| LAN reachability | Whether this device is currently reachable on LAN |
| Cloud reachability | Whether this device is currently online via cloud |
| Origin sources | Where this device entry came from (local, cloud, LAN trust, or a combination) |

## 4. Trust State

### Concept

Trust is a per-device property that determines whether encrypted communication can be established with that device. Trust is keyed by the device identifier.

### Trust Sources

| Source | How acquired | Removable? |
|--------|-------------|-----------|
| LAN Pairing | Successful LAN handshake with user-confirmed pairing code | Yes — user can "forget" this trust |
| Cloud Sync | Device appears in the authenticated user's cloud device list | No — automatically maintained while logged in |

### Trust Evaluation

A device is considered trusted if **either** source is active:

```
is_trusted = trusted_by_lan OR trusted_by_cloud
```

### Trust Record

Each trust record stores the following information (naming and storage format are implementation-defined):

| Information | Description |
|-------------|-------------|
| Device identifier (primary key) | Uniquely identifies the trusted device |
| Display name | Last known name of the device |
| Public key | The device's public key (base64-encoded) |
| Key timestamp | When this key was last established or updated (Unix milliseconds) |
| LAN trust flag | Whether trust was established via LAN pairing |
| Cloud trust flag | Whether trust was established via cloud sync |

### Trust Implications for LAN Discovery

When a device is discovered on LAN (via mDNS → SWIM alive):

| Trust State | Action |
|------------|--------|
| Trusted (key matches) | Mark as LAN-reachable. Connection is established on-demand when business communication is needed (not immediately on discovery). |
| Trusted (key mismatch) | Reject connection when attempted, clear LAN trust, require re-pairing |
| Not trusted | Show as "pairing candidate" — user can initiate pairing |

Cloud-synced devices discovered on LAN do not require separate pairing — they are already trusted and can connect directly when needed.

## 5. Key Merge Logic

When the cloud device list is refreshed, each device's key must be reconciled with the local trust record.

### Decision Table

| Condition | Action |
|-----------|--------|
| No existing trust record | Create record with cloud trust, use cloud key and timestamp |
| Keys match | Enable cloud trust, update name and timestamp if cloud is newer |
| Keys differ, cloud timestamp newer | Accept cloud key, enable cloud trust, **clear LAN trust** (key changed, LAN must re-pair) |
| Keys differ, cloud timestamp NOT newer | Disable cloud trust (cloud has stale key, local is more recent) |

### Why Clear LAN Trust on Key Change

If the cloud has a newer key, it means the remote device rotated its key pair. The previous key (used during LAN pairing) is now invalid. The LAN pairing is based on a specific key — if that key changes, the pairing is no longer cryptographically valid and must be re-established.

### LAN Pairing Key Merge

When LAN pairing succeeds (user confirms pairing code), upsert the trust record for the peer:

- Use the peer's current public key and current time as key timestamp
- Enable LAN trust
- Preserve existing cloud trust state, UNLESS the key changed from what was previously stored → in that case, disable cloud trust (the old cloud key is now invalid)

## 6. Loss of Authentication

When the client loses its authenticated state — whether by user-initiated logout, token expiration, or server-side session revocation — the following cleanup is performed:

### Actions

1. Disconnect the cloud WebSocket.
2. Clear the session (access token, refresh token).
3. Clear all cloud trust: disable cloud trust on every trust record.
4. Delete orphaned trust records: remove any record where neither LAN trust nor cloud trust is active.
5. Clear the cached device list (cloud devices are no longer valid).
6. Rebuild the device list from remaining sources: local device + LAN-trusted peers only.

### What Survives

- The local device identity (device ID, key pair, name) — unchanged.
- LAN pairing trust — any device previously paired via LAN remains trusted.
- The device can still communicate with LAN-paired peers without a cloud account.

### What Does NOT Survive

- Cloud-only trust records (devices that were never LAN-paired).
- Cloud WebSocket connection.
- Cloud device presence information.

## 7. Key Rotation

A device may rotate its key pair (for security or recovery purposes).

### Procedure

1. Generate a new key pair.
2. Replace the key pair in local identity storage.
3. Mark a pending key sync state (see [Pending Key Sync](#pending-key-sync) in Section 2).
4. If cloud is connected:
   - Push the new key to the server immediately (via `PUT /api/v1/devices/:id/key` or re-register via `POST /api/v1/devices`).
   - On success, clear the pending state.
5. If cloud is not connected:
   - The pending state will trigger sync on next connection (see Section 2).
6. Existing LAN sessions using the old key will naturally disconnect.
7. On next LAN encounter, peers with the old key in their trust store will see a key mismatch → reject → require re-pairing.

## 8. Periodic Sync Summary

While the cloud WebSocket is connected and healthy:

| Interval | Action |
|----------|--------|
| 30 seconds | WebSocket ping/pong keepalive |
| ~5 minutes (recommended) | Re-push device identity (POST) + refresh device list (GET) |

The periodic cycle ensures:
- Device metadata (name, key) is always current on the server.
- The local device list reflects any changes not covered by push events (e.g., device deletions by another client, server-side state corrections).

If the WebSocket drops, the reconnection attempt itself triggers both identity push and device list refresh, so the periodic timer is only relevant during healthy connections.
