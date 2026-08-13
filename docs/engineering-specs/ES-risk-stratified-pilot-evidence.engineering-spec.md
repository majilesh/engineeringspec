---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-risk-stratified-pilot-evidence
title: Stratify pilot evidence by task risk
status: approved
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
base_revision: "2bea6b2"
---

# Stratify pilot evidence by task risk

Make the predeclared ten-task pilot capable of locating where EngineeringSpec's ceremony earns its cost. Record task risk as paired, reproducible evidence and report outcomes and human-versus-agent overhead per tier without breaking historical benchmark records or changing EngineeringSpec format 0.1.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: maintainer-only pilot protocol
  title: Ten-task paired adoption pilot methodology
- id: SRC-2
  type: document
  ref: maintainer-only pilot notes
  title: Zero-observation external pilot status and evidence boundaries
- id: SRC-3
  type: document
  ref: maintainer-only roadmap
  title: RC12 evidence freeze and post-pilot prioritization
- id: SRC-4
  type: document
  ref: d8755188356762495810872534650354afaa884e
  title: Preserved local task-risk stratification draft
```

## Target surfaces

```engineering-targets
- id: TARGET-rfc
  component: risk-stratified-evidence-design
  paths:
    - rfcs/0010-risk-stratified-pilot-evidence.md
  change_policy: modify
- id: TARGET-benchmark
  component: paired-risk-recording-and-summary
  paths:
    - src/cli/benchmark.ts
    - benchmarks/agent-impact.schema.json
    - benchmarks/README.md
    - maintainer-only pilot protocol
    - maintainer-only pilot records/pilot-template.json
    - test/unit/benchmark.test.ts
    - test/integration/cli.test.ts
  change_policy: modify
- id: TARGET-conformance
  component: benchmark-risk-tier-vectors
  paths:
    - conformance/benchmark-risk-tier/**
    - test/conformance/benchmark-risk-tier.test.ts
  change_policy: modify
- id: TARGET-guidance
  component: honest-pilot-reporting
  paths:
    - maintainer-only pilot notes
    - maintainer-only roadmap
  change_policy: modify
- id: TARGET-contract
  component: risk-stratification-lifecycle
  paths:
    - docs/engineering-specs/ES-risk-stratified-pilot-evidence.engineering-spec.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-1
  level: must
  statement: RFC 0010 must define the low, medium, and high task-risk rubric; predeclaration timing; pair comparability; compatibility; grouping and overhead calculations; publication treatment; and the boundary between empirical pilot tiers and future governance policy before dependent schema or summarizer implementation begins.
  applies_to: [TARGET-rfc]
  enforcement: { kind: review, reviewer_role: evidence-reviewer }
- id: CON-2
  level: must
  statement: Benchmark records must support an optional taskRiskTier value of low, medium, or high, and both conditions in every pair must preserve the same tier when it is present.
  applies_to: [TARGET-benchmark, TARGET-conformance]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-3
  level: must
  statement: Historical records without taskRiskTier must remain readable and summarizable, must be counted as missing tier data, and must not be silently assigned or inferred a tier after outcomes are known.
  applies_to: [TARGET-benchmark, TARGET-conformance]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-4
  level: must
  statement: Publishable pilot records collected under the risk-stratified protocol must include a predeclared taskRiskTier, while legacy and incomplete records remain inspectable with explicit non-publishable or missing-data treatment.
  applies_to: [TARGET-benchmark, TARGET-conformance, TARGET-guidance]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-5
  level: must
  statement: The benchmark summary must report pair and run counts, existing condition outcomes, absolute duration overhead, relative duration overhead when the baseline duration is nonzero, contract authoring and review cost, and missing-data status separately for each represented tier without replacing the existing aggregate summary.
  applies_to: [TARGET-benchmark]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-6
  level: must
  statement: Tier summaries must be deterministic, ordered low then medium then high, calculated only from complete comparable pairs assigned to that tier, and must preserve failed, slower, amended, negative-routing, and inconclusive outcomes.
  applies_to: [TARGET-benchmark, TARGET-conformance]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-7
  level: must
  statement: The pilot guide must require tiers to be assigned from predeclared blast radius and scope ambiguity rather than observed outcome, report absolute and relative overhead, and separate human contract cost from agent runtime and token cost.
  applies_to: [TARGET-benchmark, TARGET-guidance]
  enforcement: { kind: review, reviewer_role: evidence-reviewer }
- id: CON-8
  level: must_not
  statement: This correction must not add task risk as an EngineeringSpec format primitive, implementation permission, autonomous approval input, target policy, or enforcement decision; must not change format 0.1, routing, governance, runner inertness, approved-base authority, v1 or v2 scope receipt semantics, or historical evidence; and must not claim that any tier improves productivity or correctness.
  applies_to: [TARGET-rfc, TARGET-benchmark, TARGET-conformance, TARGET-guidance]
  enforcement: { kind: test, verifier_ref: VER-2 }
- id: CON-9
  level: must
  statement: Conformance coverage must include valid tiers, absent legacy tiers, invalid tier values, mismatched paired tiers, deterministic tier order, zero-duration relative-overhead handling, and publishability treatment without executing declared specification runners.
  applies_to: [TARGET-conformance, TARGET-benchmark]
  enforcement: { kind: test, verifier_ref: VER-2 }
- id: CON-10
  level: must
  statement: Public documentation must continue to report zero retained external pairs until observed records exist and must describe all tier comparisons as descriptive for the retained sample without causal, adoption, conversion, or star-growth claims.
  applies_to: [TARGET-guidance, TARGET-benchmark]
  enforcement: { kind: review, reviewer_role: evidence-reviewer }
- id: CON-11
  level: must
  statement: The contract must transition from approved to implemented only after RFC review, trusted repository checks, conformance verification, and maintainer evidence review complete without widening its targets.
  applies_to: [TARGET-contract]
  enforcement: { kind: review, reviewer_role: maintainer }
```

## Verification

```engineering-verification
- id: VER-1
  proves: [CON-2, CON-3, CON-4, CON-5, CON-6]
  kind: test
  runner:
    type: command
    argv: [npm, test]
    network: deny
  expected: { exit_code: 0 }
- id: VER-2
  proves: [CON-8, CON-9]
  kind: test
  runner:
    type: command
    argv: [npm, run, test:conformance]
    network: deny
  expected: { exit_code: 0 }
- id: VER-3
  proves: [CON-1, CON-7, CON-10, CON-11]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer and evidence review of predeclared tier semantics, compatibility, per-tier cost reporting, honest claims, feature-freeze scope, and lifecycle closure
```

## Rollout

```engineering-rollout
strategy: canary
steps:
  - Merge this reviewed approved contract as a contract-only change; it grants authority only after landing on the trusted base.
  - Write, review, and merge RFC 0010 as the first approved implementation change before editing the benchmark schema, summarizer, fixtures, or pilot methodology.
  - Implement optional paired task-risk recording, deterministic per-tier summaries, compatibility behavior, conformance vectors, and the preserved pilot-guide clarification against the updated trusted base.
  - Run all trusted repository and conformance checks, then verify clean benchmark output for legacy, complete, mismatched, zero-duration, and negative outcomes.
  - Freeze product functionality again and begin the predeclared ten-task pilot only after this evidence correction merges.
rollback:
  actions:
    - Keep existing aggregate benchmark output and historical records readable if tier reporting is withdrawn.
    - Mark tier-based results incomplete and do not publish them if predeclaration or pair comparability cannot be reproduced.
    - Do not infer missing historical tiers or convert empirical task tiers into enforcement policy.
  owner: EngineeringSpec maintainers
```
