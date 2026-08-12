---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-actionable-diagnostic-hints
title: Surface accurate actionable diagnostic hints
status: implemented
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
base_revision: "aa11f08"
---

# Surface accurate actionable diagnostic hints

Make existing diagnostic remediation visible in human-readable CLI output and GitHub annotations, and ensure ESRT002 guidance recommends the contract-only lane only when that lane can actually classify the complete change.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: docs/troubleshooting.md
  title: Existing routing-remediation guidance
- id: SRC-2
  type: document
  ref: ESRT002-hint-review
  title: Review of missing and misleading agent-facing diagnostic hints
```

## Target surfaces

```engineering-targets
- id: TARGET-diagnostics
  component: human-and-ci-diagnostic-rendering
  paths:
    - src/diagnostics/formatter.ts
    - src/diagnostics/github.ts
    - test/unit/core.test.ts
    - test/unit/github-format.test.ts
  change_policy: modify
- id: TARGET-routing
  component: context-accurate-routing-remediation
  paths:
    - src/routing/governance.ts
    - src/routing/route.ts
    - src/routing/select.ts
    - test/unit/governance.test.ts
    - test/unit/routing.test.ts
    - test/integration/routing.test.ts
  change_policy: modify
- id: TARGET-contract
  component: diagnostic-hints-lifecycle
  paths:
    - docs/engineering-specs/ES-actionable-diagnostic-hints.engineering-spec.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-1
  level: must
  statement: Human-readable text diagnostics and GitHub annotations must surface a diagnostic hint when present without changing diagnostics that have no hint.
  applies_to: [TARGET-diagnostics]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-2
  level: must
  statement: GitHub annotation output must escape the complete message and appended hint after composition so hint content cannot alter annotation command structure.
  applies_to: [TARGET-diagnostics]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-3
  level: must
  statement: ESRT002 may recommend --allow-contract-only only when every changed path is a valid EngineeringSpec filename inside the configured non-root specification directory; mixed changes and specification-named paths outside that directory must instead instruct the user to split or amend authority.
  applies_to: [TARGET-routing]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-4
  level: must
  statement: Invalid workspace governance paths must include actionable remediation while remaining errors under the existing fail-closed contract-only inspection.
  applies_to: [TARGET-routing]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-5
  level: must_not
  statement: This correction must not change diagnostic codes, severity, routing or governance decisions, approved-base authority, strict-mode behavior, target policy meanings, format 0.1, runner inertness, or command execution behavior.
  applies_to: [TARGET-diagnostics, TARGET-routing]
  enforcement: { kind: test, verifier_ref: VER-2 }
- id: CON-6
  level: must
  statement: Regression coverage must include hints present and absent in text and GitHub output, escaped annotation data, eligible contract-only changes, mixed specification and implementation changes, specification-named paths outside the configured directory, and invalid workspace governance.
  applies_to: [TARGET-diagnostics, TARGET-routing]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-7
  level: must
  statement: The contract must transition from approved to implemented only after the correction passes trusted repository checks and maintainer review without widening its targets.
  applies_to: [TARGET-contract]
  enforcement: { kind: review, reviewer_role: maintainer }
```

## Verification

```engineering-verification
- id: VER-1
  proves: [CON-1, CON-2, CON-3, CON-4, CON-6]
  kind: test
  runner:
    type: command
    argv: [npm, test]
    network: deny
  expected: { exit_code: 0 }
- id: VER-2
  proves: [CON-5]
  kind: test
  runner:
    type: command
    argv: [npm, run, test:conformance]
    network: deny
  expected: { exit_code: 0 }
- id: VER-3
  proves: [CON-7]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer review of diagnostic compatibility, actionable remediation accuracy, fail-closed routing, and lifecycle closure
```

## Rollout

```engineering-rollout
strategy: canary
steps:
  - Merge this proposed contract as a contract-only change; it grants no implementation authority.
  - Approve it in a separate reviewed lifecycle-only change.
  - Rebase the preserved implementation branch onto the approved base and load the base-pinned preparation brief before editing.
  - Correct context-sensitive remediation, add the missing regression cases, and run all trusted repository and EngineeringSpec checks.
  - Merge the reviewed implementation and close the contract separately.
rollback:
  actions:
    - Revert the formatter and routing-remediation correction while retaining the previous fail-closed diagnostic decisions.
    - Publish any release correction under a new immutable version rather than moving an existing tag.
  owner: EngineeringSpec maintainers
```
