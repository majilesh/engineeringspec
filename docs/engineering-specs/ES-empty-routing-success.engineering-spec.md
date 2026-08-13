---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 2
id: ES-empty-routing-success
title: Handle routing lifecycle edge cases
status: implemented
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
base_revision: c166a80
---

# Handle routing lifecycle edge cases

Implement the approved routing-lifecycle RFC so agent self-checks succeed when there are no changed paths and no active contract, and add a path-constrained contract-only CI lane without weakening authorization for implementation changes.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: rfcs/0003-vacuous-empty-routing.md
  title: Vacuous success for empty routing input RFC
```

## Target surfaces

```engineering-targets
- id: TARGET-routing
  component: routing-core
  paths:
    - src/routing/route.ts
  change_policy: modify
- id: TARGET-ci
  component: repository-enforcement
  paths:
    - .github/workflows/ci.yml
    - .github/CODEOWNERS
  change_policy: modify
- id: TARGET-tests
  component: routing-verification
  paths:
    - test/unit/routing.test.ts
    - test/integration/cli.test.ts
    - test/integration/routing.test.ts
    - test/conformance/routing.test.ts
    - conformance/routing/**
  change_policy: modify
- id: TARGET-guidance
  component: adoption-guidance
  paths:
    - README.md
    - CHANGELOG.md
    - _internal/roadmap.md
    - docs/agent-integration.md
    - rfcs/0003-vacuous-empty-routing.md
    - docs/engineering-specs/ES-empty-routing-success.engineering-spec.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-1
  level: must
  statement: A successfully collected zero-path working state must return a successful routing result with zero routes and no ESRT001 diagnostic even when no candidate has a required lifecycle status.
  applies_to: [TARGET-routing]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-2
  level: must
  statement: Any non-empty changed-path set with no eligible contract must continue to fail closed with ESRT001 before path selection.
  applies_to: [TARGET-routing, TARGET-tests]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-3
  level: must
  statement: Base resolution, candidate discovery, candidate validation, strict-warning handling, deterministic summaries, and digest binding must remain active for an empty working state.
  applies_to: [TARGET-routing, TARGET-tests]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-4
  level: must
  statement: Duplicate eligible specification IDs must continue to fail with ESRT005 even when there are no changed paths.
  applies_to: [TARGET-routing, TARGET-tests]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-5
  level: must
  statement: Multi-spec check must report declared coverage as not_applicable for a successful empty working state, and select, check, and gate-spec-dir must share the same routing decision.
  applies_to: [TARGET-routing, TARGET-tests]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-6
  level: must_not
  statement: The change must not weaken non-empty authorization, load workspace contracts as authority, execute specification runners, mutate the repository, or change the EngineeringSpec format or schema.
  applies_to: [TARGET-routing, TARGET-ci, TARGET-tests, TARGET-guidance]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-7
  level: must
  statement: Existing single-spec gate, check, receipt, diagnostic-code, and exit-code behavior must remain compatible.
  applies_to: [TARGET-routing, TARGET-tests]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-8
  level: must
  statement: Guidance must distinguish a clean not-applicable result from authorization and retain the contract-only then implementation lifecycle rule.
  applies_to: [TARGET-guidance]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-9
  level: must
  statement: The implementation must transition this contract from approved to implemented after all verification passes.
  applies_to: [TARGET-guidance]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-10
  level: must
  statement: Repository CI may bypass implementation routing only when every base-to-head changed path is under docs/engineering-specs or rfcs; empty, malformed, and mixed diffs must not enter that lane.
  applies_to: [TARGET-ci, TARGET-tests]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-11
  level: must
  statement: Contract-only changes must retain strict EngineeringSpec validation, normal repository verification, and explicit maintainer ownership of contracts, RFCs, CI, and CODEOWNERS.
  applies_to: [TARGET-ci, TARGET-guidance]
  enforcement: { kind: review, reviewer_role: maintainer }
```

## Verification

```engineering-verification
- id: VER-1
  proves: [CON-1, CON-2, CON-3, CON-4, CON-5, CON-6, CON-7, CON-10]
  kind: test
  runner:
    type: command
    argv: [npm, test]
    network: deny
  expected: { exit_code: 0 }
- id: VER-2
  proves: [CON-8, CON-9, CON-11]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer review of empty-state semantics, contract-only CI boundaries, lifecycle guidance, and contract closure
```

## Rollout

```engineering-rollout
strategy: canary
steps:
  - Merge this RFC and contract-only authorization change using maintainer review; no active approved base contract exists for the bootstrap PR.
  - Implement the shared routing change against this approved contract from the merged base.
  - Install the path-constrained contract-only CI lane and switch the compatible single-spec gate to this contract while retaining directory-routing dogfood.
  - Verify clean and non-empty behavior through unit, integration, conformance, and Action coverage.
  - Transition this contract to implemented in the implementation PR.
rollback:
  actions:
    - Revert to unconditional ESRT001 when zero contracts are eligible.
    - Keep non-empty directory routing and single-spec enforcement unchanged.
  owner: EngineeringSpec maintainers
```
