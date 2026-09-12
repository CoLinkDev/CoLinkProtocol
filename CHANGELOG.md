# Changelog

<!-- 
IMPORTANT RULES:
1. This changelog is provided solely to trace protocol changes and is not a normative 
   protocol specification. For the actual protocol requirements, read the referenced 
   protocol documents.
   
2. Published version sections are IMMUTABLE. Do not edit existing entries under released 
   version headings. Append new changes or create new version sections instead.
   
3. See CoLinkProtocol/AGENTS.md for the full changelog policy.
-->


## Server Protocol

### 2026-09-12

- **Cloud notes (`CoLinkServerRESTAPI/notes/`)**
  - Adds account-scoped Markdown notes, multi-tag organization, reusable account-level attachments, on-demand authenticated downloads, storage-usage reporting, optimistic revision checks, consistent snapshots, and cursor-based incremental synchronization.
  - Notes remain readable and editable offline. The server stores readable Markdown and attachment content with account isolation; attachment bodies are downloaded on demand rather than included in synchronization responses.
  - Conflicting note writes use `If-Match` and return `412` instead of applying timestamp-based last-writer-wins behavior. Clients retain both sides and use three-way merge or explicit user resolution.

### 2026-08-26

- **Disabled-account authentication enforcement (`CoLinkServerRESTAPI/README.md`, `CoLinkServerRESTAPI/auth/refresh.md`)**
  - Authenticated endpoints reject access tokens whose account is disabled. Refresh attempts for a disabled account return `1011 account disabled` and revoke all refresh tokens for that account.
- **Per-device WebSocket ticket rate limit (`CoLinkServerRESTAPI/websocket/ticket.md`)**
  - Replaces the account-wide 5 tickets/minute limit with a default rolling limit of 20 tickets/minute for each device. Deployments may configure another positive limit.
- **Recommended Cloud WebSocket message limit (`CoLinkServerRESTAPI/websocket/v1.md`)**
  - Adds `CLOUD_WEBSOCKET_RECOMMENDED_MAX_MESSAGE_BYTES` with a recommended server-side incoming-message limit of 8388608 bytes (8 MiB). The value is a deployment recommendation, not a negotiated protocol field; deployments may configure another positive limit.
- **Device display-name validation (`CoLinkServerRESTAPI/devices/register.md`, `CoLinkServerRESTAPI/devices/update.md`)**
  - Device display names are limited to 100 Unicode code points and may not be blank or contain control characters.
- **Compatibility:** No wire schema or version-negotiation changes. The ticket and WebSocket message limits are relaxed by default. Invalid device names that could previously fail at persistence are now rejected explicitly with `4002 invalid parameter`; disabling an account now takes effect for existing access and refresh tokens.

### 2026-08-15

- **Cloud WebSocket liveness (`CoLinkServerRESTAPI/websocket/v1.md`)**
  - Defines control-frame liveness enforcement: clients respond to WebSocket `Ping` with `Pong`; after 60 seconds without a control `Pong`, the server closes the connection and broadcasts `device.offline`.
  - **Compatibility:** No envelope, message, or field changes. Existing conforming WebSocket clients remain compatible.

### 2026-08-02

- **Update Asset SHA-256 (`CoLinkServerRESTAPI/update/check.md`, `CoLinkServerRESTAPI/update/tauri.md`)**
  - **New optional field:** Adds `sha256` to update assets and the Tauri update manifest. It is the lowercase hexadecimal SHA-256 digest of the exact bytes returned by the corresponding download URL.
  - **Compatibility:** The field is additive and optional. Clients that receive no `sha256` field skip checksum verification and continue their existing update flow. Clients that receive it verify the downloaded bytes before installation or use.

### 2026-07-27

- **Push Notification API (`CoLinkServerRESTAPI/push/`)**
  - **New endpoints:** Adds Bark-compatible push endpoints under `/api/push/`. Supports path-form (`/api/push/:deviceId/:title/:body`), POST form body, POST JSON with key in path, and POST JSON with key in body (`POST /api/push` with `device_key`). Batch push via `device_keys` array is also supported.
  - **Target device and authentication:** `deviceId` identifies the target device; it is not a credential. Push endpoints require a Bearer token and accept pushes only to devices owned by the token's account.
  - **Behavior:** The server delivers the notification via WebSocket and waits for a `notification.push-ack` before responding. Returns `2011 device offline` if the device has no active connection, `2012 push not supported` if the device lacks the Cloud WebSocket Protocol `1.1.0` Push capability, and `2013 push timeout` if no ACK is received within 10 seconds.

- **Cloud WebSocket Protocol v1.1.0 (`CoLinkServerRESTAPI/websocket/v1.md`)**
  - **Version axis:** Introduces the Cloud WebSocket Protocol Version, independently versioned from P2P and Business protocols. Clients advertise `wsVersion` through the WebSocket connection URL; absent or unparseable values are treated as `1.0.0`.
  - **Compatibility:** Clients and the server require the same Cloud WebSocket major version. Within major version `1`, the server gates new capabilities by the target client's advertised minor version.
  - **New `device.online` field:** `wsVersion` is included in the `device.online` payload so that other connected devices can observe a peer's WebSocket capabilities.

- **`notification.push` and `notification.push-ack` messages (`CoLinkServerRESTAPI/websocket/v1.md`)**
  - **New server→device message:** `notification.push` carries a push notification payload directly from the server to a target device. `from` is `null`. Only delivered to devices with the Cloud WebSocket Protocol `1.1.0` Push capability.
  - **New device→server message:** `notification.push-ack` acknowledges receipt of a `notification.push`. `correlationId` references the push message `id`. The server resolves the pending HTTP request upon receiving the ACK.

### 2026-07-17

- **Cloud WebSocket Envelope: `correlationId` field (`CoLinkServerRESTAPI/websocket/v1.md`)**
  - **New field:** The cloud WebSocket message envelope adds an optional `correlationId` (string or null). When present on `relay` or `broadcast` messages, the server transparently passes it through to the recipient without interpretation.
  - **Purpose:** Enables request-response correlation over cloud relay, aligning with the P2P envelope's existing `correlationId` field. Used by `fs.v1.download` to associate an incoming `file.v2.offer` with the originating download request.
  - **Compatibility:** The field is optional and defaults to `null`. Existing clients that do not send or read `correlationId` are unaffected.

## P2P Protocol

### 2026-08-08

- **Documentation: Pairing URL References (`CoLinkP2P/websocket/`)**
  - Removed `pair-string.md` and `pair-string-v2.md`. Pairing URL specifications are now in `CoLinkURLScheme/pair.md`.
  - Updated `pairing.md` and `README.md` to reference `CoLinkURLScheme/pair.md`.

### v1.4.0 — 2026-07-30

- **Pair String v2 (`CoLinkP2P/websocket/pair-string-v2.md`)**
  - **Format:** Binary fixed-layout (80 bytes), base64url encoded as `colink://pair/v2?d=<base64url>`. Fields: `deviceId` (16 B UUID raw bytes), Ed25519 `publicKey` (32 B), and `token` (32 B). No JSON overhead.
  - **Removed fields:** `name`, `platform`, and `expiresAt` — reduces encoded pair string length from ~320 to ~126 characters. Token validity period is managed by the issuing implementation.
  - **Identity binding:** The initiator validates both the receiver device ID and public key against the pair string before accepting automatic confirmation.
  - **Compatibility:** v1 format remains valid and both formats MUST be supported by implementations advertising ≥1.4.0. v2 is used only when both peers advertise ≥1.4.0. An unsupported or invalid pair string is rejected with `pair_string_invalid` and ends that pairing attempt.

### v1.3.0 — 2026-07-28

- **Pair-String Pairing (`CoLinkP2P/websocket/pair-string.md`, `CoLinkP2P/websocket/pairing.md`)**
  - **New format:** Adds the versioned `colink://pair/v1?data=<base64url(JSON UTF-8)>` pair string. It carries the receiver `deviceId`, Ed25519 public key, 32-byte CSPRNG token, and expiration. Endpoint discovery remains outside the pair string.
  - **Token lifecycle:** Tokens are in-memory, one-time bearer credentials with `active → reserved → consumed` state. The recommended validity period is `PAIR_STRING_RECOMMENDED_TTL` (1 hour); tokens are invalidated by expiry, cancellation, failed pairing, restart, or identity-key rotation.
  - **Automatic confirmation:** Adds optional `pairString` to `pairing.v1.request`. When both peers advertise P2P `1.3.0` or later and the receiver validates the token, the receiver sends the existing `pairing.v1.exchange` followed by `pairing.v1.confirm` without numeric-code confirmation. The initiator validates the receiver identity from hello and exchange before accepting confirm.
  - **Compatibility and rejection:** Pair-string pairing and numeric-code pairing are mutually exclusive. Peers use the numeric-code flow whenever pair-string pairing is not selected. Adds `pair_string_invalid`, `pair_string_expired`, `pair_string_unavailable`, and `identity_mismatch` pairing reasons.

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

### v1.17.0 — 2026-09-02

- **Command Acknowledgement (`CoLinkBusiness/system-control.md`)**
  - **New message:** Adds `system-control.v1.ack` (host → controller), which acknowledges receipt, validation, and acceptance of a `system-control.v1.command`. The message has an empty payload `{}`. Its `correlationId` references the originating command envelope `id`.
  - **Semantics:** The `ack` confirms that the command was accepted and processed (either executed immediately or scheduled for delayed execution). It does NOT confirm that the action succeeded, was observed by the user, or will complete. For delayed actions, no further message is sent when the scheduled action later executes or fails.
  - **Command errors:** `system-control.v1.error` is extended to cover commands. New reasons `colink:system-control.command_rejected.v1` (platform capability unavailable, hardware not present, or preconditions not met) and `colink:system-control.command_failed.v1` (runtime error during execution or scheduling) report command failures. The host replies to a recognized command with exactly one of `ack` or `error`, and MUST NOT send either for a command it silently ignores.
  - **Interaction model:** The command acknowledgement is best-effort — an `ack` may never arrive (loss or host going offline). Controllers MUST NOT rely on its arrival and MUST NOT automatically retransmit a command due to a missing `ack`. Old peers keep the legacy fire-and-forget behavior.
  - **Compatibility:** Requires Business Protocol Version ≥ 1.17.0. The host acknowledges every recognized command only when both peers advertise version ≥ 1.17.0; otherwise it sends no reply. Hosts below 1.17.0 silently ignore the unknown `system-control.v1.ack` type per existing forward-compatibility rules; controllers MUST NOT expect an `ack` from such hosts.

### v1.16.0 — 2026-09-02

- **Display Control (`CoLinkBusiness/system-control.md`)**
  - **New actions:** Adds `display-off` and `display-on` to `system-control.v1.command` for display power control.
  - **`display-off`:** Turns off the host's display(s) / enters display sleep mode. The exact behavior is platform-dependent (may turn off backlight, enter DPMS standby, etc.).
  - **`display-on`:** Wakes the host's display(s) from sleep mode. On some platforms this may require simulating user activity.
  - **Best-effort execution:** Both actions are best-effort — the host SHOULD execute them using platform-specific APIs and MUST silently ignore the command if display control is unavailable on the current platform.
  - **Parameters:** Display actions do not accept `volume` or `targetMac`; the host MUST silently ignore those fields when `action` is `display-off` or `display-on`.
  - **Compatibility:** Requires Business Protocol Version ≥ 1.16.0. Controllers MUST check the peer's advertised version before sending `display-off` or `display-on`. Hosts below 1.16.0 silently ignore the unknown action values per existing forward-compatibility rules.

### v1.15.0 — 2026-08-23

- **File Transfer v3 (`CoLinkBusiness/file-transfer-v3.md`)**
  - **New protocol:** Introduces `file.v3.*` messages, superseding `file.v2.*` for peers with effective Business Protocol Version ≥ v1.15.0. The control plane retains the same signaling model (`offer / accept / reject / cancel / ready / done`).
  - **LAN data plane: HTTPS replaces binary WebSocket.** The sender registers `GET /transfer/v3/{sessionId}` on its P2P service port over TLS (token via `Authorization: Bearer` header). The receiver downloads the file via a standard HTTPS GET request. This eliminates the application-layer reliable transfer mechanism (windowing, ACK, retransmit) for LAN — TCP provides ordered, reliable delivery natively. Supports `Range` requests for resumption.
  - **LAN transport security: TLS with control-plane certificate pinning.** The sender generates a temporary self-signed TLS certificate (ECDSA P-256, ECDHE key exchange, TLS 1.3 required / TLS 1.2 with ECDHE-ECDSA acceptable) and delivers its SHA-256 fingerprint to the receiver exclusively through the AEAD-protected direct P2P session (`file.v3.ready.certFingerprint`). The fingerprint MUST NOT be sent or accepted over Cloud Relay. LAN HTTPS is only selected when the session's control plane is bound to a direct P2P connection; otherwise relay mode is used regardless of LAN reachability. The P2P service port serves both plaintext `ws://` (existing peer protocol) and TLS (file transfer) by inspecting the first byte of each TCP connection; anti-downgrade rules prevent fallback to plaintext for `/transfer/v3/` paths.
  - **Direction reversal:** In v2 the receiver exposed the data endpoint and the sender pushed data; in v3 the sender exposes the HTTPS endpoint and the receiver pulls data.
  - **Relay mode unchanged:** Cloud relay continues using JSON `file.v3.chunk` / `file.v3.ack` / `file.v3.retransmit` / `file.v3.finish` on the main WebSocket with the same cumulative-ACK reliable transfer logic (send window default: 4). `file.v3.finish` explicitly signals the total chunk count so the receiver can confirm completeness before verifying the checksum.
  - **Offer simplified:** `file.v3.offer` removes `totalChunks` and `chunkSize` fields — LAN mode transfers the complete file as a single HTTPS response; relay mode chunk size is implementation-defined and completeness is signaled by `file.v3.finish`.
  - **Routing rule:** LAN HTTPS is selected only when both LAN-reachable and the session's control plane uses an AEAD direct P2P connection. LAN HTTPS connection failure (including TLS pinning failure) requires `file.v3.cancel`; no automatic LAN-to-relay fallback within the same session.
  - **Security model:** `sessionId` (UUIDv4) + `transferToken` (CSPRNG-generated, ≥256-bit, base64url-encoded, session-scoped bearer credential sent via `Authorization: Bearer` header). Token is valid for the session lifetime (not consumed on first request), enabling HTTPS range-based resumption after connection interruption. Only one active HTTPS connection per session is permitted at a time.
  - **Compatibility:** Requires effective Business Protocol Version ≥ v1.15.0. When communicating with peers below v1.15.0, implementations MUST use `file.v2.*`. `fs.v1.download` and `fs.v1.upload` use the file transfer version matching the effective Business Protocol Version.

### v1.14.0 — 2026-08-18

- **Text Delivery Receipts (`CoLinkBusiness/text-message.md`)**
  - **New message:** Adds `message.v1.receipt`, which confirms that the receiving client has validated and persistently recorded a `message.v1.text` payload. It references the text message through its `messageId`; it is not a read receipt and does not imply server persistence or notification display.
  - **Deduplication:** Receivers deduplicate text messages by `messageId`, avoid duplicate conversation entries and notifications, and repeat the receipt for duplicate deliveries so a retransmission can complete idempotently.
  - **Compatibility:** A receiver sends a receipt without checking the peer's advertised Business Protocol Version. Older peers ignore the unknown receipt message; senders retain the existing fire-and-forget behavior when a receipt cannot be used.

### v1.13.0 — 2026-08-15

- **Remote Filesystem Upload (`CoLinkBusiness/filesystem.md`)**
  - **New messages:** Adds `fs.v1.upload` for requesting an upload to an absolute remote path, and `fs.v1.upload-ready` for confirming that the host has reserved the destination. The uploader sends the standard `file.v2.offer` only after receiving `upload-ready`.
  - **Correlation and authorization:** Both the download and upload flows bind their ensuing `file.v2.offer` to the originating filesystem request through the envelope `correlationId`. For uploads, the host creates a one-time, device-bound authorization for the requested destination; a matching offer consumes it.
  - **Safe destination handling:** The host validates its local write policy and destination before reserving it, revalidates immediately before writing and committing, writes through a temporary file, verifies the standard `file.v2` checksum, and atomically commits without overwriting an existing file. Failed validation or transfer leaves any existing destination unchanged.
  - **Compatibility:** Requires Business Protocol Version ≥ 1.13.0. Requesters disable remote uploads for older peers while retaining the existing v1.4.0 browsing and download behavior; older peers ignore the new message types under the standard forward-compatibility rule.

### v1.12.1 — 2026-08-01

- **Delayed Power Action Scope Clarification (`CoLinkBusiness/system-control.md`)**
  - Removed connection-specific wording from delayed power scheduling, cancellation, and pending-power queries. This documentation clarification does not change the wire format.

### v1.12.0 — 2026-08-01

- **Pending Power Query (`CoLinkBusiness/system-control.md`)**
  - **New queryable field:** `pending-power` added to `system-control.v1.query`. Returns the currently pending delayed power action as an object, or `null` if no delayed power action is pending.
  - **Pending Power Object:** Contains `action` (one of `"sleep"`, `"shutdown"`, `"lock"`) and `remainingMs` (integer, milliseconds remaining until execution, minimum `0`). `remainingMs` is computed at the moment the host processes the query and clamped to `0`. If the action executes between computation and sending the result, the host SHOULD return `null`.
  - **Compatibility:** Requires Business Protocol Version ≥ 1.12.0. Hosts below 1.12.0 silently ignore the unrecognized field name per existing forward-compatibility rules and return a result without it. Controllers MUST NOT rely on `pending-power` from hosts below 1.12.0.

### v1.11.0 — 2026-07-25

- **Delayed Power Actions and Cancellation (`CoLinkBusiness/system-control.md`)**
  - **New field:** `delay` (integer or null) added to `system-control.v1.command`. Applicable only to `sleep`, `shutdown`, and `lock`; the host MUST silently ignore it for all other actions. A non-negative integer specifies the number of seconds to wait before executing the action; `null` or omitted means execute immediately (equivalent to `0`). If a negative value is received, the host MUST treat it as `0`.
  - **New action:** `cancel-power` cancels the most recently scheduled delayed power action. If no delayed action is pending, the host MUST silently ignore the command. Only one delayed power action may be pending at a time; a new delayed command replaces any existing pending one.
  - **Compatibility:** Requires Business Protocol Version ≥ 1.11.0. Controllers MUST check the peer's advertised version before sending a non-null `delay` or a `cancel-power` command. Hosts below 1.11.0 silently ignore the unknown `cancel-power` action value and the unknown `delay` field per existing forward-compatibility rules.

### v1.10.0 — 2026-07-23

- **Remote Camera Stream (`CoLinkBusiness/camera.md`)**
  - **Messages:** Adds `camera.v1.list` / `camera.v1.list-result` (enumerate cameras), `camera.v1.open` / `camera.v1.open-ack` (open a streaming session), `camera.v1.ready` (confirm LAN or relay transport), `camera.v1.alive` (controller liveness heartbeat), `camera.v1.config` / `camera.v1.config-ack` (mid-session parameter adjustment), `camera.v1.close` (bidirectional session close), and `camera.v1.frame` (relay-mode video frame).
  - **Transport:** Control plane uses the existing encrypted business channel. The host offers LAN by including a one-time `streamToken`; the controller confirms the final route with `camera.v1.ready`, falling back to relay if its LAN connection attempt fails. LAN frames use a dedicated binary WebSocket at `/camera-stream/{sessionId}?token={streamToken}`; relay frames use `camera.v1.frame` JSON messages on the main WebSocket.
  - **Codec negotiation:** The controller offers an ordered `preferredCodecs` list at open time; the host selects `negotiatedCodec`. Binary frame headers carry a `codec` field for self-description. Defined codec values: `0x01=jpeg`, `0x02=h264`, `0x03=webp`. H.264 payloads use Annex B and carry one complete access unit per protocol frame; keyframes include the parameter sets required for independent decoding. Future codecs require a minor version bump.
  - **Alive-controlled streaming:** The host streams only while the controller sends `camera.v1.alive` heartbeats (recommended: every 5s). The host stops streaming after 15s without a heartbeat and resumes when a new heartbeat arrives.
  - **Camera enumeration:** `camera.v1.list-result` returns `cameraId`, `label`, `position` (`front`/`back`/`external`/`null`), and `capabilities` (`resolutions` array + `fpsRange`).
  - **Mid-session reconfiguration:** `camera.v1.config` adjusts `width`, `height`, and/or `fps`; host responds with `camera.v1.config-ack` containing the actual applied values.
  - **Compatibility:** Requires Business Protocol Version ≥ 1.10.0. Controllers MUST check the peer's advertised version before sending `camera.v1.*` messages. Hosts below 1.10.0 silently ignore unknown message types per existing rules.

### v1.9.0 — 2026-07-21

- **Remote Terminal Control (`CoLinkBusiness/terminal.md`)**
  - **Messages:** Adds `terminal.v1.open` (controller → host), `terminal.v1.open-ack` (host → controller), `terminal.v1.data` (bidirectional), `terminal.v1.resize` (controller → host), and `terminal.v1.close` (bidirectional).
  - **Session model:** Each session is identified by a controller-generated UUIDv4 `sessionId`. Multiple sessions MAY be multiplexed over a single connection simultaneously.
  - **Byte stream:** `terminal.v1.data` carries Base64-encoded raw PTY bytes. The controller sends `stream: "input"`; the host sends `stream: "output"`. stdout and stderr are merged by the PTY kernel buffer and cannot be distinguished at the protocol layer.
  - **PTY resize:** `terminal.v1.resize` delivers new `cols`/`rows` to the host PTY (`TIOCSWINSZ`), causing `SIGWINCH` to be delivered to the shell process.
  - **Session close:** Either side MAY send `terminal.v1.close`. When the controller closes, the host MUST terminate the session's managed process tree. Processes that have detached via `nohup`/`disown` are unaffected.
  - **Connection disconnect:** When the underlying transport closes, the host MUST terminate all active session processes and their managed process trees. In cloud-relay deployments, receiving `device.offline` for the controller is treated as equivalent to a disconnect. No `terminal.v1.close` messages are exchanged for implicitly closed sessions.
  - **Env overrides:** `terminal.v1.open` accepts an optional `env` map. Only `TERM`, `LANG`, and `LC_ALL` are applied; all other keys are silently ignored.
  - **Compatibility:** Requires Business Protocol Version ≥ 1.9.0. Controllers MUST check the peer's advertised version before sending `terminal.v1.*` messages. Hosts below 1.9.0 ignore unknown message types per existing rules.

### v1.8.0 — 2026-07-20

- **Wake-on-LAN (`CoLinkBusiness/system-control.md`)**
  - **New action:** Adds `wake-on-lan` to `system-control.v1.command`. The receiving device acts as a proxy and broadcasts a standard WOL magic packet (UDP port 9) to its local network.
  - **New field:** `targetMac` (string or null) added to the command payload. Required when `action` is `wake-on-lan`; MUST be `null` or omitted for all other actions. Format: `XX:XX:XX:XX:XX:XX` (hexadecimal, case-insensitive).
  - **Invalid input handling:** The host MUST silently ignore the command if `targetMac` is absent, `null`, or does not match the expected format.
  - **Compatibility:** Requires Business Protocol Version ≥ 1.8.0. Controllers MUST check the peer's advertised version before sending `wake-on-lan`. Hosts below 1.8.0 silently ignore the unknown action value per existing rules.

### v1.7.0 — 2026-07-19

- **System State Query (`CoLinkBusiness/system-control.md`)**
  - **New messages:** Adds `system-control.v1.query` (controller → host), `system-control.v1.result` (host → controller), and `system-control.v1.error` (host → controller).
  - **Interaction model:** Request-response — the controller sends a query with a `fields` array, the host replies with a `result` containing only the recognized and requested fields, or an `error` if the query cannot be fulfilled. The `correlationId` in the result/error envelope references the originating query envelope `id`.
  - **Queryable fields:** `volume` (integer 0–100 or null), `muted` (boolean or null), `playback` (`"playing"` / `"paused"` / `"stopped"` or null). A field that cannot be determined MUST be reported as `null`.
  - **Unknown fields:** The host MUST silently ignore unrecognized field names in `fields` and return only fields it recognizes. If all fields are unrecognized, the host returns an empty result payload.
  - **Error reasons:** `colink:system-control.query_failed.v1`, `colink:system-control.invalid_request.v1`, `colink:system-control.generic.v1`.
  - **Compatibility:** Requires Business Protocol Version ≥ 1.7.0. Controllers MUST check the peer's advertised version before sending a query. Hosts below 1.7.0 silently ignore the unknown message type per existing rules.

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

## URL Scheme

### 2026-08-08

- **CoLink URL Scheme (`CoLinkURLScheme/`)**
  - **New structure:** Adds `CoLinkURLScheme/README.md` (scheme format and platform registration) and `CoLinkURLScheme/pair.md` (pairing URL v1 and v2 specifications merged from the removed P2P docs).
  - **No protocol changes:** The `colink://pair/v1` and `colink://pair/v2` formats remain unchanged.
