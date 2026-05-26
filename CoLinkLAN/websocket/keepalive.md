# Connection Keepalive

After peer handshake succeeds, both sides keep the WebSocket alive with Ping/Pong.

## Rules

- Each side sends one WebSocket `Ping` frame every 15 seconds
- If 45 seconds pass without receiving any frame from the peer, treat the connection as dead and close it
- Any inbound business message, `Ping`, or `Pong` resets the 45-second timer

## Scope

This document only defines post-handshake keepalive behavior.

Reconnect policy and mDNS browse retry are local implementation details, not protocol requirements.
