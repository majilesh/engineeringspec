---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-rc14-maximum-safety-minimum-ceremony
title: Maximum safety with minimum ceremony
status: draft
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
---

# Maximum safety with minimum ceremony

Reduce the normal new-authority workflow to two meaningful pull requests and zero repeated repository flags while preserving exact trusted-base authorization, fail-closed routing, inert specification runners, and backward compatibility. Compose existing primitives rather than creating a parallel workflow engine.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: rfcs/0011-maximum-safety-minimum-ceremony.md
  title: RC14 maximum safety with minimum ceremony RFC
- id: SRC-2
  type: other
  ref: agent-control-plane-dogfood-2026-08
  title: Multi-milestone agent runtime dogfood findings on lifecycle and command ceremony
- id: SRC-3
  type: document
  ref: rfcs/0001-agent-first-trust-loop.md
  title: Original base-pinned agent trust loop
- id: SRC-4
  type: document
  ref: rfcs/0005-portable-contract-governance-lane.md
  title: Existing contract-only governance semantics
```

## Target surfaces

```engineering-targets
- id: TARGET-rfc
  component: rc14-design
  paths:
    - rfcs/0011-maximum-safety-minimum-ceremony.md
  change_policy: modify
- id: TARGET-config-new
  component: trusted-repository-configuration-new-files
  paths:
    - engineering-spec.json
    - src/config/**
    - schemas/repository-config-0.1.schema.json
  change_policy: create
- id: TARGET-config
  component: trusted-repository-configuration-integration
  paths:
    - .github/action.yml
    - .github/workflows/ci.yml
    - src/cli/adopt.ts
    - src/cli/doctor.ts
    - src/gate/loadSpec.ts
  change_policy: modify
- id: TARGET-governance
  component: monotonic-closure-governance
  paths:
    - src/routing/governance.ts
    - src/routing/select.ts
    - src/routing/types.ts
    - src/normalizer/digest.ts
  change_policy: modify
- id: TARGET-authority
  component: semantic-authority-diff
  paths:
    - src/authority/**
    - schemas/authority-diff-0.1.schema.json
  change_policy: create
- id: TARGET-workflow-new
  component: composed-workflow-cli-new-files
  paths:
    - src/cli/next.ts
    - src/cli/work.ts
    - src/cli/finish.ts
  change_policy: create
- id: TARGET-workflow
  component: composed-workflow-cli-integration
  paths:
    - src/cli/program.ts
    - src/cli/exitCodes.ts
    - src/cli/status.ts
    - src/cli/prepare.ts
    - src/cli/review.ts
    - src/cli/transition.ts
    - src/cli/render.ts
    - src/index.ts
  change_policy: modify
- id: TARGET-evidence-new
  component: trusted-evidence-and-pr-metadata-new-files
  paths:
    - src/evidence/**
    - schemas/implementation-receipt-0.2.schema.json
    - schemas/pr-metadata-0.1.schema.json
  change_policy: create
- id: TARGET-evidence
  component: trusted-evidence-and-pr-metadata-integration
  paths:
    - src/gate/receipt.ts
  change_policy: modify
- id: TARGET-diff
  component: explicit-intended-change-sets
  paths:
    - src/gate/collectDiff.ts
    - src/gate/types.ts
  change_policy: modify
- id: TARGET-diagnostics
  component: stable-rc14-diagnostics
  paths:
    - src/diagnostics/Diagnostic.ts
    - src/diagnostics/codes.ts
  change_policy: modify
- id: TARGET-conformance-new
  component: rc14-new-trust-regressions
  paths:
    - conformance/repository-config/**
    - conformance/authority-diff/**
    - conformance/evidence/**
    - test/conformance/rc14.test.ts
    - test/unit/config.test.ts
    - test/unit/authority-diff.test.ts
    - test/unit/finish.test.ts
    - test/unit/next.test.ts
    - test/unit/work.test.ts
    - test/integration/rc14.test.ts
  change_policy: create
- id: TARGET-conformance
  component: existing-trust-regressions
  paths:
    - conformance/governance/manifest.json
    - test/conformance/governance.test.ts
    - test/integration/cli.test.ts
    - test/unit/governance.test.ts
    - test/unit/doctor.test.ts
    - test/unit/package-contents.test.ts
    - test/unit/prepare.test.ts
    - test/unit/receipt.test.ts
    - test/unit/review.test.ts
    - test/unit/status.test.ts
    - test/unit/transition.test.ts
  change_policy: modify
- id: TARGET-guidance
  component: user-and-agent-guidance
  paths:
    - README.md
    - CHANGELOG.md
    - AGENTS.md
    - CLAUDE.md
    - .cursor/rules/engineering-spec.mdc
    - docs/*.md
    - skills/engineering-spec/**
  change_policy: modify
- id: TARGET-contract
  component: rc14-lifecycle
  paths:
    - docs/engineering-specs/ES-rc14-maximum-safety-minimum-ceremony.engineering-spec.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-1
  level: must
  statement: Authorization-affecting repository configuration must be loaded from one resolved trusted-base SHA; feature-branch configuration must not change the base, specification directory, strictness, limits, verifier execution mapping, selected paths, evidence acceptance, or authorization result for the same change.
  applies_to: [TARGET-config-new, TARGET-config, TARGET-governance, TARGET-workflow-new, TARGET-workflow]
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-2
  level: must
  statement: A mixed implementation and approved-to-implemented closure may pass only when every implementation path is authorized solely by the exact approved base contract and the head contract has the same path, ID, revision, format, and closure semantic digest, with only status and optional updatedAt changes allowed.
  applies_to: [TARGET-governance, TARGET-authority, TARGET-conformance-new, TARGET-conformance]
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-3
  level: must_not
  statement: Head contracts and head configuration must never contribute candidates, targets, constraints, exceptions, verifier requirements, evidence policy, or trusted execution mappings to the authorization decision for their own implementation diff.
  applies_to: [TARGET-config-new, TARGET-config, TARGET-governance, TARGET-workflow-new, TARGET-workflow, TARGET-evidence-new, TARGET-evidence]
  enforcement: { kind: test, verifier_ref: VER-ADVERSARIAL }
- id: CON-4
  level: must
  statement: Closure semantic identity must compare the complete normalized document except metadata.status and optional metadata.updatedAt, and a separate field allowlist must reject every target, constraint, verifier, source, contract, revision, extension, prose, and other semantic modification.
  applies_to: [TARGET-governance, TARGET-authority, TARGET-conformance-new, TARGET-conformance]
  enforcement: { kind: test, verifier_ref: VER-ADVERSARIAL }
- id: CON-5
  level: must
  statement: Semantic authority diff must be one deterministic versioned core model with stable JSON and text/Markdown rendering for writable, create, protected, constraint, verifier, source-reference, technical-contract, other semantic, and lifecycle-only changes.
  applies_to: [TARGET-authority, TARGET-workflow-new, TARGET-workflow, TARGET-conformance-new, TARGET-conformance]
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-6
  level: must
  statement: Specification-declared runner payloads must remain inert and omitted from normal agent and PR output; finish may execute only separately trusted argv mappings loaded from the trusted base and bound to contract plus verifier identity.
  applies_to: [TARGET-config-new, TARGET-config, TARGET-evidence-new, TARGET-evidence, TARGET-workflow-new, TARGET-workflow, TARGET-conformance-new, TARGET-conformance]
  enforcement: { kind: test, verifier_ref: VER-ADVERSARIAL }
- id: CON-7
  level: must
  statement: Informational commands must remain useful with unrelated dirty files, while mutation helpers must operate on explicit intended paths and must never automatically stash, reset, clean, discard, stage, commit, push, approve, or merge unrelated or intended work.
  applies_to: [TARGET-diff, TARGET-workflow-new, TARGET-workflow, TARGET-conformance-new, TARGET-conformance]
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-8
  level: must
  statement: Scoped local results must disclose excluded working state and must not claim complete-worktree success; CI must continue enforcing the complete actual pull-request diff with deny-wins, ambiguity, rename, and uncovered-path behavior unchanged.
  applies_to: [TARGET-diff, TARGET-workflow-new, TARGET-workflow, TARGET-governance, TARGET-conformance-new, TARGET-conformance]
  enforcement: { kind: test, verifier_ref: VER-ADVERSARIAL }
- id: CON-9
  level: must
  statement: next, work, and finish must delegate to existing status, prepare, check, review, transition, routing, and receipt primitives rather than implement a second authorization decision.
  applies_to: [TARGET-workflow-new, TARGET-workflow]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-10
  level: must
  statement: Generated evidence and PR metadata must distinguish declared, mapped, attempted, passed, failed, rejected, and not-run verification states and must never describe a requirement as satisfied without validated trusted evidence.
  applies_to: [TARGET-evidence-new, TARGET-evidence, TARGET-workflow-new, TARGET-workflow]
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-11
  level: must
  statement: Existing format 0.1 documents, proposed status, commands, explicit flags, no-config repositories, contract-only closure, receipts, Action inputs, runner inertness, and current conformance vectors must remain compatible.
  applies_to: [TARGET-config-new, TARGET-config, TARGET-governance, TARGET-authority, TARGET-workflow-new, TARGET-workflow, TARGET-evidence-new, TARGET-evidence, TARGET-diff, TARGET-diagnostics, TARGET-conformance-new, TARGET-conformance]
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-12
  level: must
  statement: The normal documented journey for new authority must require one reviewed authority pull request followed by one implementation-plus-monotonic-close pull request, without claiming a one-pull-request durable-policy workflow in RC14.
  applies_to: [TARGET-rfc, TARGET-guidance, TARGET-workflow]
  enforcement: { kind: review, reviewer_role: security-reviewer }
- id: CON-13
  level: must_not
  statement: RC14 must not add durable standing policy, risk-tier authorization, autonomous approval or merge, a generic submit command without a proven gap, a GitHub dependency in core semantics, relaxed unique routing, hosted services, telemetry upload, plugin requirements, MCP requirements, or a web UI.
  applies_to: [TARGET-rfc, TARGET-config-new, TARGET-config, TARGET-governance, TARGET-authority, TARGET-workflow-new, TARGET-workflow, TARGET-evidence-new, TARGET-evidence, TARGET-diff, TARGET-diagnostics, TARGET-guidance]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-14
  level: must
  statement: All human and machine reports must bind the resolved base SHA, contract ID and revision, semantic digest, intended change digest, CLI version, and authorization or evidence limitations without exposing secrets or runner payloads.
  applies_to: [TARGET-authority, TARGET-evidence-new, TARGET-evidence, TARGET-workflow-new, TARGET-workflow, TARGET-diagnostics]
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-15
  level: must
  statement: RFC 0011 and its adversarial matrix must receive maintainer and security review before this draft contract is approved for implementation.
  applies_to: [TARGET-rfc, TARGET-contract]
  enforcement: { kind: review, reviewer_role: security-reviewer }
```

## Verification

```engineering-verification
- id: VER-QUALITY
  proves: [CON-9, CON-11]
  kind: static_analysis
  runner:
    type: command
    argv: [npm, run, typecheck]
    network: deny
  expected: { exit_code: 0 }
- id: VER-CONFORMANCE
  proves: [CON-1, CON-2, CON-5, CON-7, CON-10, CON-11, CON-14]
  kind: test
  runner:
    type: command
    argv: [npm, run, test:conformance]
    network: deny
  expected: { exit_code: 0 }
- id: VER-ADVERSARIAL
  proves: [CON-3, CON-4, CON-6, CON-8]
  kind: security
  runner:
    type: command
    argv: [npm, test]
    network: deny
  expected: { exit_code: 0 }
- id: VER-REVIEW
  proves: [CON-12, CON-13, CON-15]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer and security review of trusted configuration bootstrap, base-only routing, closure semantic identity, verifier execution separation, dirty-tree claims, compatibility, and explicit non-goals
```

## Rollout

```engineering-rollout
strategy: manual
steps:
  - Review RFC 0011 and this draft contract without implementing code.
  - Narrow or correct targets and constraints during design review, then merge a contract-only approval as the single authority-granting review.
  - Implement trusted configuration first and retain existing explicit command behavior.
  - Add monotonic implementation closure only after adversarial base-versus-head conformance vectors pass.
  - Add authority diff, dirty-tree separation, evidence and PR metadata, then thin next/work/finish composition in separately reviewable increments.
  - Publish RC14 only after all legacy and RC14 conformance, quality, security, package-content, and dogfood checks pass.
rollback:
  actions:
    - Disable convenience commands and combined closure while retaining existing explicit commands and contract-only closure.
    - Fall back to explicit flags when trusted repository configuration is absent or invalid.
    - Reject mixed implementation and lifecycle changes if semantic identity cannot be proven.
    - Preserve all existing receipts and format 0.1 documents without migration.
  owner: EngineeringSpec maintainers
```

## Non-goals

Durable trusted policy, one-PR routine authorization, risk-tier governance, autonomous Git operations, execution of document runners, generic submission orchestration, hosted services, UI work, and vendor-specific core behavior remain outside this contract.
