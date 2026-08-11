---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-rc9-agent-change-control-release
title: Publish the agent change-control workflow RC9 release
status: approved
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
base_revision: "85f42b2"
---

# Publish the agent change-control workflow RC9 release

Publish the reviewed PR 43 implementation as `v0.1.0-rc.9` so draft proposal, base-pinned review, safe quickstart, GitHub job summaries, thin coding-agent integrations, and the fail-closed demo become one immutable and internally consistent release before the evidence-first increment begins.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: 85f42b2cd3c9ef6513de1a9a3ccfd8e12a9dd756
  title: Reviewed frictionless-adoption implementation merge
- id: SRC-2
  type: document
  ref: docs/engineering-specs/ES-frictionless-adoption-launch.engineering-spec.md
  title: Completed frictionless-adoption implementation contract
- id: SRC-3
  type: document
  ref: docs/engineering-specs/ES-rc8-frictionless-ops-release.engineering-spec.md
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
  component: released-command-and-adoption-guidance
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
    - docs/engineering-specs/ES-rc9-agent-change-control-release.engineering-spec.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-1
  level: must
  statement: package.json and root package-lock metadata must declare version 0.1.0-rc.9 and the compiled CLI must report the same version.
  applies_to: [TARGET-version]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-2
  level: must
  statement: Generated and documented production Action examples must pin the full reviewed PR 43 implementation merge SHA 85f42b2cd3c9ef6513de1a9a3ccfd8e12a9dd756 because it is the immutable commit that introduced the released Action behavior.
  applies_to: [TARGET-pins, TARGET-documentation]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-3
  level: must
  statement: Current generated agent guidance, packaged skill commands, current documentation, integrations, and public site examples must use exact CLI version 0.1.0-rc.9 without rewriting historical release contracts, changelog entries, case-study observations, or benchmark inputs.
  applies_to: [TARGET-pins, TARGET-documentation, TARGET-site]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-4
  level: must
  statement: Release verification must cover propose draft-only behavior, base-pinned review and payload omission, quickstart overwrite safety, immutable Action summaries, agent integration neutrality, fail-closed demo behavior, package contents, and version-health diagnostics.
  applies_to: [TARGET-version, TARGET-pins, TARGET-documentation, TARGET-site]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-5
  level: must
  statement: Static site generation and package inspection must remain deterministic, include the current lifecycle catalogue and intended packaged integration and demo assets, and require no telemetry or hosted runtime.
  applies_to: [TARGET-version, TARGET-site]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-6
  level: must_not
  statement: Release preparation must not change format 0.1, schemas, routing or governance semantics, diagnostics, runner inertness, architecture authority isolation, current Action enforcement behavior, benchmark results, or the tag-driven trusted-publishing boundary.
  applies_to: [TARGET-version, TARGET-pins, TARGET-documentation, TARGET-site]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-7
  level: must
  statement: Release notes must accurately describe the shipped change-control workflow without claiming measured productivity, correctness, adoption, star growth, autonomous approval, inferred authority, or external-adopter success.
  applies_to: [TARGET-documentation]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-8
  level: must
  statement: Publication must remain gated by a version-matching v0.1.0-rc.9 tag created from the reviewed release merge after repository, conformance, package, site, documentation, demo, and clean-install smoke checks pass.
  applies_to: [TARGET-version, TARGET-documentation, TARGET-site]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-9
  level: must
  statement: The release contract must transition from approved to implemented in the reviewed release implementation without widening authority, and the paused pre-code evidence contract must be reapproved only after RC9 publication is verified.
  applies_to: [TARGET-release-contract]
  enforcement: { kind: review, reviewer_role: maintainer }
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
  proves: [CON-7, CON-8, CON-9]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer review of immutable identities, release-only scope, honest claims, trusted publishing, lifecycle closure, and subsequent pre-code contract reapproval
```

## Rollout

```engineering-rollout
strategy: canary
steps:
  - Merge this contract-only governance preparation so the completed implementation contract is closed, overlapping future authority is paused, and this release contract remains a draft.
  - Approve this release contract in a separate reviewed contract-only change before editing release surfaces.
  - Prepare RC9 against the merged approved base and run all trusted repository, conformance, package-inspection, deterministic-site, documentation, demo, and clean-install checks.
  - Merge the release implementation, create the annotated v0.1.0-rc.9 tag from that reviewed main commit, publish npm on the next dist-tag, and smoke-test the immutable package and Action identities.
  - Reapprove the pre-code work brief and evidence pilot only after publication verification, then implement it against that new base.
rollback:
  actions:
    - Do not move or reuse the RC9 tag.
    - Keep consumers on immutable RC8 pins until RC9 package, Action, demo, and generated adoption behavior pass clean-install verification.
    - Publish a new corrective release candidate rather than mutating an existing package or tag.
  owner: EngineeringSpec maintainers
```
