---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-discontinue-stale-proposed
title: Discontinue three replaced proposed contracts on main
status: implemented
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
---

# Discontinue three replaced proposed contracts on main

Three contracts remain `proposed` on the trusted base after their work shipped and was replaced by later implemented contracts and releases. They make lifecycle guidance report active proposal work instead of an otherwise idle state. This governance-only change records those three contracts as `superseded` with precise pointers to the implementation history and later authority that replaced them.

`ES-precode-brief-evidence-pilot` is intentionally excluded. RC10 through RC12 shipped the pre-code brief, benchmark, pilot kit, and later evidence hardening, but the retained release record still reports zero external-pilot observations. Superseding that proposal could hide unfinished evidence work rather than close a purely historical leftover.

This contract authorizes no `src/**`, RFC, or package change.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: other
  ref: next-explore-four-proposed-2026-08-18
  title: next reports four draft/proposed candidates that are not implementation authority
- id: SRC-2
  type: document
  ref: docs/engineering-specs/ES-rc14-release.engineering-spec.md
  title: Implemented RC14 release authority that replaced RC3 release preparation
- id: SRC-3
  type: document
  ref: docs/engineering-specs/ES-multi-spec-routing.engineering-spec.md
  title: Implemented approved-base routing authority that replaced the original diff-gate proposal
- id: SRC-4
  type: document
  ref: docs/engineering-specs/ES-frictionless-adoption-launch.engineering-spec.md
  title: Implemented adoption and agent-integration authority replacing the original adoption proposal
- id: SRC-5
  type: other
  ref: c39cf1de1f4216ec651c4b27c91bf4e416292220
  title: Historical recursive validation, GitHub Action, and public-site implementation commit
- id: SRC-6
  type: document
  ref: CHANGELOG.md
  title: RC3 release record and explicit RC10-RC12 zero-observation external-pilot record
- id: SRC-7
  type: document
  ref: docs/lifecycle.md
  title: superseded is the non-authoritative terminal state for replaced proposals
```

## Target surfaces

```engineering-targets
- id: TARGET-stale
  component: leftover-proposed-lifecycle
  paths:
    - docs/engineering-specs/ES-gate-diff-scope.engineering-spec.md
    - docs/engineering-specs/ES-rc3-release.engineering-spec.md
    - docs/engineering-specs/agent-ready-adoption.engineering-spec.md
  change_policy: modify
- id: TARGET-contract
  component: discontinue-lifecycle
  paths:
    - docs/engineering-specs/ES-discontinue-stale-proposed.engineering-spec.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-SUPERSEDE-ONLY
  level: must
  statement: Each listed leftover contract may change only metadata.status to superseded plus a short prose pointer to the later shipped contract. Targets, constraints, verifiers, sources, identifiers, and revision semantics of those documents must otherwise remain intact.
  applies_to: [TARGET-stale]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-NO-CODE
  level: must_not
  statement: This change must not modify source, tests, RFCs, skills, CI, or package metadata.
  applies_to: [TARGET-stale, TARGET-contract]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-POINTERS
  level: must
  statement: ES-rc3-release must point at implementation commit e72c134298b329be70cfd21f4e26923b708452d3, tag v0.1.0-rc.3, and the later implemented ES-rc14-release authority; ES-gate-diff-scope must point at the shipped RC2/RC3 gate series and implemented ES-multi-spec-routing successor; agent-ready-adoption must point at implementation commit c39cf1de1f4216ec651c4b27c91bf4e416292220 plus the implemented ES-multi-spec-routing and ES-frictionless-adoption-launch successors. If a maintainer finds any listed leftover still represents unfinished work, that file must be left proposed and removed from this change.
  applies_to: [TARGET-stale]
  enforcement: { kind: review, reviewer_role: maintainer }
```

## Verification

```engineering-verification
- id: VER-VALIDATE
  proves: [CON-SUPERSEDE-ONLY, CON-POINTERS]
  kind: test
  runner:
    type: reference
    reference: engineeringspec validate docs/engineering-specs --strict after the status-only edits
- id: VER-REVIEW
  proves: [CON-NO-CODE, CON-POINTERS]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer confirms each superseded file is historical leftover rather than open work
```

## Rollout

```engineering-rollout
strategy: manual
steps:
  - Maintainer confirms each of the three listed files is a replaced historical leftover and confirms ES-precode-brief-evidence-pilot remains proposed.
  - Merge this contract as approved.
  - Apply status superseded plus pointers in a later contract-only or monotonic-close implementation as routing allows.
rollback:
  actions:
    - Restore any changed file to proposed if it is later found to represent open work.
  owner: EngineeringSpec maintainers
```

## Non-goals

The pre-code external pilot, compact agent tickets, RFC 0012, and any runtime change remain outside this contract.
