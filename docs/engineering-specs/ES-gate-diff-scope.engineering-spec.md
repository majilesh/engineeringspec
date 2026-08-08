---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 9
id: ES-gate-diff-scope
title: Fail-closed diff gate against declared targets
status: proposed
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
---

# Fail-closed diff gate against declared targets

Add and harden `engineeringspec gate` so CI can reject changes outside declared `TARGET-*` paths and change policies. Validation remains inert; the gate is a separate trust boundary over git diffs. Includes SHA-first evaluation, restricted globs, typed refs, durable unsigned receipts, and production dogfooding of the safe default.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: phase-a-runtime-gate
  title: Phase A gate plan (diff vs targets, PatchFlow-inspired)
- id: SRC-2
  type: document
  ref: gate-trust-sprint1
  title: Gate trust-boundary fixes (deny-wins, spec-from base, -z parsing)
- id: SRC-3
  type: document
  ref: gate-adopter-ops-sprint2
  title: Release pins, CODEOWNERS, and required-check adoption docs
- id: SRC-4
  type: document
  ref: gate-quality-sprint3
  title: Adversarial tests, kind-complete enforcement, interface_only honesty
- id: SRC-5
  type: document
  ref: gate-authz-sprint4
  title: SHA-first gate, restricted globs, typed refs, durable receipts
- id: SRC-6
  type: document
  ref: credibility-cluster
  title: Current Action pin, CI dogfood of spec-from base, codepoint canonicalization
- id: SRC-7
  type: document
  ref: sprint-a-trust-fixes
  title: Strict gate load warnings, key-collision fail-closed, agent gate self-check
- id: SRC-8
  type: document
  ref: agent-first-roadmap
  title: Worktree-aware agent checks, protected contract evolution, portable skill, and agent benchmark
```

## Target surfaces

```engineering-targets
- id: TARGET-gate
  component: gate
  paths:
    - src/gate/**
    - src/path/**
    - test/unit/gate.test.ts
    - test/unit/gate.adversarial.test.ts
    - test/unit/targetGlob.test.ts
    - test/unit/receipt.test.ts
    - test/unit/diagnostic-codes.test.ts
  change_policy: modify
- id: TARGET-validator
  component: validator
  paths:
    - src/validator/validateFile.ts
    - src/validator/validateSemantics.ts
    - src/parser/**
    - src/query/**
    - src/normalizer/**
    - test/unit/core.test.ts
    - test/unit/canonicalize.test.ts
    - test/conformance/**
    - schemas/**
    - conformance/**
  change_policy: modify
- id: TARGET-cli
  component: cli-and-exports
  paths:
    - src/cli/**
    - src/diagnostics/codes.ts
    - src/index.ts
    - test/integration/**
    - test/unit/version.test.ts
    - vitest.config.ts
    - package.json
  change_policy: modify
- id: TARGET-ci-docs
  component: adoption-surface
  paths:
    - action.yml
    - .github/workflows/ci.yml
    - .github/CODEOWNERS
    - AGENTS.md
    - .cursor/rules/**
    - README.md
    - maintainer-only roadmap
    - SPEC.md
    - CHANGELOG.md
    - docs/**
    - rfcs/**
    - skills/**
    - benchmarks/**
    - examples/**
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-1
  level: must
  statement: Gate fails closed when a changed path matches no writable target.
  applies_to: [TARGET-gate]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-2
  level: must_not
  statement: Gate must not execute verification runners or mutate the repository.
  applies_to: [TARGET-gate, TARGET-cli]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-3
  level: must
  statement: CI must demonstrate gate pass and fail using explicit --changed paths.
  applies_to: [TARGET-ci-docs]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-4
  level: must
  statement: When any matching target is read_only or observe, the gate must deny the path even if a broader writable target also matches (deny overrides allow).
  applies_to: [TARGET-gate]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-5
  level: must
  statement: Gate must support loading the contract from the git base ref (--spec-from base) so a PR cannot silently widen its own authorization.
  applies_to: [TARGET-gate, TARGET-cli]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-6
  level: must
  statement: Git diff collection must use null-delimited output and reject unknown or malformed status records (ESG004).
  applies_to: [TARGET-gate]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-7
  level: must
  statement: Adopter docs must publish an immutable Action SHA pin, CODEOWNERS example, and required-check instructions so the gate can be merge-blocking.
  applies_to: [TARGET-ci-docs]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-8
  level: must
  statement: Enforcement and runner kinds must be field-complete (policy/review/test/contract/reference/external) so empty labels are rejected.
  applies_to: [TARGET-validator]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-9
  level: must
  statement: Docs and gate diagnostics must treat interface_only as a path-writable label (ESG006), not content-level interface enforcement.
  applies_to: [TARGET-gate, TARGET-ci-docs]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-10
  level: must
  statement: Gate must resolve immutable base/head SHAs once before loading the contract and collecting the diff.
  applies_to: [TARGET-gate, TARGET-cli]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-11
  level: must
  statement: Target globs must use the restricted EngineeringSpec dialect (ESPTH002); references must be typed (ESR008).
  applies_to: [TARGET-validator, TARGET-gate]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-12
  level: must
  statement: Gate must be able to write a durable unsigned gate-receipt.json binding digest and SHAs.
  applies_to: [TARGET-gate, TARGET-cli]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-13
  level: must
  statement: Project CI must dogfood gate-spec-from base by default (workspace only when evolving this contract), support merge_group, and keep the documented Action SHA pin current with trust-hardened tip.
  applies_to: [TARGET-ci-docs]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-14
  level: must
  statement: Canonical JSON object keys must order by Unicode code point; target globs must reject parent-directory segments.
  applies_to: [TARGET-validator, TARGET-gate]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-15
  level: must
  statement: Gate --strict must fail on validation warnings from the loaded contract; conflicting snake_case/camelCase keys must be rejected (ESP009).
  applies_to: [TARGET-cli, TARGET-validator]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-16
  level: must
  statement: Agent workflow docs must require a mid-task gate self-check before claiming a consequential change is done.
  applies_to: [TARGET-ci-docs]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-17
  level: must
  statement: Every stable diagnostic code must identify exactly one condition and be registered centrally.
  applies_to: [TARGET-validator]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-18
  level: must
  statement: Agent self-checks must be able to gate the complete working state, including committed, staged, unstaged, deleted, renamed, and untracked paths.
  applies_to: [TARGET-gate, TARGET-cli]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-19
  level: must
  statement: Contract evolution must not silently replace base authorization with a workspace contract that widens its own implementation scope.
  applies_to: [TARGET-gate, TARGET-cli, TARGET-ci-docs]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-20
  level: must_not
  statement: Agent-oriented check, context, and explanation commands must not execute declared verification runners or mutate the repository.
  applies_to: [TARGET-cli, TARGET-validator]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-21
  level: must
  statement: The reusable agent workflow must remain a thin, agent-neutral consumer of the CLI and shared EngineeringSpec contract.
  applies_to: [TARGET-ci-docs]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-22
  level: must
  statement: The agent-impact benchmark must be reproducible, compare equivalent tasks, and report scope, correctness, review, latency, and token outcomes without executing spec-declared runners.
  applies_to: [TARGET-ci-docs]
  enforcement: { kind: review, reviewer_role: maintainer }
```

## Verification

```engineering-verification
- id: VER-1
  proves: [CON-1, CON-2, CON-3, CON-4, CON-5, CON-6, CON-8, CON-9, CON-10, CON-11, CON-12, CON-14, CON-15, CON-17, CON-18, CON-19, CON-20]
  kind: test
  runner:
    type: command
    argv: [npm, test]
    network: deny
  expected: { exit_code: 0 }
- id: VER-2
  proves: [CON-7, CON-13, CON-16, CON-21, CON-22]
  kind: human_review
  runner:
    type: manual
    reference: maintainer review of production-gate docs, CODEOWNERS, CI dogfood, Action pin, and agent self-check docs
```

## Rollout

```engineering-rollout
strategy: none
observability:
  - CI gate smoke (pass + intentional fail + --spec-from base)
  - adversarial unit tests for policy composition and -z parsing
  - conformance fixtures for incomplete enforcement/runners, globs, typed refs
  - optional --receipt artifact in CI
  - merge_group workflow trigger
```
