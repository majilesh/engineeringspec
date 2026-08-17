---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-rc14-release-readiness
title: Make the RC14 adoption path release-ready
status: approved
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
---

# Make the RC14 adoption path release-ready

Align adoption scaffolding, immutable GitHub Action enforcement, tutorials, CLI information architecture, and machine-readable workflow guidance with the already implemented RC14 two-PR authority model. Record the boundary between EngineeringSpec and an optional Agent Control Plane without implementing runtime orchestration or weakening approved-base authority.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: rc14-release-readiness-review-2026-08-17
  title: Independent RC14 developer-experience and release-readiness review
- id: SRC-2
  type: document
  ref: rfcs/0011-maximum-safety-minimum-ceremony.md
  title: RC14 maximum safety with minimum ceremony RFC
- id: SRC-3
  type: document
  ref: docs/engineering-specs/ES-rc14-maximum-safety-minimum-ceremony.engineering-spec.md
  title: Implemented RC14 authority and workflow contract
```

## Target surfaces

```engineering-targets
- id: TARGET-adoption
  component: rc14-adoption-scaffolding-and-action-pin
  paths:
    - src/cli/adopt.ts
    - src/adoption/releases.ts
  change_policy: modify
- id: TARGET-next
  component: informational-workflow-semantics
  paths:
    - src/cli/next.ts
  change_policy: modify
- id: TARGET-tests-new
  component: release-readiness-regressions
  paths:
    - test/unit/release-readiness.test.ts
  change_policy: create
- id: TARGET-tests
  component: adoption-and-workflow-regressions
  paths:
    - test/integration/cli.test.ts
    - test/integration/rc14.test.ts
    - test/unit/doctor.test.ts
    - test/unit/package-contents.test.ts
  change_policy: modify
- id: TARGET-guidance
  component: coherent-rc14-user-and-agent-guidance
  paths:
    - README.md
    - CHANGELOG.md
    - docs/getting-started.md
    - docs/first-change-tutorial.md
    - docs/lifecycle.md
    - docs/cli-reference.md
    - docs/agent-integration.md
    - docs/maintaining-specs.md
    - skills/engineering-spec/SKILL.md
  change_policy: modify
- id: TARGET-control-plane
  component: agent-control-plane-architecture-boundary
  paths:
    - docs/agent-control-plane.md
  change_policy: create
- id: TARGET-contract
  component: rc14-release-readiness-lifecycle
  paths:
    - docs/engineering-specs/ES-rc14-release-readiness.engineering-spec.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-1
  level: must
  statement: Generated adoption guidance must present next, work, trusted repository checks, and finish as the normal developer and coding-agent path, while retaining the explore, propose, separately merge approved authority, implement, verify, and close lifecycle.
  applies_to: [TARGET-adoption, TARGET-tests, TARGET-tests-new, TARGET-guidance]
  enforcement: { kind: test, verifier_ref: VER-ADOPTION }
- id: CON-2
  level: must
  statement: Generated and primary guidance must state that next is informational and grants no implementation permission; implementation may begin only when permission is implementation and work successfully loads the exact approved trusted-base contract.
  applies_to: [TARGET-adoption, TARGET-next, TARGET-tests, TARGET-tests-new, TARGET-guidance]
  enforcement: { kind: test, verifier_ref: VER-ADOPTION }
- id: CON-3
  level: must
  statement: Work guidance must allow repository reading needed for correctness, restrict writing to returned writable surfaces, and require a separately reviewed and merged authority amendment before widening scope.
  applies_to: [TARGET-adoption, TARGET-guidance]
  enforcement: { kind: test, verifier_ref: VER-ADOPTION }
- id: CON-4
  level: must
  statement: Finish guidance must explain that exact approved-to-implemented closure may accompany the implementation that spends that contract, standalone closure remains valid but is not normally required, and finish never stages, commits, pushes, approves, merges, or executes specification-declared runners.
  applies_to: [TARGET-adoption, TARGET-tests, TARGET-tests-new, TARGET-guidance]
  enforcement: { kind: test, verifier_ref: VER-ADOPTION }
- id: CON-5
  level: must
  statement: Generated GitHub enforcement must pin an immutable commit that predates the release commit but contains trusted-base candidate loading, base-only authorization, implementation_with_monotonic_close routing, exact safe closure handling, unsafe and unrelated closure rejection, and current fail-closed semantics.
  applies_to: [TARGET-adoption, TARGET-tests, TARGET-tests-new]
  enforcement: { kind: test, verifier_ref: VER-ACTION }
- id: CON-6
  level: must_not
  statement: Release choreography must not use a mutable Action ref or publish an RC14 CLI whose adopt output scaffolds a pre-RC14 Action runtime.
  applies_to: [TARGET-adoption, TARGET-tests-new, TARGET-guidance]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-7
  level: must
  statement: Tutorials and lifecycle guidance must teach one reviewed authority pull request followed by one implementation plus exact monotonic-close pull request, rejecting semantic mutation, authority widening, and unrelated closure in the spending pull request.
  applies_to: [TARGET-guidance, TARGET-tests-new]
  enforcement: { kind: test, verifier_ref: VER-DOCS }
- id: CON-8
  level: must
  statement: Finish output examples must use a path outside the evaluated Git worktree and explain that evidence output inside the worktree would mutate the state whose digest was evaluated.
  applies_to: [TARGET-guidance, TARGET-tests-new]
  enforcement: { kind: test, verifier_ref: VER-DOCS }
- id: CON-9
  level: must
  statement: CLI documentation must distinguish daily workflow commands, advanced inspection and troubleshooting primitives, CI enforcement primitives, and measurement commands without removing or reimplementing existing commands.
  applies_to: [TARGET-guidance]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-10
  level: must
  statement: Any new next machine fields must be additive, deterministic, backwards compatible, preserve existing field meanings and exit behavior, and distinguish successful analysis from workflow permission.
  applies_to: [TARGET-next, TARGET-tests]
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-11
  level: must
  statement: EngineeringSpec must remain the portable agent-neutral Git-native authority layer, and the architecture boundary must assign runtime orchestration, identity, sandboxes, tools, secrets, scheduling, trusted execution, telemetry, and durable runtime history to an optional downstream Agent Control Plane.
  applies_to: [TARGET-control-plane, TARGET-guidance]
  enforcement: { kind: review, reviewer_role: architecture-reviewer }
- id: CON-12
  level: must
  statement: The documented control plane may only restrict approved authority, must bind tasks to immutable repository, base, contract, revision, and semantic-digest identity, and may delegate only subsets; control-plane state must never create or widen repository authority.
  applies_to: [TARGET-control-plane]
  enforcement: { kind: review, reviewer_role: security-reviewer }
- id: CON-13
  level: must
  statement: Specification runner payloads must remain inert and omitted from normal agent-facing output; executable verifier mappings must come from separately trusted repository or control-plane policy, and evidence claims must remain deterministic and must not overstate unsigned receipts as cryptographic proof.
  applies_to: [TARGET-adoption, TARGET-next, TARGET-tests, TARGET-tests-new, TARGET-guidance, TARGET-control-plane]
  enforcement: { kind: test, verifier_ref: VER-ADVERSARIAL }
- id: CON-14
  level: must_not
  statement: This release-readiness increment must not change format 0.1, weaken base-pinned routing or exact semantic closure checks, implement an Agent Control Plane, execute verifiers from specification declarations, add hosted services, add vendor-specific core behavior, or publish, tag, release, or update external consumers.
  applies_to: [TARGET-adoption, TARGET-next, TARGET-tests-new, TARGET-tests, TARGET-guidance, TARGET-control-plane]
  enforcement: { kind: test, verifier_ref: VER-ADVERSARIAL }
- id: CON-15
  level: must
  statement: The implementation must preserve advanced command compatibility, existing routing and governance conformance, workspace and head configuration isolation, exact monotonic-close acceptance, semantic mutation rejection, unrelated-close rejection, and complete working-state fail-closed enforcement.
  applies_to: [TARGET-adoption, TARGET-next, TARGET-tests, TARGET-tests-new, TARGET-guidance]
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-16
  level: must
  statement: This contract may transition from approved to implemented only in the implementation pull request after all trusted checks and maintainer, security, architecture, and release-readiness reviews pass without widening authority.
  applies_to: [TARGET-contract]
  enforcement: { kind: review, reviewer_role: maintainer }
```

## Verification

```engineering-verification
- id: VER-ADOPTION
  proves: [CON-1, CON-2, CON-3, CON-4]
  kind: test
  runner:
    type: command
    argv: [npm, test]
    network: deny
  expected: { exit_code: 0 }
- id: VER-ACTION
  proves: [CON-5]
  kind: security
  runner:
    type: command
    argv: [npm, test]
    network: deny
  expected: { exit_code: 0 }
- id: VER-DOCS
  proves: [CON-7, CON-8]
  kind: test
  runner:
    type: command
    argv: [npm, test]
    network: deny
  expected: { exit_code: 0 }
- id: VER-CONFORMANCE
  proves: [CON-10, CON-15]
  kind: test
  runner:
    type: command
    argv: [npm, run, test:conformance]
    network: deny
  expected: { exit_code: 0 }
- id: VER-ADVERSARIAL
  proves: [CON-13, CON-14]
  kind: security
  runner:
    type: command
    argv: [npm, test]
    network: deny
  expected: { exit_code: 0 }
- id: VER-REVIEW
  proves: [CON-6, CON-9, CON-11, CON-12, CON-16]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer, release, security, and architecture review of RC14 adoption coherence, immutable Action compatibility, authority boundaries, and explicit non-goals
```

## Rollout

```engineering-rollout
strategy: manual
steps:
  - Review this contract-only proposal and narrow any unnecessary surface.
  - Merge the exact contract with status approved before dependent implementation begins.
  - Update adoption scaffolding, the immutable RC14-capable Action pin, workflow semantics, documentation, and the control-plane architecture boundary.
  - Run all trusted repository, conformance, package, demo, and complete-working-state checks.
  - Include only the exact approved-to-implemented close of this spent contract in the implementation pull request.
  - Perform version and immutable-pin release choreography only in a separately authorized release step after implementation review.
rollback:
  actions:
    - Revert adoption and documentation changes while retaining the implemented RC14 authority model.
    - Continue using explicit lower-level CLI primitives if high-level guidance is found inaccurate.
    - Refuse RC14 publication if the immutable Action pin cannot be proven compatible with mixed monotonic close.
  owner: EngineeringSpec maintainers
```

## Non-goals

Publishing RC14, changing package versions, creating tags or releases, mutating consumers, implementing a control plane, adding MCP or hosted services, executing specification runners, changing format 0.1, and weakening the grant-versus-spend invariant are outside this contract.
