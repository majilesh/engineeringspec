---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-evidence-integrity-before-pilot
title: Harden evidence integrity before the external pilot
status: implemented
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
base_revision: "e98b26d"
---

# Harden evidence integrity before the external pilot

Fix the concrete evidence-quality gaps found in the RC10 review, generate scope measurements from immutable Git state, resolve the `interface_only` strict-mode contradiction, and complete agent-facing rendering hardening. Do not expand transports, execution, hosted services, or product breadth before the paired pilot.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: rfcs/0008-evidence-integrity-before-pilot.md
  title: Evidence integrity before the external pilot RFC
- id: SRC-2
  type: document
  ref: rfcs/0007-precode-brief-evidence-pilot.md
  title: Pre-code brief and adoption evidence pilot RFC
- id: SRC-3
  type: document
  ref: _internal/pilot-protocol.md
  title: Ten-task paired adoption pilot
- id: SRC-4
  type: document
  ref: e98b26d6889faefa1a1dbb745def35dd97305f23
  title: RC10 release merge
- id: SRC-5
  type: other
  ref: rc10-independent-review-2026-08-12
  title: Independent RC10 evidence and semantics review
```

## Target surfaces

```engineering-targets
- id: TARGET-benchmark
  component: evidence-validation-and-publishability
  paths:
    - src/cli/benchmark.ts
    - benchmarks/**
    - test/unit/benchmark.test.ts
    - test/integration/cli.test.ts
  change_policy: modify
- id: TARGET-measure
  component: deterministic-scope-receipt
  paths:
    - src/cli/measure.ts
    - src/measurement/**
    - src/cli/program.ts
    - src/index.ts
    - schemas/scope-measurement-0.1.schema.json
    - test/unit/measure.test.ts
    - test/integration/measure.test.ts
    - test/integration/cli.test.ts
  change_policy: modify
- id: TARGET-interface-semantics
  component: interface-only-informational-diagnostic
  paths:
    - SPEC.md
    - src/gate/gate.ts
    - src/routing/route.ts
    - test/unit/gate.test.ts
    - test/unit/gate.adversarial.test.ts
    - test/integration/routing.test.ts
    - conformance/**
  change_policy: modify
- id: TARGET-rendering
  component: shared-agent-output-hardening
  paths:
    - src/cli/render.ts
    - src/cli/prepare.ts
    - src/cli/review.ts
    - src/query/changeBrief.ts
    - test/unit/prepare.test.ts
    - test/unit/review.test.ts
  change_policy: modify
- id: TARGET-documentation
  component: evidence-and-command-guidance
  paths:
    - README.md
    - _internal/roadmap.md
    - CHANGELOG.md
    - docs/cli-reference.md
    - docs/agent-integration.md
    - docs/maintaining-specs.md
    - docs/roles-and-responsibilities.md
  change_policy: modify
- id: TARGET-rfc
  component: evidence-and-interface-semantics
  paths:
    - rfcs/0008-evidence-integrity-before-pilot.md
  change_policy: modify
- id: TARGET-contract
  component: contract-lifecycle
  paths:
    - docs/engineering-specs/ES-evidence-integrity-before-pilot.engineering-spec.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-1
  level: must
  statement: The benchmark must reject any scope record where unauthorized changed paths exceed actual changed paths or authorized changed paths exceed approved writable paths; it must not cap an impossible precision value into validity.
  applies_to: [TARGET-benchmark]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-2
  level: must
  statement: Evidence provenance, completeness, and publishability must be reported separately; compatible sparse records remain readable, while --require-publishable fails incomplete, example, mixed, or inconsistent evidence without implying causality or making explicitly uninterpretable metrics numeric for publishable observed samples.
  applies_to: [TARGET-benchmark, TARGET-documentation]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-3
  level: must
  statement: Benchmark records must support positive time limits, opaque acceptance reviewer identifiers, and per-condition sequence values; complete pairs preserve time limit and reviewer and contain exactly sequence positions one and two.
  applies_to: [TARGET-benchmark]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-4
  level: must
  statement: Scope evidence must distinguish finite, open-create-namespace, and repository-wide authority; only finite authority may produce an interpretable precision score, while catch-all legacy input remains compatible and maps to repository-wide authority.
  applies_to: [TARGET-benchmark, TARGET-measure, TARGET-documentation]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-5
  level: must
  statement: The measure command must resolve base and head SHAs first, load exactly one explicitly named approved contract from the base Git tree, reuse existing path-policy and deny-overrides semantics, exclude dirty workspace state, expand renames, and emit deterministic unsigned scope evidence with contract and path-set digests without disclosing individual paths by default.
  applies_to: [TARGET-measure]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-6
  level: must_not
  statement: Measurement must not load workspace authority, infer or approve a contract, execute or expose verifier runners, run trusted checks, mutate Git or files without an explicit output path, claim authorization, or replace select, check, review, or CI enforcement.
  applies_to: [TARGET-measure, TARGET-documentation]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-7
  level: must
  statement: ESG006 must remain emitted whenever interface_only authorizes a path but with informational severity, so strict mode does not fail solely for the documented path-level limitation; interface_only must not gain semantic API, ABI, AST, or schema enforcement.
  applies_to: [TARGET-interface-semantics, TARGET-rfc, TARGET-documentation]
  enforcement: { kind: test, verifier_ref: VER-2 }
- id: CON-8
  level: must
  statement: Shared prepare and review rendering must strip the complete Unicode Bidi_Control set including U+061C, neutralize terminal and newline controls, HTML-escape Markdown text, and safely delimit arbitrary runs of backticks inside inline code spans.
  applies_to: [TARGET-rendering]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-9
  level: must
  statement: Current format 0.1 parsing, schema compatibility, canonicalization, diagnostics other than ESG006 severity, approved-base loading, routing decisions, deny-overrides, complete-worktree checks, runner inertness, Action enforcement, and RC10 commands must remain compatible.
  applies_to: [TARGET-benchmark, TARGET-measure, TARGET-interface-semantics, TARGET-rendering]
  enforcement: { kind: test, verifier_ref: VER-2 }
- id: CON-10
  level: must
  statement: Documentation must lead with EngineeringSpec as the open change-control layer for AI coding agents, explain the agent-neutral contract format underneath, keep scope receipts non-authoritative, disclose publishability limitations, and retain the zero-observation external evidence status until records exist.
  applies_to: [TARGET-documentation]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-11
  level: must_not
  statement: This increment must not add model calls, contract inference, autonomous approval, runner execution, MCP, IDE or vendor plugins, dashboards, hosted services, architecture-derived authority, CLI registration refactoring, or external-impact claims.
  applies_to: [TARGET-rfc, TARGET-documentation]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-12
  level: must
  statement: Implementation must add the RFC-mandated conformance and adversarial fixtures, run all trusted repository checks, preserve failed and incomplete benchmark records, and transition this contract from approved to implemented only after maintainer review.
  applies_to: [TARGET-benchmark, TARGET-measure, TARGET-interface-semantics, TARGET-rendering, TARGET-contract]
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
  proves: [CON-7, CON-9]
  kind: test
  runner:
    type: command
    argv: [npm, run, test:conformance]
    network: deny
  expected: { exit_code: 0 }
- id: VER-3
  proves: [CON-10, CON-11, CON-12]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer review of evidence integrity, semantic compatibility, non-authoritative measurement, honest claims, deferred breadth, complete verification, and lifecycle closure
```

## Rollout

```engineering-rollout
strategy: canary
steps:
  - Merge this RFC and draft contract as a contract-only proposal; it grants no implementation authority.
  - Approve the contract in a separate reviewed lifecycle-only change before editing any implementation surface.
  - Implement benchmark invariants and publishability first, then deterministic measurement, interface semantics, and shared rendering hardening against the approved base.
  - Dogfood measure and --require-publishable on retained synthetic and private pilot fixtures before publishing any external comparison.
  - Release the reviewed increment through a separate immutable RC11 release contract.
  - Freeze product expansion and run the predeclared ten-task paired pilot after RC11 verification.
rollback:
  actions:
    - Keep RC10 as the recommended immutable release until RC11 package and consumer smoke checks pass.
    - Disable publishability enforcement without deleting retained records if the policy proves incorrectly strict.
    - Withdraw scope receipts or public claims that cannot be reproduced from the retained base/head identities.
  owner: EngineeringSpec maintainers
```
