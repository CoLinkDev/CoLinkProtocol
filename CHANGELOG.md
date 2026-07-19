# Changelog

<!-- This changelog is provided solely to trace protocol changes and is not a normative protocol specification. For the actual protocol requirements, read the referenced protocol documents. -->

## Server Protocol

### 2026-07-17

- **Cloud WebSocket Envelope: `correlationId` field (`CoLinkServerRESTAPI/websocket/v1.md`)**
  - **New field:** The cloud WebSocket message envelope adds an optional `correlationId` (string or null). When present on `relay` or `broadcast` messages, the server transparently passes it through to the recipient without interpretation.
  - **Purpose:** Enables request-response correlation over cloud relay, aligning with the P2P envelope's existing `correlationId` field. Used by `fs.v1.download` to associate an incoming `file.v2.offer` with the originating download request.
  - **Compatibility:** The field is optional and defaults to `null`. Existing clients that do not send or read `correlationId` are unaffected.

## P2P Protocol

### v1.2.0 — 2026-07-02

- **Nonce-Bound Ephemeral Key Exchange (`CoLinkP2P/websocket/business.md`)**
  - **Version gate:** The effective P2P version is `min(local.protocolVersion, peer.protocolVersion)`; all version-dependent flows MUST use this value.
  - **New phase:** When the effective version is ≥ 1.2.0, both peers MUST exchange `business.v1.key-exchange-nonce` before `business.v1.key-exchange`. `payload.nonce` is a Base64-encoded 32-byte random value for the current connection only and MUST NOT be persisted or reused. The subsequent Ed25519 signature uses the `colink-lan-key-exchange-v2` domain and binds `from`, `to`, `ephemeralPublicKey`, and both nonces to prevent cross-connection replay.
  - **Fallback handling:** When the effective version is 1.1.x, peers MUST NOT send a nonce and continue to use the legacy signature containing `timestamp`, with a ±30-second acceptance window. When it is below 1.1.0, peers skip ephemeral key exchange and use the long-term identity-key derivation path.

### v1.1.0 — 2026-06-18

- **Forward-Secrecy Ephemeral Key Exchange (`CoLinkP2P/websocket/business.md`)**
  - **Ordering and messages:** When both P2P versions are ≥ 1.1.0, peers perform `business.v1.key-exchange` after the unencrypted Business version exchange and before `business.v1.negotiate`. Each connection MUST generate a new X25519 key pair and send a Base64-encoded 32-byte `ephemeralPublicKey` and a 64-byte `signature` generated with the long-term Ed25519 identity key.
  - **Validation and derivation:** The v1.1 signature uses the `colink-lan-key-exchange` domain and binds the envelope `from`, `to`, ephemeral public key, and `timestamp`; the receiver validates it with the trusted public key established during authentication or pairing and a ±30-second time window. On success, the session key is derived from the ephemeral X25519 ECDH shared secret using HKDF-SHA256 with the `colink-lan-v2` salt; `info` binds the device identities and ephemeral public keys in device-ID lexicographic order, plus the effective protocol version and cipher suite.
  - **Failure and fallback:** Adds `business.v1.key-exchange-reject` with the `colink:key_exchange.signature_invalid.v1`, `colink:key_exchange.timestamp_expired.v1`, and `colink:key_exchange.generic.v1` reason codes. After either peer sends or receives a rejection, it MUST NOT negotiate a cipher suite or send encrypted Business messages. For peers below 1.1.0, this phase is skipped in favor of the long-term identity-key derivation path without forward secrecy.

## Business Protocol

### v1.6.0 — 2026-07-19

- **Media Playback and Volume Controls (`CoLinkBusiness/system-control.md`)**
  - **Extended actions:** Adds six new `action` values to `system-control.v1.command`: `play`, `pause`, `next`, `previous`, `set-volume`, and `mute`.
  - **New field:** `volume` (integer, 0–100) added to the payload. Required when `action` is `set-volume`; MUST be `null` or omitted for all other actions.
  - **Semantics:** Media playback actions target the active system media session and are best-effort — the host MUST silently ignore them if no controllable session exists. `mute` silences output; System volume refers to the host OS master volume, not per-application volume.
  - **Forward compatibility:** The existing rule requiring hosts to silently ignore unrecognized `action` values already covers old peers receiving these new actions.
  - **Compatibility:** Controllers MUST check that the peer's advertised Business Protocol Version is ≥ 1.6.0 before sending any of the new actions. A Version 1.5.0 host recognizes the message type but silently ignores the new unrecognized `action` values, including `volume`; hosts below Version 1.5.0 encounter the entire command as an unknown message type. Version 1.6.0 hosts continue to accept Version 1.5.0 power commands without `volume`.

## Business Protocol

### v1.5.0 — 2026-07-19

- **Remote System Control (`CoLinkBusiness/system-control.md`)**
  - **Message:** Adds `system-control.v1.command` (controller → host, fire-and-forget). `payload.action` is one of `sleep`, `shutdown`, or `lock`.
  - **Interaction model:** One-way only — no response message is defined. The host executes the action immediately upon receipt. User confirmation is an application-layer concern.
  - **Forward compatibility:** Hosts MUST silently ignore unrecognized `action` values to allow future actions to be added without a version bump.
  - **Compatibility:** Requires Business Protocol Version ≥ 1.5.0. Controllers MUST check the peer's advertised version before sending `system-control.v1.*` messages. Hosts below 1.5.0 ignore unknown message types per existing rules.

### v1.4.0 — 2026-07-17

- **Remote Filesystem Browse (`CoLinkBusiness/filesystem.md`)**
  - **Messages:** Adds `fs.v1.roots` / `fs.v1.roots-result` (enumerate drives/mount points), `fs.v1.list` / `fs.v1.list-result` (paginated single-level directory listing), `fs.v1.stat` / `fs.v1.stat-result` (single-path metadata query), `fs.v1.download` (request host to initiate `file.v2.offer` for a specified file), and `fs.v1.error` (structured error response for any fs request).
  - **Interaction model:** Request-response — the requester queries, the host replies. No subscription or push mechanism.
  - **Download integration:** `fs.v1.download` causes the host to become the sender in a standard file transfer v2 session; no new data transport is introduced.
  - **Compatibility:** Requires Business Protocol Version ≥ 1.4.0. Requesters MUST check the peer's advertised version before sending `fs.v1.*` messages. Hosts below 1.4.0 ignore unknown message types per existing rules.

### v1.3.0 — 2026-06-27

- **File Checksum Algorithm Versioning (`CoLinkBusiness/file-transfer-v2.md`)**
  - **Version selection:** `file.v2.offer.checksum` has the fixed format `<algorithm>:<hash>`. The sender MUST select the algorithm using `effectiveBusinessVersion = min(local.businessVersion, peer.businessVersion)`, and the peers MUST have the same major version; the algorithm is not negotiated separately in the offer.
  - **Supported algorithms:** `blake3:<lowercase-hex-digest>` and `sha256:<lowercase-hex-digest>` require v1.2.0 or later; `none:none` requires v1.3.0 or later and means that no checksum is generated or verified.
  - **Compatibility and rejection:** The sender may use only algorithms introduced no later than the effective version, while receivers MUST continue accepting previously registered algorithms in the same major version. If the prefix is missing, malformed, or unsupported by the effective version, the receiver MUST reject `file.v2.offer` before accepting file data and MUST NOT substitute another algorithm.

### v1.2.0 — 2026-06-20

- **System Information I/O Metrics (`CoLinkBusiness/sysinfo.md`)**
  - **New fields:** `sysinfo.v1.stats.payload` adds nullable numeric fields: `net_up`, `net_down`, `disk_read`, and `disk_write`. They represent system-wide network upload, network download, disk read, and disk write rates respectively, in bytes per second; unavailable metrics use `null`.
  - **Compatibility handling:** These are backward-compatible additive fields that older receivers may ignore. Senders do not need to change the semantics of the existing CPU, memory, or GPU snapshot fields for peers below v1.2.0.

### v1.1.0 — 2026-06-19

- **System Information Push and Receiver Liveness (`CoLinkBusiness/sysinfo.md`)**
  - **Messages and fields:** The source device sends `sysinfo.v1.stats` resource snapshots to receivers. `payload.cpu` and `payload.mem` are numeric percentages from 0 to 100; `payload.gpu` is an optional number or `null`. Receivers send `sysinfo.v1.alive` with an empty payload as a subscription-liveness heartbeat.
  - **Push control:** The source maintains liveness independently for each receiver and sends `stats` only to live receivers. The recommended cadence is a 3-second sampling/push interval and a 5-second `alive` interval; the source stops a receiver's data flow after 15 seconds without its heartbeat and resumes it when a new heartbeat arrives.
