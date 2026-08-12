---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-rc12-routing-evidence-release
title: Publish the routing-derived evidence RC12 release
status: approved
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
base_revision: "e37f32e"
---

# Publish the routing-derived evidence RC12 release

Publish the reviewed routing-derived evidence implementation as `v0.1.0-rc.12`. The release makes repository-routing-derived v2 scope receipts, corrected finite authority, negative-outcome retention, and stronger paired-run reproducibility immutable and consumable without changing format 0.1, enforcement semantics, historical v1 evidence, or the public pilot's zero-observation status.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: 04d5bbd801db39cd14cbf26ca33b6990c8445574
  title: Reviewed routing-derived evidence implementation merge
- id: SRC-2
  type: document
  ref: e37f32e32ef3765df06e0ba21c1bd0968b32e34a
  title: Reviewed routing-derived evidence lifecycle closure
- id: SRC-3
  type: document
  ref: docs/engineering-specs/ES-routing-derived-evidence-v2.engineering-spec.md
  title: Implemented routing-derived evidence contract
- id: SRC-4
  type: document
  ref: rfcs/0009-routing-derived-evidence-v2.md
  title: Routing-derived evidence v2 RFC
- id: SRC-5
  type: document
  ref: docs/engineering-specs/ES-rc11-evidence-integrity-release.engineering-spec.md
  title: Previous immutable release process
```

## Target surfaces

```engineering-targets
- id: TARGET-version
  component: package-release
  paths:
    - package.json
    - package-lock.json
  change_policy: modify
- id: TARGET-pins
  component: immutable-adoption-identities
  paths:
    - src/adoption/releases.ts
    - src/cli/adopt.ts
    - test/unit/version.test.ts
    - test/unit/doctor.test.ts
    - test/integration/cli.test.ts
    - skills/engineering-spec/**
    - AGENTS.md
    - CLAUDE.md
    - .cursor/rules/**
    - integrations/**
  change_policy: modify
- id: TARGET-documentation
  component: released-routing-evidence-guidance
  paths:
    - README.md
    - CHANGELOG.md
    - maintainer-only roadmap
    - docs/agent-integration.md
    - docs/cli-reference.md
    - maintainer-only adoption notes
    - docs/first-change-tutorial.md
    - docs/getting-started.md
    - docs/integrations.md
    - docs/lifecycle.md
    - docs/maintaining-specs.md
    - docs/production-gate.md
    - docs/troubleshooting.md
    - docs/upgrading.md
    - maintainer-only launch notes/**
  change_policy: modify
- id: TARGET-site
  component: deterministic-release-site
  paths:
    - site/**
    - scripts/generate-site.mjs
  change_policy: modify
- id: TARGET-release-contract
  component: release-lifecycle
  paths:
    - docs/engineering-specs/ES-rc12-routing-evidence-release.engineering-spec.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-1
  level: must
  statement: package.json and root package-lock metadata must declare version 0.1.0-rc.12 and the compiled CLI must report the same version.
  applies_to: [TARGET-version]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-2
  level: must
  statement: Generated and documented production Action examples must pin the full reviewed routing-derived evidence implementation merge SHA 04d5bbd801db39cd14cbf26ca33b6990c8445574.
  applies_to: [TARGET-pins, TARGET-documentation]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-3
  level: must
  statement: Current generated agent guidance, packaged skill commands, current documentation, integrations, and public site examples must use exact CLI version 0.1.0-rc.12 without rewriting historical release contracts, changelog entries, retained v1 receipts, benchmark records, pilot observations, or case-study history.
  applies_to: [TARGET-pins, TARGET-documentation, TARGET-site]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-4
  level: must
  statement: Release verification must cover shared strict base-candidate loading and the 10000-candidate boundary; duplicate-ID failure; canonical candidate-set, routing-decision, and path-set digests; requested and other-contract selection; denial, ambiguity, and uncovered outcomes; rename expansion; finite literal and delete-only wildcard authority; open and repository-wide authority; dirty-worktree exclusion; receipt privacy and schema validation; v1 compatibility; negative-outcome publishability with null precision; complete path partitioning; immutable revision and pair comparability; and existing change-control behavior.
  applies_to: [TARGET-version, TARGET-pins, TARGET-documentation, TARGET-site]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-5
  level: must
  statement: Static site generation and package inspection must remain deterministic; the package must contain the concrete-paths-v2 measurement runtime and declarations, shared routing-candidate loader, scope-measurement schemas 0.1 and 0.2, benchmark schema and pilot guidance, integrations, and current skill without telemetry, hosted runtime, runner execution, or external evidence claims.
  applies_to: [TARGET-version, TARGET-site]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-6
  level: must_not
  statement: Release preparation must not change format 0.1, schemas, concrete-paths-v1 or v2 semantics, measurement or benchmark policy, target change-policy meanings, routing or governance decisions, diagnostics, runner inertness, architecture authority isolation, Action enforcement, retained pilot inputs or observations, or the tag-driven trusted-publishing boundary.
  applies_to: [TARGET-version, TARGET-pins, TARGET-documentation, TARGET-site]
  enforcement: { kind: test, verifier_ref: VER-2 }
- id: CON-7
  level: must
  statement: Release notes must describe v2 receipts as unsigned non-authoritative repository-routing observations, distinguish sample publishability from numeric metric eligibility, retain negative outcomes, disclose that v1 and manual scope evidence are non-publishable under the RC12 policy, and avoid claims of measured productivity, correctness, causality, adoption, star growth, autonomous approval, inferred authority, or external-pilot success.
  applies_to: [TARGET-documentation]
  enforcement: { kind: review, reviewer_role: evidence-reviewer }
- id: CON-8
  level: must
  statement: Publication must remain gated by a version-matching v0.1.0-rc.12 tag created from the reviewed release merge after repository, conformance, package, site, documentation, demo, clean-install CLI, v2 measure, publishable and negative benchmark, and consumer Action smoke checks pass.
  applies_to: [TARGET-version, TARGET-documentation, TARGET-site]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-9
  level: must
  statement: The RC12 release contract must transition from approved to implemented only in the reviewed release implementation and without widening authority.
  applies_to: [TARGET-release-contract]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-10
  level: must
  statement: The public pilot must remain at zero retained external observations throughout release preparation. After verified publication, product functionality must freeze for the predeclared ten-task paired pilot, with only security, correctness, evidence-integrity, and pilot-blocking documentation fixes permitted until retained evidence informs the next roadmap.
  applies_to: [TARGET-release-contract, TARGET-documentation]
  enforcement: { kind: review, reviewer_role: evidence-reviewer }
```

## Verification

```engineering-verification
- id: VER-1
  proves: [CON-1, CON-2, CON-3, CON-4, CON-5]
  kind: test
  runner:
    type: command
    argv: [npm, test]
    network: deny
  expected: { exit_code: 0 }
- id: VER-2
  proves: [CON-6]
  kind: test
  runner:
    type: command
    argv: [npm, run, test:conformance]
    network: deny
  expected: { exit_code: 0 }
- id: VER-3
  proves: [CON-7, CON-8, CON-9, CON-10]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer and evidence review of immutable identities, release-only scope, v2 compatibility, honest negative-outcome and publishability claims, trusted publication, lifecycle closure, zero-observation status, and the post-release feature freeze
```

## Rollout

```engineering-rollout
strategy: canary
steps:
  - Merge this draft as a contract-only proposal; it grants no implementation or release authority.
  - Approve only the RC12 release contract in a separate reviewed lifecycle-only change before editing release surfaces.
  - Prepare RC12 against the merged approved base and run all trusted repository, conformance, package-inspection, deterministic-site, documentation, demo, clean-install CLI, v2 measure, publishable and negative benchmark, and consumer Action checks.
  - Merge the release implementation, create the annotated v0.1.0-rc.12 tag from that reviewed main commit, publish npm on the next dist-tag, and smoke-test the immutable package and Action identities.
  - Freeze product functionality and run the predeclared ten-task paired pilot using one intended approved contract and the same post-hoc repository-routing rubric for both conditions.
rollback:
  actions:
    - Do not move or reuse the RC12 tag.
    - Keep consumers on immutable RC11 pins until the RC12 package, Action, v2 measure, benchmark, site, demo, and generated adoption behavior pass clean-install verification.
    - Preserve v1 receipts and all negative or inconclusive pilot observations without reinterpretation or deletion.
    - Publish a new corrective release candidate rather than mutating an existing package or tag.
  owner: EngineeringSpec maintainers
```
