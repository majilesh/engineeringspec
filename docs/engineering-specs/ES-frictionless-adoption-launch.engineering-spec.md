---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-frictionless-adoption-launch
title: Frictionless adoption and launch proof
status: proposed
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
base_revision: "bdfbb7f"
---

# Frictionless adoption and launch proof

Make EngineeringSpec understandable and useful within a first adopter's initial session. Add safe draft assistance, a complete quickstart, reviewer-visible change reports, tested thin integrations for the most common coding agents, and runnable proof assets without weakening the approved-base trust boundary or overstating measured adoption.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: maintainer-only roadmap
  title: EngineeringSpec roadmap after RC8
- id: SRC-2
  type: other
  ref: launch-readiness-review-2026-08
  title: Adoption and launch readiness review after RC8 and private-repository dogfooding
- id: SRC-3
  type: document
  ref: rfcs/0001-agent-first-trust-loop.md
  title: Agent-first trust-loop RFC
- id: SRC-4
  type: document
  ref: rfcs/0006-frictionless-agent-operations.md
  title: Frictionless agent operations RFC
```

## Target surfaces

```engineering-targets
- id: TARGET-proposal
  component: guided-draft-proposal
  paths:
    - src/cli/propose.ts
    - src/proposal/**
    - src/cli/templates.ts
    - src/cli/program.ts
    - src/index.ts
    - test/unit/propose.test.ts
    - test/integration/cli.test.ts
  change_policy: modify
- id: TARGET-review
  component: deterministic-review-report
  paths:
    - src/cli/review.ts
    - src/review/**
    - src/cli/program.ts
    - src/index.ts
    - src/diagnostics/**
    - test/unit/review.test.ts
    - test/integration/cli.test.ts
  change_policy: modify
- id: TARGET-adoption
  component: safe-quickstart-adoption
  paths:
    - src/cli/adopt.ts
    - src/cli/templates.ts
    - src/adoption/**
    - test/unit/doctor.test.ts
    - test/integration/cli.test.ts
  change_policy: modify
- id: TARGET-action
  component: github-review-surface
  paths:
    - action.yml
    - .github/workflows/ci.yml
    - test/integration/cli.test.ts
  change_policy: modify
- id: TARGET-integrations
  component: portable-agent-integrations
  paths:
    - skills/engineering-spec/**
    - integrations/**
    - examples/adopters/**
    - AGENTS.md
    - CLAUDE.md
    - .cursor/rules/**
  change_policy: modify
- id: TARGET-demo
  component: runnable-adoption-demo
  paths:
    - examples/demo/**
    - scripts/demo.mjs
    - test/integration/demo.test.ts
  change_policy: modify
- id: TARGET-proof
  component: adoption-evidence-and-launch-guidance
  paths:
    - benchmarks/**
    - maintainer-only case studies/**
    - maintainer-only launch notes/**
    - docs/getting-started.md
    - docs/first-change-tutorial.md
    - docs/integrations.md
    - docs/cli-reference.md
    - docs/troubleshooting.md
    - README.md
    - maintainer-only roadmap
    - CHANGELOG.md
    - site/**
    - scripts/generate-site.mjs
  change_policy: modify
- id: TARGET-package
  component: package-and-cli-surface
  paths:
    - package.json
    - package-lock.json
    - tsconfig.build.json
  change_policy: modify
- id: TARGET-contract
  component: contract-lifecycle
  paths:
    - docs/engineering-specs/ES-frictionless-adoption-launch.engineering-spec.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-1
  level: must
  statement: Guided proposal generation must emit only a draft EngineeringSpec, use bounded repository-local inputs, support deterministic output, validate safe repository-relative paths, and clearly label inferred targets and obligations for human review.
  applies_to: [TARGET-proposal]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-2
  level: must_not
  statement: Proposal assistance must not approve a contract, modify implementation files, fetch issue content, infer authority from architecture metadata, execute declared runners, or claim that generated scope is complete or correct.
  applies_to: [TARGET-proposal]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-3
  level: must
  statement: Quickstart adoption must provide a dry-run-first path that can safely create a draft first contract, neutral agent guidance, immutable-version GitHub enforcement, and maintainer ownership without overwriting or ambiguously merging user-owned files.
  applies_to: [TARGET-adoption, TARGET-integrations, TARGET-action]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-4
  level: must
  statement: The review command must produce deterministic text, Markdown, and JSON summaries mapping the complete working state to the base-pinned selected contract, targets, applicable constraints, verification identities, lifecycle, coverage, and actionable violations while omitting verifier command payloads.
  applies_to: [TARGET-review]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-5
  level: must_not
  statement: Review output, Action summaries, PR presentation, proposal suggestions, demos, skills, and integrations must never grant authority, alter routing, write contracts implicitly, execute declared runners, expose secret-bearing command payloads, or require pull-request write permissions by default.
  applies_to: [TARGET-review, TARGET-action, TARGET-integrations, TARGET-demo]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-6
  level: must
  statement: The GitHub Action must publish a concise reviewer-facing job summary from the same base-pinned routing decision used for enforcement, remain compatible with pull requests and merge queues, and preserve immutable Action pin guidance for consumers.
  applies_to: [TARGET-action, TARGET-review]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-7
  level: must
  statement: Codex, Claude Code, Cursor, and GitHub Copilot integrations must be thin tested consumers of one portable agent-neutral workflow, install without changing core authorization semantics, document exact invocation and upgrade paths, and retain a generic integration path.
  applies_to: [TARGET-integrations, TARGET-adoption, TARGET-proof]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-8
  level: must
  statement: The demo must run without credentials or a hosted service, deterministically show an unauthorized change failing and a base-approved in-scope change passing, and explain that EngineeringSpec constrains change scope rather than generating or applying code.
  applies_to: [TARGET-demo, TARGET-proof]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-9
  level: must
  statement: Case-study and benchmark material must distinguish observed evidence from examples and hypotheses, publish reproducible inputs and metrics where available, sanitize private repository details, and make no unmeasured claims about correctness, productivity, adoption, or star growth.
  applies_to: [TARGET-proof]
  enforcement: { kind: review, reviewer_role: evidence-reviewer }
- id: CON-10
  level: must
  statement: Public positioning may use a qualified Terraform-style analogy only while stating that EngineeringSpec neither reconciles desired state nor applies code; documentation must distinguish the enforcement layer from upstream planning tools such as ProductSpec, OpenSpec, and Spec Kit.
  applies_to: [TARGET-proof]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-11
  level: must
  statement: The launch path must provide a sixty-second explanation, a five-minute runnable trial, honest public launch launch guidance, and contribution entry points without soliciting coordinated votes or presenting generated community comments as human-authored discussion.
  applies_to: [TARGET-proof, TARGET-demo]
  enforcement: { kind: review, reviewer_role: documentation-maintainer }
- id: CON-12
  level: must
  statement: Existing format 0.1 compatibility, validation, canonicalization, diagnostics, deny-overrides, complete-worktree collection, approved-base routing, contract-only governance, runner inertness, architecture authority isolation, and current CLI defaults must remain compatible.
  applies_to: [TARGET-proposal, TARGET-review, TARGET-adoption, TARGET-action, TARGET-integrations, TARGET-demo, TARGET-package]
  enforcement: { kind: test, verifier_ref: VER-2 }
- id: CON-13
  level: must
  statement: ProductSpec Git-tree loading, OpenAPI and JSON Schema adapters, read-only MCP, broad vendor plugins, hosted services, autonomous approval, and bidirectional architecture synchronization must remain separately reviewable future work rather than being silently introduced in this launch increment.
  applies_to: [TARGET-proof, TARGET-package]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-14
  level: must
  statement: After implementation review and trusted verification pass, this contract must transition from approved to implemented in a separate lifecycle-only change.
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
  proves: [CON-12]
  kind: test
  runner:
    type: command
    argv: [npm, run, test:conformance]
    network: deny
  expected: { exit_code: 0 }
- id: VER-3
  proves: [CON-7, CON-9, CON-10, CON-11, CON-13, CON-14]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer, evidence, and documentation review of integration neutrality, measured claims, positioning, launch conduct, deferred scope, and lifecycle closure
```

## Rollout

```engineering-rollout
strategy: canary
steps:
  - Merge this contract-only change as approved before changing CLI, Action, integration, demo, package, or launch surfaces.
  - Implement guided draft generation and deterministic review reporting before widening quickstart scaffolding.
  - Forward-test quickstart and all four named integrations in clean temporary repositories without granting approval automatically.
  - Run the five-minute demo and publish only sanitized, reproducible proof material.
  - Dogfood the released workflow in a private consumer and obtain at least one independent adopter review before recommending a stable v0.1 launch.
rollback:
  actions:
    - Remove proposal, review, quickstart, and demo entry points independently while retaining RC8 validation and enforcement.
    - Keep adopters pinned to immutable RC8 CLI and Action identities until the new increment is reviewed and released.
    - Withdraw launch claims or case-study material if evidence cannot be independently reproduced or safely disclosed.
  owner: EngineeringSpec maintainers
```
