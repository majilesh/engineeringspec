---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 2
id: ES-rc7-portable-governance-release
title: Publish the portable contract governance RC7 release
status: implemented
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
base_revision: "0867ea1"
---

# Publish the portable contract governance RC7 release

Prepare `v0.1.0-rc.7` from the reviewed portable contract-governance implementation so CLI, Action, generated-adoption, and Agent Skill consumers can safely propose, amend, and close specification-only changes without weakening approved-base implementation routing.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: rfcs/0005-portable-contract-governance-lane.md
  title: Portable contract-governance lane RFC
- id: SRC-2
  type: document
  ref: 0867ea1461f2280a0e0aa1c9bb14fb3d02a33d9b
  title: Reviewed portable contract-governance implementation merge
- id: SRC-3
  type: document
  ref: docs/engineering-specs/ES-portable-contract-governance.engineering-spec.md
  title: Portable governance implementation contract
```

## Target surfaces

```engineering-targets
- id: TARGET-version
  component: package-release
  paths:
    - package.json
    - package-lock.json
  change_policy: modify
- id: TARGET-adopt
  component: released-adoption-surface
  paths:
    - src/cli/adopt.ts
    - test/integration/cli.test.ts
    - skills/engineering-spec/SKILL.md
    - README.md
    - docs/agent-integration.md
    - docs/getting-started.md
    - docs/first-change-tutorial.md
    - docs/lifecycle.md
    - docs/maintaining-specs.md
    - docs/production-gate.md
    - docs/troubleshooting.md
    - maintainer-only adoption notes
  change_policy: modify
- id: TARGET-notes
  component: release-and-roadmap-notes
  paths:
    - CHANGELOG.md
    - maintainer-only roadmap
    - docs/engineering-specs/ES-rc7-portable-governance-release.engineering-spec.md
    - docs/engineering-specs/ES-portable-contract-governance.engineering-spec.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-1
  level: must
  statement: package.json and root package-lock metadata must declare version 0.1.0-rc.7.
  applies_to: [TARGET-version]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-2
  level: must
  statement: Generated and documented production Action examples must pin the full reviewed portable-governance implementation merge SHA 0867ea1461f2280a0e0aa1c9bb14fb3d02a33d9b.
  applies_to: [TARGET-adopt]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-3
  level: must
  statement: Current generated agent guidance, packaged skill commands, and current adoption documentation must use exact CLI version 0.1.0-rc.7 rather than RC6 or a mutable distribution tag, without rewriting historical release records.
  applies_to: [TARGET-adopt, TARGET-notes]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-4
  level: must
  statement: Generated workflow and guidance must enable gate-allow-contract-only and the matching CLI option only for directory routing while retaining strict validation, approved-base implementation routing, complete-working-state checks, and inert declared runners.
  applies_to: [TARGET-adopt]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-5
  level: must
  statement: RC7 package verification must demonstrate default compatibility, valid contract-only classification and closure status, mixed-change failure, strict workspace validation, and presence of the compiled governance module in the packed artifact.
  applies_to: [TARGET-version, TARGET-adopt]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-6
  level: must_not
  statement: Release preparation must not change EngineeringSpec format 0.1, schema, governance classification, routing semantics, diagnostics, runner inertness, or the tag-driven trusted-publishing boundary.
  applies_to: [TARGET-version, TARGET-adopt, TARGET-notes]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-7
  level: must
  statement: Release notes must describe the private consumer-discovered closure gap and the opt-in fail-closed fix without claiming unmeasured agent impact, broad adoption, or architectural enforcement.
  applies_to: [TARGET-notes]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-8
  level: must
  statement: Publication must remain gated by a version-matching v0.1.0-rc.7 tag created from the reviewed release merge after repository checks pass.
  applies_to: [TARGET-version, TARGET-notes]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-9
  level: must
  statement: This release contract must transition from approved to implemented in the release implementation so it cannot remain future implementation authority.
  applies_to: [TARGET-notes]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-10
  level: must
  statement: The completed ES-portable-contract-governance implementation contract must remain implemented and historical.
  applies_to: [TARGET-notes]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-11
  level: must
  statement: After publication, private consumer must upgrade to immutable RC7 CLI and Action identities before its pending Revenue Inbox contract closure is merged through the portable governance lane.
  applies_to: [TARGET-adopt, TARGET-notes]
  enforcement: { kind: review, reviewer_role: maintainer }
```

## Verification

```engineering-verification
- id: VER-1
  proves: [CON-1, CON-2, CON-3, CON-4, CON-5]
  kind: test
  runner:
    type: command
    argv: [npm, test]
    network: deny
  expected: { exit_code: 0 }
- id: VER-2
  proves: [CON-6, CON-7, CON-8, CON-9, CON-10, CON-11]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer review of immutable pins, release-only scope, trust-boundary compatibility, publishing, contract closure, and private consumer rollout
```

## Rollout

```engineering-rollout
strategy: canary
steps:
  - Merge this approved release contract through the contract-only governance lane.
  - Prepare RC7 against the merged base and run all trusted repository checks plus package inspection.
  - Merge the release implementation and create the annotated v0.1.0-rc.7 tag from its reviewed main commit.
  - Confirm npm publishes 0.1.0-rc.7 on the next dist-tag and smoke-test contract-only closure from a clean temporary repository.
  - Upgrade private consumer's CLI guidance and Action pin, then merge its lifecycle-only Revenue Inbox closure.
rollback:
  actions:
    - Do not move or reuse the RC7 tag.
    - Keep consumers on immutable RC6 pins with repository-specific governance until a corrective release candidate is published.
  owner: EngineeringSpec maintainers
```
