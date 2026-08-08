---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-multi-spec-routing
title: Deterministic multi-spec routing
status: approved
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
base_revision: 0f9f0a3
---

# Deterministic multi-spec routing

Implement the approved multi-spec routing RFC as a read-only authorization layer over base-pinned EngineeringSpec candidates. Preserve the existing single-spec interface while allowing CI and coding agents to select exactly one approved contract for every changed path.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: rfcs/0002-deterministic-multi-spec-routing.md
  title: Deterministic multi-spec routing RFC
```

## Target surfaces

```engineering-targets
- id: TARGET-routing
  component: routing-core
  paths:
    - src/routing/**
    - src/discovery/**
    - src/gate/loadSpec.ts
    - src/gate/collectDiff.ts
    - src/gate/types.ts
    - src/query/**
    - src/diagnostics/codes.ts
    - src/index.ts
  change_policy: modify
- id: TARGET-cli
  component: cli-and-action
  paths:
    - src/cli/program.ts
    - src/cli/agentCheck.ts
    - src/cli/adopt.ts
    - action.yml
  change_policy: modify
- id: TARGET-tests
  component: verification
  paths:
    - test/**
    - conformance/**
    - vitest.config.ts
  change_policy: modify
- id: TARGET-guidance
  component: adoption-guidance
  paths:
    - AGENTS.md
    - CLAUDE.md
    - .cursor/rules/**
    - .github/workflows/ci.yml
    - README.md
    - maintainer-only roadmap
    - CHANGELOG.md
    - docs/**
    - skills/**
    - benchmarks/**
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-1
  level: must
  statement: Multi-spec routing must resolve the base SHA once and enumerate and load every candidate from that same immutable Git tree without workspace fallback.
  applies_to: [TARGET-routing, TARGET-cli]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-2
  level: must
  statement: Candidate discovery must be recursive, deterministic, restricted to supported EngineeringSpec filenames, null-delimited, bounded, and fail closed on malformed Git output.
  applies_to: [TARGET-routing]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-3
  level: must
  statement: Every discovered candidate must validate before lifecycle filtering; strict warnings, invalid candidates, duplicate eligible spec IDs, and zero eligible contracts must fail closed.
  applies_to: [TARGET-routing, TARGET-cli]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-4
  level: must
  statement: Every changed path must resolve to exactly one allowing approved contract; uncovered paths and multiple allowing claims must fail with stable routing diagnostics.
  applies_to: [TARGET-routing, TARGET-cli]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-5
  level: must
  statement: A denying target in any eligible contract must override all allowing claims across the candidate set.
  applies_to: [TARGET-routing]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-6
  level: must
  statement: Routing output must deterministically bind the resolved base SHA, candidate paths and digests, specification IDs, changed-file digest, per-path decisions, and matching target IDs.
  applies_to: [TARGET-routing, TARGET-cli]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-7
  level: must_not
  statement: Selection, multi-spec checking, discovery, validation, and context construction must not execute specification runners or mutate the repository.
  applies_to: [TARGET-routing, TARGET-cli]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-8
  level: must
  statement: Multi-spec check must cover the complete working state, including committed, staged, unstaged, deleted, renamed, and non-ignored untracked paths.
  applies_to: [TARGET-routing, TARGET-cli, TARGET-tests]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-9
  level: must
  statement: The Action and generated adoption workflow must use strict, approved-only, base-pinned directory routing while preserving the existing single-spec inputs.
  applies_to: [TARGET-cli, TARGET-guidance]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-10
  level: must
  statement: ESRT001 through ESRT005 must each identify exactly one routing failure condition and be registered centrally.
  applies_to: [TARGET-routing, TARGET-tests]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-11
  level: must
  statement: Existing single-spec gate, check, receipt, exit-code, and output behavior must remain compatible.
  applies_to: [TARGET-routing, TARGET-cli, TARGET-tests]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-12
  level: must
  statement: Agent guidance must explain approved-contract lifecycle, ambiguity remediation, and the two-phase rule without introducing vendor-specific core behavior.
  applies_to: [TARGET-guidance]
  enforcement: { kind: review, reviewer_role: maintainer }
```

## Verification

```engineering-verification
- id: VER-1
  proves: [CON-1, CON-2, CON-3, CON-4, CON-5, CON-6, CON-7, CON-8, CON-9, CON-10, CON-11]
  kind: test
  runner:
    type: command
    argv: [npm, test]
    network: deny
  expected: { exit_code: 0 }
- id: VER-2
  proves: [CON-12]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer review of lifecycle guidance, ambiguity handling, and agent neutrality
```

## Rollout

```engineering-rollout
strategy: canary
steps:
  - Merge this contract-only change before implementation begins.
  - Implement routing against this approved contract from the merged base.
  - Dogfood directory routing in this repository without removing the single-spec CI fallback.
  - Pilot directory routing in at least two consumer repositories before making it the default adoption path.
rollback:
  actions:
    - Revert generated adoption CI to the compatible single-spec gate input.
    - Keep the routing command available for non-enforcing diagnosis while correcting defects.
  owner: EngineeringSpec maintainers
```
