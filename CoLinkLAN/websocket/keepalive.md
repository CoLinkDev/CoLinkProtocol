# Keepalive

After encrypted business session negotiation completes, both sides maintain connection liveness using application-level heartbeat messages. This replaces reliance on WebSocket Ping/Pong, which can be intercepted or falsely acknowledged by network intermediaries (proxies, load balancers).

## Message Definitions

**heartbeat.v1.ping:**

```json
{
  "type": "heartbeat.v1.ping",
  "payload": {},
  ...
}
```

No additional fields. Requests a liveness acknowledgment from the peer.

**heartbeat.v1.pong:**

```json
{
  "type": "heartbeat.v1.pong",
  "correlationId": "<ping message id>",
  "payload": {},
  ...
}
```

No additional fields. `correlationId` is set to the `id` of the corresponding `heartbeat.v1.ping`.

## Rules

- Each side sends one `heartbeat.v1.ping` every 15 seconds.
- If 45 seconds pass without receiving any frame from the peer (including heartbeat, business messages, or any other application message), treat the connection as dead and close it.
- Any inbound application message resets the 45-second timer.
- A `heartbeat.v1.pong` whose `correlationId` does not match a pending ping MUST be discarded.
