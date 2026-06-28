# CoLink Protocol Agent Notes
Read README.md first.

## Pre-Change Checks
- Classify the change into one of the following categories: P2P protocol, Business protocol, REST API, or documentation clarification with no impact on online runtime behavior.
- Evaluate bidirectional compatibility: legacy sender ↔ new receiver, new sender ↔ legacy receiver.
- Any cryptography-related changes require an assessment of protocol version impacts (refer to the "Cryptography Change Rules" section in README).

## Post-Change Synchronization
- Update the corresponding README files, including the `Current Protocol Version`, version negotiation rules, flowcharts, field tables, examples and cross-references (where applicable).
- For newly added capabilities, document the minimum supported protocol version, runtime behavior under version mismatches, and degradation paths for older peers.