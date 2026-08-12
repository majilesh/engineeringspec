---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-rc11-evidence-integrity-release
title: Publish the evidence-integrity RC11 release
status: draft
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
base_revision: "9cdfaf6"
---

# Publish the evidence-integrity RC11 release

Publish the reviewed evidence-integrity implementation as `v0.1.0-rc.11`. The release makes deterministic scope receipts, benchmark publishability enforcement, informational `ESG006`, and shared agent-output hardening immutable and consumable without changing format 0.1, widening authority, or claiming external impact.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: 6270ec9deef69a0af256e7b28547e2b67c7d07bf
  title: Reviewed evidence-integrity implementation merge
- id: SRC-2
  type: document
  ref: 9cdfaf6828e20f26d7981b3b304fcbe937f809f9
  title: Reviewed evidence-integrity lifecycle closure
- id: SRC-3
  type: document
  ref: docs/engineering-specs/ES-evidence-integrity-before-pilot.engineering-spec.md
  title: Implemented evidence-integrity contract
- id: SRC-4
  type: document
  ref: rfcs/0008-evidence-integrity-before-pilot.md
  title: Evidence-integrity RFC
- id: SRC-5
  type: document
  ref: docs/engineering-specs/ES-rc10-precode-brief-release.engineering-spec.md
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
    - test/unit/doctor.test.ts
    - test/integration/cli.test.ts
    - skills/engineering-spec/**
    - AGENTS.md
    - CLAUDE.md
    - .cursor/rules/**
    - integrations/**
  change_policy: modify
- id: TARGET-documentation
  component: released-evidence-integrity-guidance
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
    - docs/engineering-specs/ES-rc11-evidence-integrity-release.engineering-spec.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-1
  level: must
  statement: package.json and root package-lock metadata must declare version 0.1.0-rc.11 and the compiled CLI must report the same version.
  applies_to: [TARGET-version]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-2
  level: must
  statement: Generated and documented production Action examples must pin the full reviewed evidence-integrity implementation commit SHA a23486e3bf4e4b175c06390406c2fd401a0f2515.
  applies_to: [TARGET-pins, TARGET-documentation]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-3
  level: must
  statement: Current generated agent guidance, packaged skill commands, current documentation, integrations, and public site examples must use exact CLI version 0.1.0-rc.11 without rewriting historical release contracts, changelog entries, retained benchmark records, pilot observations, or case-study history.
  applies_to: [TARGET-pins, TARGET-documentation, TARGET-site]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-4
  level: must
  statement: Release verification must cover immutable base/head measurement, exact approved-contract selection, dirty-worktree exclusion, adds, deletes, modifications, renames, deny-overrides, receipt privacy and consistency, impossible benchmark counts, publishability completeness and sequence invariants, open-authority interpretation, informational ESG006 under strict mode, full bidi-control removal, arbitrary backtick rendering, runner-payload omission, and existing change-control behavior.
  applies_to: [TARGET-version, TARGET-pins, TARGET-documentation, TARGET-site]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-5
  level: must
  statement: Static site generation and package inspection must remain deterministic; the package must contain the measure command, measurement module declarations and runtime, scope-measurement schema, benchmark schema and guidance, integrations, and current skill without telemetry, hosted runtime, or external evidence claims.
  applies_to: [TARGET-version, TARGET-site]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-6
  level: must_not
  statement: Release preparation must not change format 0.1, schemas, measurement or benchmark semantics, routing or governance decisions, diagnostics, runner inertness, architecture authority isolation, Action enforcement, retained benchmark inputs, pilot observations, or the tag-driven trusted-publishing boundary.
  applies_to: [TARGET-version, TARGET-pins, TARGET-documentation, TARGET-site]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-7
  level: must
  statement: Release notes must describe measure receipts as unsigned non-authoritative observations, publishability as evidence completeness rather than correctness or causality, open-authority precision as unavailable, and ESG006 as informational path-level disclosure; they must not claim measured productivity, correctness, adoption, star growth, autonomous approval, inferred authority, or external-pilot success.
  applies_to: [TARGET-documentation]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-8
  level: must
  statement: Publication must remain gated by a version-matching v0.1.0-rc.11 tag created from the reviewed release merge after repository, conformance, package, site, documentation, demo, clean-install CLI, measure, benchmark, and consumer Action smoke checks pass.
  applies_to: [TARGET-version, TARGET-documentation, TARGET-site]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-9
  level: must
  statement: The RC11 release contract must transition from approved to implemented only in the reviewed release implementation and without widening authority.
  applies_to: [TARGET-release-contract]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-10
  level: must
  statement: The pre-code evidence pilot contract and public pilot status must remain unfinished throughout release preparation; release activity must not add, edit, discard, or present zero-observation pilot data as completed evidence.
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
    reference: Maintainer and evidence review of immutable identities, release-only scope, honest evidence limitations, trusted publication, lifecycle closure, and the still-unfinished external pilot
```

## Rollout

```engineering-rollout
strategy: canary
steps:
  - Merge this draft as a contract-only proposal; it grants no implementation authority.
  - Approve only the RC11 release contract in a separate reviewed lifecycle-only change before editing release surfaces.
  - Prepare RC11 against the merged approved base and run all trusted repository, conformance, package-inspection, deterministic-site, documentation, demo, clean-install CLI, measure, benchmark, and consumer Action checks.
  - Merge the release implementation, create the annotated v0.1.0-rc.11 tag from that reviewed main commit, publish npm on the next dist-tag, and smoke-test the immutable package and Action identities.
  - Freeze product expansion and begin the predeclared paired pilot only after RC11 publication and smoke verification succeed.
rollback:
  actions:
    - Do not move or reuse the RC11 tag.
    - Keep consumers on immutable RC10 pins until the RC11 package, Action, measure, benchmark, site, demo, and generated adoption behavior pass clean-install verification.
    - Publish a new corrective release candidate rather than mutating an existing package or tag.
  owner: EngineeringSpec maintainers
```
