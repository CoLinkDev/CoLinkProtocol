# CoLink Protocol Agent Notes
Read README.md first.

## Changelog Rules
- Only add new entries to CHANGELOG.md. Never modify existing version sections. Existing version entries (e.g., "v1.4.0 — 2026-07-30") and their content are immutable. Document path changes are tracked in the new entry, not by editing the old one.
- When refactoring documentation without changing protocol behavior, add a section under the appropriate protocol category (P2P Protocol, Business Protocol, Server Protocol) without version.

## Pre-Change Checks
- Classify the change into one of the following categories: P2P protocol, Business protocol, REST API, or documentation clarification with no impact on online runtime behavior.
- Evaluate bidirectional compatibility: legacy sender ↔ new receiver, new sender ↔ legacy receiver.
- Any cryptography-related changes require an assessment of protocol version impacts (refer to the "Cryptography Change Rules" section in README).

## Post-Change Synchronization
- Update the corresponding README files, including the `Current Protocol Version`, version negotiation rules, flowcharts, field tables, examples and cross-references (where applicable).
- For newly added capabilities, document the minimum supported protocol version, runtime behavior under version mismatches, and degradation paths for older peers.