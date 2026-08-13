---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-rc10-precode-brief-release
title: Publish the base-pinned pre-code brief RC10 release
status: implemented
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
base_revision: "adca902"
---

# Publish the base-pinned pre-code brief RC10 release

Publish the reviewed base-pinned `prepare` workflow, evidence-quality benchmark additions, and output hardening as `v0.1.0-rc.10`. The release makes pre-code authority guidance immutable and consumable while preserving honest zero-observation pilot reporting and every existing fail-closed enforcement boundary.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: d372a74d8948d525727ed5ed04e2aa4442a72b1a
  title: Reviewed base-pinned prepare implementation merge
- id: SRC-2
  type: document
  ref: 1fb498de6d47f3f95473abbb6bb5c9e3959469b6
  title: Reviewed evidence-quality benchmark and pilot-kit merge
- id: SRC-3
  type: document
  ref: adca902af74aa0d6369c168bd9115341e46b492f
  title: Reviewed prepare output hardening merge
- id: SRC-4
  type: document
  ref: docs/engineering-specs/ES-precode-brief-evidence-pilot.engineering-spec.md
  title: Paused pre-code brief and evidence pilot contract
- id: SRC-5
  type: document
  ref: docs/engineering-specs/ES-rc9-agent-change-control-release.engineering-spec.md
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
  component: released-prepare-and-evidence-guidance
  paths:
    - README.md
    - CHANGELOG.md
    - _internal/roadmap.md
    - docs/agent-integration.md
    - docs/cli-reference.md
    - _internal/adoption-notes.md
    - docs/first-change-tutorial.md
    - docs/getting-started.md
    - docs/integrations.md
    - docs/lifecycle.md
    - docs/maintaining-specs.md
    - docs/production-gate.md
    - docs/troubleshooting.md
    - docs/upgrading.md
    - _internal/launch-notes/**
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
    - docs/engineering-specs/ES-rc10-precode-brief-release.engineering-spec.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-1
  level: must
  statement: package.json and root package-lock metadata must declare version 0.1.0-rc.10 and the compiled CLI must report the same version.
  applies_to: [TARGET-version]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-2
  level: must
  statement: Generated and documented production Action examples must pin the full reviewed prepare hardening merge SHA adca902af74aa0d6369c168bd9115341e46b492f.
  applies_to: [TARGET-pins, TARGET-documentation]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-3
  level: must
  statement: Current generated agent guidance, packaged skill commands, current documentation, integrations, and public site examples must use exact CLI version 0.1.0-rc.10 without rewriting historical release contracts, changelog entries, retained benchmark records, or pilot observations.
  applies_to: [TARGET-pins, TARGET-documentation, TARGET-site]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-4
  level: must
  statement: Release verification must cover base-pinned prepare authority, blocked lifecycle states, runner-payload omission, output sanitization, interface-only wording, technical-contract rendering, final-routing caveats, benchmark missing-data retention, scope precision, and existing change-control behavior.
  applies_to: [TARGET-version, TARGET-pins, TARGET-documentation, TARGET-site]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-5
  level: must
  statement: Static site generation and package inspection must remain deterministic, include prepare and the intended packaged benchmark and integration assets, and require no telemetry, hosted runtime, or external evidence claim.
  applies_to: [TARGET-version, TARGET-site]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-6
  level: must_not
  statement: Release preparation must not change format 0.1, schemas, routing or governance semantics, diagnostics, runner inertness, architecture authority isolation, current Action enforcement, retained benchmark inputs, pilot observations, or the tag-driven trusted-publishing boundary.
  applies_to: [TARGET-version, TARGET-pins, TARGET-documentation, TARGET-site]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-7
  level: must
  statement: Release notes must describe prepare as pre-code guidance over immutable approved authority with select, check, and CI remaining final enforcement, and must not claim measured productivity, correctness, adoption, star growth, autonomous approval, inferred authority, or external-pilot success.
  applies_to: [TARGET-documentation]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-8
  level: must
  statement: Publication must remain gated by a version-matching v0.1.0-rc.10 tag created from the reviewed release merge after repository, conformance, package, site, documentation, demo, and clean-install smoke checks pass.
  applies_to: [TARGET-version, TARGET-documentation, TARGET-site]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-9
  level: must
  statement: The RC10 release contract must transition from approved to implemented in the reviewed release implementation without widening authority.
  applies_to: [TARGET-release-contract]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-10
  level: must
  statement: The pre-code evidence pilot contract must remain proposed throughout release preparation and may be reapproved only after RC10 publication is verified; release activity must not close the unfinished pilot or present its zero-observation state as completed evidence.
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
    reference: Maintainer and evidence review of immutable identities, release-only scope, honest claims, trusted publication, lifecycle closure, and later evidence-pilot reapproval
```

## Rollout

```engineering-rollout
strategy: canary
steps:
  - Merge this contract-only governance preparation so overlapping evidence authority is paused and the RC10 release contract remains a draft.
  - Approve only the RC10 release contract in a separate reviewed contract-only change before editing release surfaces.
  - Prepare RC10 against the merged approved base and run all trusted repository, conformance, package-inspection, deterministic-site, documentation, demo, and clean-install checks.
  - Merge the release implementation, create the annotated v0.1.0-rc.10 tag from that reviewed main commit, publish npm on the next dist-tag, and smoke-test the immutable package and Action identities.
  - Reapprove the pre-code evidence pilot only after publication verification, then continue collecting retained paired observations without changing historical release authority.
rollback:
  actions:
    - Do not move or reuse the RC10 tag.
    - Keep consumers on immutable RC9 pins until the RC10 package, Action, prepare output, demo, and generated adoption behavior pass clean-install verification.
    - Publish a new corrective release candidate rather than mutating an existing package or tag.
  owner: EngineeringSpec maintainers
```
