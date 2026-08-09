---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-portable-contract-governance
title: Make contract lifecycle governance work for adopters
status: approved
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
---

# Make contract lifecycle governance work for adopters

Implement the portable, opt-in contract-governance lane defined by RFC 0005 so consumers can propose, amend, and close specifications without weakening approved-base authorization or maintaining repository-specific shell policy.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: rfcs/0005-portable-contract-governance-lane.md
  title: Portable contract-governance lane RFC
- id: SRC-2
  type: document
  ref: docs/first-change-tutorial.md
  title: Documented six-stage lifecycle
```

## Target surfaces

```engineering-targets
- id: TARGET-routing
  component: contract-governance-classification
  paths:
    - src/routing/governance.ts
    - src/routing/select.ts
    - src/routing/types.ts
    - src/gate/collectDiff.ts
  change_policy: modify
- id: TARGET-cli
  component: lifecycle-cli
  paths:
    - src/cli/program.ts
    - src/cli/status.ts
    - src/index.ts
  change_policy: modify
- id: TARGET-action
  component: portable-enforcement
  paths:
    - action.yml
    - src/cli/adopt.ts
  change_policy: modify
- id: TARGET-tests
  component: governance-verification
  paths:
    - test/unit/governance.test.ts
    - test/unit/status.test.ts
    - test/integration/cli.test.ts
    - test/integration/routing.test.ts
    - test/conformance/governance.test.ts
    - conformance/governance/manifest.json
  change_policy: modify
- id: TARGET-guidance
  component: adopter-lifecycle-guidance
  paths:
    - README.md
    - CHANGELOG.md
    - maintainer-only roadmap
    - docs/agent-integration.md
    - docs/getting-started.md
    - docs/first-change-tutorial.md
    - docs/lifecycle.md
    - docs/maintaining-specs.md
    - docs/production-gate.md
    - docs/troubleshooting.md
    - maintainer-only adoption notes
    - skills/engineering-spec/SKILL.md
  change_policy: modify
- id: TARGET-contract
  component: governance-contract
  paths:
    - docs/engineering-specs/ES-portable-contract-governance.engineering-spec.md
    - rfcs/0005-portable-contract-governance-lane.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-1
  level: must
  statement: Contract-only governance must be explicit and must classify a non-empty change only when every old and new changed path is contained within the normalized repository-relative specification directory.
  applies_to: [TARGET-routing, TARGET-cli, TARGET-action, TARGET-tests]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-2
  level: must
  statement: A classified governance change must strictly validate workspace specifications and report a distinct machine-readable classification without claiming selection by an approved base contract.
  applies_to: [TARGET-routing, TARGET-cli, TARGET-action, TARGET-tests]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-3
  level: must
  statement: Any mixed specification-and-non-specification change, cross-boundary rename, empty change, unsafe path, invalid contract, or strict validation warning must remain fail closed under existing approved-base routing semantics.
  applies_to: [TARGET-routing, TARGET-cli, TARGET-action, TARGET-tests]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-4
  level: must_not
  statement: Workspace specification content must not authorize implementation, widen targets for the same review unit, manufacture verification evidence, or execute a declared runner.
  applies_to: [TARGET-routing, TARGET-cli, TARGET-action, TARGET-tests, TARGET-guidance]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-5
  level: must
  statement: Existing select, check, status, gate, context, explain, validation, diagnostics, receipts, and default Action behavior must remain compatible when contract-only governance is not explicitly enabled.
  applies_to: [TARGET-routing, TARGET-cli, TARGET-action, TARGET-tests]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-6
  level: must
  statement: The GitHub Action must expose the policy only with directory routing, delegate classification to the shared CLI implementation, and reject incompatible single-spec configuration.
  applies_to: [TARGET-action, TARGET-tests]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-7
  level: must
  statement: Generated adoption workflows and agent guidance must enable and explain the portable governance lane, immutable pins, strict validation, separate implementation PRs, and reviewer-owned lifecycle transitions.
  applies_to: [TARGET-action, TARGET-guidance]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-8
  level: must
  statement: Status must identify contract-only governance and recommend closure only when review content represents a valid lifecycle transition out of approved; it must remain read-only and must not infer completion from Git history.
  applies_to: [TARGET-cli, TARGET-tests, TARGET-guidance]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-9
  level: must
  statement: Conformance vectors must cover specification-only, mixed, empty, nested, prefix-confusion, and cross-boundary rename cases.
  applies_to: [TARGET-tests]
  enforcement: { kind: test, verifier_ref: VER-2 }
- id: CON-10
  level: must_not
  statement: This change must not alter EngineeringSpec format 0.1, add an autonomous lifecycle mutation, add a hosted service, or introduce vendor-specific behavior into the core format.
  applies_to: [TARGET-routing, TARGET-cli, TARGET-action, TARGET-guidance, TARGET-contract]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-11
  level: must
  statement: Documentation must require CODEOWNERS or equivalent maintainer review and normal trusted repository checks for governance changes because path classification is not approval evidence.
  applies_to: [TARGET-guidance]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-12
  level: must
  statement: After trusted checks and private consumer dogfood pass, this contract must transition to implemented without widening its targets.
  applies_to: [TARGET-contract]
  enforcement: { kind: review, reviewer_role: maintainer }
```

## Verification

```engineering-verification
- id: VER-1
  proves: [CON-1, CON-2, CON-3, CON-4, CON-5, CON-6, CON-8]
  kind: test
  runner:
    type: command
    argv: [npm, test]
    network: deny
  expected: { exit_code: 0 }
- id: VER-2
  proves: [CON-9]
  kind: test
  runner:
    type: command
    argv: [npm, run, test:conformance]
    network: deny
  expected: { exit_code: 0 }
- id: VER-3
  proves: [CON-7, CON-10, CON-11, CON-12]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer review of consumer governance boundaries, adoption safety, lifecycle ownership, and dogfood closure
```

## Rollout

```engineering-rollout
strategy: canary
steps:
  - Merge this RFC and approved contract through the repository contract-only lane.
  - Implement the shared classifier, CLI options, Action input, generated adoption workflow, documentation, and adversarial coverage against the merged base.
  - Publish a separately reviewed release candidate with immutable npm and Action identities.
  - Upgrade private consumer and close ES-revenue-followup-copilot through the portable governance lane.
rollback:
  actions:
    - Disable the opt-in Action and CLI option while retaining strict approved-only implementation routing.
    - Revert generated adopter guidance to require a repository-specific reviewed governance lane.
  owner: EngineeringSpec maintainers
```
