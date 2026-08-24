---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-RC16-PUBLISHED-GUIDANCE-CORRECTION
title: Correct published RC16 guidance
status: approved
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
---

# Correct published RC16 guidance

Correct three current-facing guides that still describe EngineeringSpec `0.1.0-rc.16` as awaiting publication. RC16 is already published as `@engineeringspec/cli@0.1.0-rc.16` and `v0.1.0-rc.16`; this proposal authorizes no documentation implementation until this exact revision is independently reviewed, changed to `approved`, and merged into trusted main.

## Source intent

```engineering-source-refs
- id: SRC-TRUSTED-MAIN
  type: other
  ref: a472773ac9616c675a08741375e090914eb7863b
  title: Trusted main containing the completed onboarding-friction implementation
- id: SRC-PACKAGE-IDENTITY
  type: document
  path: package.json
  title: Current CLI package identity at 0.1.0-rc.16
- id: SRC-ACTION-ANCHOR
  type: document
  path: src/adoption/releases.ts
  title: Current immutable RC16 Action anchor
- id: SRC-CURRENT-README
  type: document
  path: README.md
  title: Current published-RC16 introduction and adoption guidance
- id: SRC-PRODUCTION-GATE
  type: document
  path: docs/production-gate.md
  title: Production guidance containing stale RC16 pre-publication statements
- id: SRC-AGENT-INTEGRATION
  type: document
  path: docs/agent-integration.md
  title: Agent guidance containing stale RC16 pre-publication statements
- id: SRC-UPGRADING
  type: document
  path: docs/upgrading.md
  title: Upgrade guidance containing stale RC16 pre-publication statements
- id: SRC-RC16-RELEASE
  type: other
  ref: v0.1.0-rc.16
  title: Published EngineeringSpec RC16 GitHub prerelease
- id: SRC-RC16-NPM
  type: other
  ref: "@engineeringspec/cli@0.1.0-rc.16"
  title: Published EngineeringSpec RC16 npm package
```

## Target surfaces

```engineering-targets
- id: TARGET-CURRENT-GUIDANCE
  component: published-rc16-current-guidance
  paths:
    - docs/production-gate.md
    - docs/agent-integration.md
    - docs/upgrading.md
  change_policy: modify
- id: TARGET-CONTRACT
  component: published-rc16-guidance-authority-lifecycle
  paths:
    - docs/engineering-specs/ES-RC16-PUBLISHED-GUIDANCE-CORRECTION.engineering-spec.md
  change_policy: modify
```

The future implementation inventory is exact. Historical EngineeringSpecs, changelog entries, release notes, receipts, evidence, and other records may accurately describe an earlier point in time and remain outside writable scope.

## Decisions

```engineering-decisions
- id: DEC-CURRENT-GUIDANCE-ONLY
  title: Correct only the three stale current-facing guides
  rationale: Package, release, Action, and README state are already correct. Narrow documentation edits are sufficient and avoid rewriting accurate historical records or unrelated current guidance.
- id: DEC-PRESERVE-EXACT-IDENTITIES
  title: Preserve immutable production and exact package pinning
  rationale: Publication changes only the accuracy of release-state prose. Exact CLI version pins and the full reviewed Action SHA remain the stronger deterministic identities for installation and production enforcement.
- id: DEC-REGISTRY-DISTINCTION
  title: Retain the npm latest distinction only when useful
  rationale: The registry fact that next identifies RC16 while latest remains RC15 may clarify prerelease installation, but it must not be repeated where it adds no guidance value.
```

## Constraints

```engineering-constraints
- id: CON-PUBLISHED-IDENTITY
  level: must
  statement: Current guidance in scope must state accurately that @engineeringspec/cli@0.1.0-rc.16 is published and v0.1.0-rc.16 exists, and must remove future-tense, pending-publication, or later-installability statements about RC16.
  applies_to: [TARGET-CURRENT-GUIDANCE]
  enforcement: { kind: test, verifier_ref: VER-CURRENT-GUIDANCE }
- id: CON-EXACT-CLI-PIN
  level: must
  statement: Every RC16 CLI example modified under this authority must retain the exact package identity @engineeringspec/cli@0.1.0-rc.16 rather than a mutable dist-tag or unpinned package reference.
  applies_to: [TARGET-CURRENT-GUIDANCE]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-IMMUTABLE-ACTION
  level: must
  statement: Production Action guidance in scope must retain the immutable anchor ddf813e4e69d9b2f9a9eb3f0f241747746021cf3 and must continue to state that the full reviewed SHA is stronger than a movable or release tag for production use.
  applies_to: [TARGET-CURRENT-GUIDANCE]
  enforcement: { kind: test, verifier_ref: VER-CURRENT-GUIDANCE }
- id: CON-DIST-TAGS
  level: must
  statement: If npm dist-tags are discussed in the changed guidance, the factual distinction must remain next = 0.1.0-rc.16 and latest = 0.1.0-rc.15; the implementation must not imply that latest already selects RC16.
  applies_to: [TARGET-CURRENT-GUIDANCE]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-HISTORICAL-PRESERVATION
  level: must
  statement: Historical contracts, changelog entries, release notes, receipts, evidence, and other records that accurately describe their earlier publication state must remain unchanged; implementation must not perform a repository-wide replacement.
  applies_to: [TARGET-CURRENT-GUIDANCE, TARGET-CONTRACT]
  enforcement: { kind: test, verifier_ref: VER-SCOPE }
- id: CON-DOCUMENTATION-ONLY
  level: must_not
  statement: This authority must not change runtime or CLI source, package or lock identity, schemas, action.yml, the Action anchor, workflows, README, site content, generated catalogues, release artifacts, Git tags, npm packages or dist-tags, consumers, or Agent Control Plane state.
  applies_to: [TARGET-CURRENT-GUIDANCE, TARGET-CONTRACT]
  enforcement: { kind: test, verifier_ref: VER-SCOPE }
- id: CON-EXACT-CLOSE
  level: must
  statement: After the documentation correction and separately trusted verification pass, an implementation pull request may change this exact revision only from approved to implemented without changing any other contract content; proposal and approval remain separate contract-only lifecycle changes.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: repository-maintainer }
- id: CON-RUNNERS-INERT
  level: must_not
  statement: Specification-declared runners are inert data and must not be executed merely because they appear in this contract.
  applies_to: [TARGET-CURRENT-GUIDANCE, TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: repository-maintainer }
```

## Verification

```engineering-verification
- id: VER-CURRENT-GUIDANCE
  proves: [CON-PUBLISHED-IDENTITY, CON-IMMUTABLE-ACTION]
  kind: test
  runner:
    type: reference
    reference: Repository-owned static checks and maintainer review of the three current guides for exact RC16 package, tag, Action SHA, and publication wording
- id: VER-SCOPE
  proves: [CON-HISTORICAL-PRESERVATION, CON-DOCUMENTATION-ONLY]
  kind: security
  runner:
    type: reference
    reference: Exact changed-path allowlist, strict catalogue validation, complete EngineeringSpec routing, historical-record inspection, and git diff review
- id: VER-REPOSITORY-CHECKS
  proves: [CON-EXACT-CLI-PIN, CON-DIST-TAGS, CON-EXACT-CLOSE, CON-RUNNERS-INERT]
  kind: test
  runner:
    type: reference
    reference: Separately trusted lint, typecheck, complete tests, conformance, build, package-content audit, npm audit, git diff checks, and complete-working-state routing
```

## Rollout

```engineering-rollout
strategy: manual
steps:
  - Review this proposal and its exact four-path authority inventory without editing current guidance.
  - Change this exact revision to approved in a separately reviewed lifecycle-only pull request and merge it to trusted main.
  - Start a fresh implementation branch from that trusted main and run engineeringspec work ES-RC16-PUBLISHED-GUIDANCE-CORRECTION before editing.
  - Correct only the three approved current-facing guides, preserving exact package pins, the immutable Action SHA, production SHA preference, and any relevant npm dist-tag distinction.
  - Run the complete repository verification, strict catalogue validation, stale-current-guidance search, and complete-change routing.
  - Include only the exact approved-to-implemented close if finish reports a safe implementation_with_monotonic_close state.
rollback:
  actions:
    - Revert inaccurate current-guidance edits without changing any immutable release, package, tag, Action, workflow, consumer, or historical record.
    - Obtain separately reviewed authority before correcting any additional current-facing file.
  owner: EngineeringSpec maintainers
```

## Non-goals

Runtime, CLI, package, lock, schema, Action, workflow, README, site, generated catalogue, release, Git tag, npm publication or dist-tag, consumer, historical-record, and Agent Control Plane changes are outside this proposal.
