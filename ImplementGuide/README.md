# Implementation Guide

This directory contains cross-platform implementation guidance for CoLink clients. The guides describe how to combine the published protocol specifications with local state, platform services, and user-visible device management.

The intended audience is anyone implementing or reviewing CoLink clients, including Desktop, Android, iOS, and other compatible platforms.

## Scope and authority

- Protocol documents in [`CoLinkP2P`](../CoLinkP2P/), [`CoLinkBusiness`](../CoLinkBusiness/), [`CoLinkServerRESTAPI`](../CoLinkServerRESTAPI/), and [`CoLinkURLScheme`](../CoLinkURLScheme/) define the wire format and normative protocol behavior.
- This directory defines implementation sequencing, persistence, reconciliation, lifecycle handling, and recommended client behavior that spans more than one protocol area.
- When this directory conflicts with a protocol document, the protocol document takes precedence. The implementation guide must then be corrected; it must NOT introduce a new wire-level interpretation.

## Guides

| Document | Covers |
|----------|--------|
| [`0-device-identity-and-trust.md`](0-device-identity-and-trust.md) | Local device identity, Ed25519 keys, cloud registration and synchronization, merged device lists, LAN and cloud trust, key reconciliation, logout cleanup, and key rotation |

Additional guides will be added here when a concern is shared by multiple client implementations and cannot be expressed clearly in a single protocol document.
