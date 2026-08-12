---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-routing-derived-evidence-v2
title: Derive pilot evidence from repository routing
status: implemented
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
base_revision: "9b3918e"
---

# Derive pilot evidence from repository routing

Make enforcement and evidence share one immutable, repository-wide authorization decision before publishing external pilot results. Introduce a versioned `concrete-paths-v2` receipt, correct finite literal-path authority, require deterministic v2 provenance for publishable scope evidence, strengthen paired-run reproducibility, and then freeze product functionality for the ten-task pilot.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: rfcs/0008-evidence-integrity-before-pilot.md
  title: RC11 evidence-integrity design
- id: SRC-2
  type: document
  ref: 7795dd1d-e786-4117-a60b-1c9cc82399b4
  title: Independent RC11 measurement review
- id: SRC-3
  type: document
  ref: 4b13bd43-c691-4661-82e3-9c2d6961197b
  title: RC12 plan and pilot-methodology review
- id: SRC-4
  type: document
  ref: docs/engineering-specs/ES-evidence-integrity-before-pilot.engineering-spec.md
  title: Implemented RC11 evidence-integrity contract
- id: SRC-5
  type: document
  ref: maintainer-only pilot protocol
  title: Current paired-pilot protocol
```

## Target surfaces

```engineering-targets
- id: TARGET-rfc
  component: routing-derived-evidence-design
  paths:
    - rfcs/0009-routing-derived-evidence-v2.md
  change_policy: modify
- id: TARGET-routing
  component: shared-immutable-authorization-decision
  paths:
    - src/routing/**
    - test/unit/routing.test.ts
    - test/integration/routing.test.ts
    - test/conformance/routing.test.ts
    - conformance/routing/**
  change_policy: modify
- id: TARGET-measurement
  component: concrete-paths-v2-receipts
  paths:
    - src/measurement/**
    - src/cli/measure.ts
    - src/cli/program.ts
    - src/index.ts
    - schemas/scope-measurement-0.2.schema.json
    - test/unit/measure.test.ts
    - test/integration/measure.test.ts
    - test/integration/cli.test.ts
  change_policy: modify
- id: TARGET-benchmark
  component: publishable-evidence-and-reproducibility
  paths:
    - src/cli/benchmark.ts
    - benchmarks/**
    - test/unit/benchmark.test.ts
    - test/integration/cli.test.ts
  change_policy: modify
- id: TARGET-documentation
  component: pilot-method-and-evidence-boundaries
  paths:
    - README.md
    - CHANGELOG.md
    - maintainer-only roadmap
    - docs/cli-reference.md
    - docs/agent-integration.md
    - docs/maintaining-specs.md
    - maintainer-only pilot notes
    - maintainer-only launch notes/**
  change_policy: modify
- id: TARGET-contract
  component: evidence-v2-lifecycle
  paths:
    - docs/engineering-specs/ES-routing-derived-evidence-v2.engineering-spec.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-1
  level: must
  statement: The RFC must formally define concrete-paths-v2, candidate-set and routing-decision canonical inputs, requested-contract projection, pilot condition semantics, compatibility, privacy, failure handling, and the feature freeze before dependent implementation begins.
  applies_to: [TARGET-rfc]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-2
  level: must
  statement: Measurement must resolve immutable base and head SHAs, load all approved base-tree candidates through the same bounded validation path as select and check, and derive selected, denied, ambiguous, uncovered, and duplicate-ID outcomes from one repository-wide routing decision rather than independently gating the requested contract.
  applies_to: [TARGET-routing, TARGET-measurement]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-3
  level: must
  statement: The requested contract ID must act only as a projection over repository routing; only paths uniquely selected for that exact contract count as selectedForRequestedContract, while paths selected for other contracts, denied, ambiguous, or uncovered remain retained and cannot be presented as requested-contract authorization.
  applies_to: [TARGET-measurement]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-4
  level: must
  statement: The receipt must include deterministic canonical candidate-set and routing-decision digests. Candidate tuples must bind spec path, ID, revision, status, and normalized spec digest; routing tuples must bind expanded path, change kind, decision, selected identity when present, and canonically ordered allowing and denying claims.
  applies_to: [TARGET-routing, TARGET-measurement]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-5
  level: must
  statement: Path-set digests must hash deterministic UTF-8 canonical JSON arrays of unique normalized repository-relative paths ordered by code point; individual paths remain omitted unless explicit disclosure is requested.
  applies_to: [TARGET-measurement]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-6
  level: must
  statement: The shared approved-candidate loader and measurement command must enforce a 10000-candidate ceiling, fail closed on invalid base candidates according to strict mode, preserve duplicate-ID diagnostics, use bounded Git output and argument arrays, exclude dirty workspace state, and never execute or expose declared runners.
  applies_to: [TARGET-routing, TARGET-measurement]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-7
  level: must
  statement: concrete-paths-v2 must calculate finite literal authority from authority granted rather than paths exercised. For a non-denied literal path, create includes only absent paths; delete includes only existing paths; modify and interface_only include existing and absent paths; read_only and observe include none. Wildcard create-capable authority remains open_create_namespace and repository-wide authority remains repository_wide, with numeric precision unavailable for both.
  applies_to: [TARGET-measurement, TARGET-rfc]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-8
  level: must
  statement: Effective finite authority must respect repository-wide denial and ambiguity. Tests must cover exact create sets with partial exercise, existing create-only paths, absent modify and interface_only paths, delete-only paths, rename destinations, cross-contract deny, cross-contract ambiguity, paths selected for another contract, duplicate IDs, uncovered paths, and empty committed diffs.
  applies_to: [TARGET-routing, TARGET-measurement]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-9
  level: must
  statement: concrete-paths-v1 receipts and sparse legacy benchmark records must remain readable and retain their historical interpretation, but must never be silently reinterpreted as v2 or qualify as publishable scope evidence under the RC12 policy.
  applies_to: [TARGET-measurement, TARGET-benchmark, TARGET-documentation]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-10
  level: must
  statement: The benchmark must embed or reference the complete privacy-safe v2 receipt provenance including requested contract identity, revision and digest; base and head SHAs; candidate-set and routing-decision digests; method and authority breadth; counts, limitations, and digests for approved writable, actual, requested-contract-selected, other-contract-selected, denied, ambiguous, and uncovered path sets.
  applies_to: [TARGET-measurement, TARGET-benchmark]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-11
  level: must
  statement: benchmark --require-publishable must require deterministic concrete-paths-v2 receipts for every retained record making a scope claim and validate receipt and legacy-field agreement. Manual and v1 scope evidence remains summarizable but non-publishable. Complete negative outcomes containing paths selected for another contract, denied, ambiguous, or uncovered must remain publishable as retained outcomes when otherwise valid, but single-intended-contract scope precision for those records must be null and explicitly ineligible rather than numeric.
  applies_to: [TARGET-benchmark]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-12
  level: must
  statement: Benchmark records must support a common-task prompt digest, agent version, harness version, EngineeringSpec version, condition head revision, start timestamp, and review-blinding status. Complete pairs must preserve the common task digest, base revision, model and applicable harness inputs while retaining distinct condition heads; private prompt text is not required for public records.
  applies_to: [TARGET-benchmark, TARGET-documentation]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-13
  level: must
  statement: The benchmark must reject unauthorizedPathsMerged greater than unauthorizedPathsChanged and enforce that requested-contract-selected, other-contract-selected, denied, ambiguous, and uncovered unique expanded path sets partition the actual changed set under the finalized counting convention.
  applies_to: [TARGET-benchmark, TARGET-measurement]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-14
  level: must
  statement: The pilot protocol must use the same approved contract and base revision as the post-hoc scope rubric for both conditions. The baseline agent must not receive prepare or context and must not be constrained by EngineeringSpec during implementation; the EngineeringSpec condition receives the approved workflow. Both committed heads are evaluated afterward against the same rubric.
  applies_to: [TARGET-benchmark, TARGET-documentation]
  enforcement: { kind: review, reviewer_role: evidence-reviewer }
- id: CON-15
  level: must
  statement: Acceptance review should be blinded to condition where practical and must record reviewBlinded truthfully. The pilot must preserve failures, slower runs, amendments, anomalies, onboarding friction, consent, timestamps, immutable commits, and negative or inconclusive results.
  applies_to: [TARGET-benchmark, TARGET-documentation]
  enforcement: { kind: review, reviewer_role: evidence-reviewer }
- id: CON-16
  level: must_not
  statement: This increment must not change format 0.1, concrete-paths-v1 semantics, target change-policy meanings, enforcement decisions, runner inertness, approved-base authority, Action behavior, retained pilot observations, or historical records; and must not add MCP, inference, dashboards, plugins, IDE extensions, hosted services, architecture-derived authority, autonomous approval, trusted execution, or multi-contract precision claims.
  applies_to: [TARGET-rfc, TARGET-routing, TARGET-measurement, TARGET-benchmark, TARGET-documentation]
  enforcement: { kind: test, verifier_ref: VER-2 }
- id: CON-17
  level: must
  statement: After this focused correction is released, product functionality must freeze for the predeclared ten-task paired pilot. Post-pilot priorities must be selected from observed adoption friction rather than a fixed feature order, and quantitative scope claims must remain unpublished until deterministic v2 evidence passes the publication policy.
  applies_to: [TARGET-documentation]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-18
  level: must
  statement: The implementation must add RFC-mandated unit, integration, adversarial, schema, and conformance fixtures; run all trusted repository checks; preserve the public zero-observation status until counted records exist; and transition this contract from approved to implemented only after maintainer and evidence review.
  applies_to: [TARGET-routing, TARGET-measurement, TARGET-benchmark, TARGET-documentation, TARGET-contract]
  enforcement: { kind: review, reviewer_role: maintainer }
```

## Verification

```engineering-verification
- id: VER-1
  proves: [CON-2, CON-3, CON-4, CON-5, CON-6, CON-7, CON-8, CON-9, CON-10, CON-11, CON-12, CON-13]
  kind: test
  runner:
    type: command
    argv: [npm, test]
    network: deny
  expected: { exit_code: 0 }
- id: VER-2
  proves: [CON-16]
  kind: test
  runner:
    type: command
    argv: [npm, run, test:conformance]
    network: deny
  expected: { exit_code: 0 }
- id: VER-3
  proves: [CON-1, CON-14, CON-15, CON-17, CON-18]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer and evidence review of repository-routing convergence, v2 compatibility, public-evidence policy, paired-condition fairness, blinding, privacy, honest claims, feature freeze, and lifecycle closure
```

## Rollout

```engineering-rollout
strategy: canary
steps:
  - Merge this draft contract as a contract-only proposal; it grants no RFC or implementation authority.
  - Approve the contract in a separate reviewed lifecycle-only change.
  - Write and merge RFC 0009 as the first approved change; do not begin dependent implementation until the RFC is reviewed on main.
  - Implement shared routing-derived measurement, concrete-paths-v2, full receipt provenance, publishability policy, and reproducibility metadata against the approved base.
  - Run exploratory pilot dry runs in parallel only for qualitative methodology learning; retain immutable commits and raw observations with consent, but do not count or publish RC11 scope results.
  - Release the reviewed correction through a separate immutable RC12 release contract and verify clean-install CLI, package, Action, measurement, benchmark, and consumer smoke behavior.
  - Freeze product functionality and run the predeclared ten-task paired pilot using one intended contract and a common post-hoc scope rubric per task.
rollback:
  actions:
    - Keep RC11 as the recommended immutable release until RC12 publication and consumer smoke verification succeed.
    - Preserve v1 receipts as historical evidence without reinterpreting or deleting them.
    - Mark affected records non-publishable and withdraw quantitative claims if routing or receipt reproduction fails.
    - Publish a new corrective release candidate rather than moving or mutating an existing tag or package.
  owner: EngineeringSpec maintainers
```
