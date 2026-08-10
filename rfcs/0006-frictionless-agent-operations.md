# RFC 0006: Frictionless agent operations and discovery

- Status: Accepted for RC8 implementation
- Scope: CLI workflow assistance, deterministic query surfaces, static documentation, read-only architecture adapters and portable agent integration

## Context

Private-repository dogfooding demonstrated that the trust boundary works, but also exposed avoidable operational friction: stale guidance after an Action upgrade, manual lifecycle edits, generic diagnostics for mixed changes and no team-oriented catalogue of active contracts.

## Decision

RC8 will add offline version-health diagnostics, bounded managed upgrades, validated status-only transition assistance, actionable mixed-change explanations and one deterministic catalogue JSON model. The catalogue will power a static Explorer and future thin adapters.

The first architecture bridge reads Backstage component metadata and emits a provenance-bearing `read_only` map. Imported architecture never participates in routing and cannot write a contract.

One portable Agent Skill remains the primary coding-agent integration. Vendor plugins may wrap stable CLI/JSON surfaces only when they add measured discovery or workflow value.

## Success measures

- A new adopter reaches a protected first contract without manual command discovery.
- `doctor` identifies stale guidance or Action pins before CI.
- Lifecycle closure requires no hand editing and produces a pure status-only diff.
- Mixed changes explain the split-and-merge remediation.
- Reviewers can find owners, active authority, obligations and path impact from static data.
- At least one design partner validates that the architecture map improves contract proposals without being mistaken for authority.

## Deferred

Hosted analytics, autonomous lifecycle transitions, bidirectional architecture synchronization, broad vendor plugins and architecture-derived automatic authorization remain out of scope until adoption evidence supports them.

