---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 2
id: ES-rc8-frictionless-ops-release
title: Publish the frictionless agent operations RC8 release
status: implemented
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
base_revision: "77bf91a"
---

# Publish the frictionless agent operations RC8 release

Prepare `v0.1.0-rc.8` from the reviewed frictionless agent-operations implementation so CLI, Action, Agent Skill, catalogue, static Explorer, and read-only architecture-adapter consumers receive one immutable and internally consistent release.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: rfcs/0006-frictionless-agent-operations.md
  title: Frictionless agent operations RFC
- id: SRC-2
  type: document
  ref: 39d5f66212a1ea883cca0a599709b9dcd59c064a
  title: Reviewed frictionless agent-operations implementation merge
- id: SRC-3
  type: document
  ref: docs/engineering-specs/ES-rc8-frictionless-agent-operations.engineering-spec.md
  title: Frictionless agent-operations implementation contract
```

## Target surfaces

```engineering-targets
- id: TARGET-version
  component: package-release
  paths:
    - package.json
    - package-lock.json
  change_policy: modify
- id: TARGET-adopt
  component: released-adoption-and-agent-surface
  paths:
    - src/adoption/releases.ts
    - src/cli/adopt.ts
    - test/unit/doctor.test.ts
    - test/integration/cli.test.ts
    - skills/engineering-spec/**
    - README.md
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
  change_policy: modify
- id: TARGET-site
  component: deterministic-documentation-site
  paths:
    - site/**
  change_policy: modify
- id: TARGET-notes
  component: release-and-roadmap-notes
  paths:
    - CHANGELOG.md
    - _internal/roadmap.md
    - docs/engineering-specs/ES-rc8-frictionless-ops-release.engineering-spec.md
    - docs/engineering-specs/ES-rc8-frictionless-agent-operations.engineering-spec.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-1
  level: must
  statement: package.json and root package-lock metadata must declare version 0.1.0-rc.8.
  applies_to: [TARGET-version]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-2
  level: must
  statement: Generated and documented production Action examples must pin the full reviewed RC8 implementation merge SHA 39d5f66212a1ea883cca0a599709b9dcd59c064a.
  applies_to: [TARGET-adopt]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-3
  level: must
  statement: Current generated agent guidance, packaged skill commands, documentation, and public site examples must use exact CLI version 0.1.0-rc.8 rather than RC7 or a mutable distribution tag, without rewriting historical release records.
  applies_to: [TARGET-adopt, TARGET-site, TARGET-notes]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-4
  level: must
  statement: Doctor version-health expectations and safe managed adoption upgrades must recognize the RC8 CLI and immutable Action identities using bounded repository-local reads without network access or mutation outside explicitly managed content.
  applies_to: [TARGET-adopt]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-5
  level: must
  statement: RC8 package verification must demonstrate the compiled doctor, status, transition, catalogue, and architecture commands; safe adoption upgrade behaviour; schema inclusion; default compatibility; and absence of undeclared package files.
  applies_to: [TARGET-version, TARGET-adopt]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-6
  level: must
  statement: Static site generation must be deterministic, include the implemented RC8 lifecycle and release contract, preserve escaped repository-controlled content, and require no telemetry or hosted runtime.
  applies_to: [TARGET-site, TARGET-notes]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-7
  level: must_not
  statement: Release preparation must not change EngineeringSpec format 0.1, schemas, routing or governance semantics, diagnostics, runner inertness, architecture authority isolation, or the tag-driven trusted-publishing boundary.
  applies_to: [TARGET-version, TARGET-adopt, TARGET-site, TARGET-notes]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-8
  level: must
  statement: Release notes must accurately describe frictionless agent operations, deterministic discovery, and the read-only architecture bridge without claiming unmeasured agent impact, broad adoption, or architecture-derived authorization.
  applies_to: [TARGET-notes]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-9
  level: must
  statement: Publication must remain gated by a version-matching v0.1.0-rc.8 tag created from the reviewed release merge after repository, conformance, package, site, documentation, and private-consumer smoke checks pass.
  applies_to: [TARGET-version, TARGET-site, TARGET-notes]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-10
  level: must
  statement: This release contract must transition from approved to implemented in the release implementation so it cannot remain future implementation authority.
  applies_to: [TARGET-notes]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-11
  level: must
  statement: The completed ES-rc8-frictionless-agent-operations implementation contract must remain implemented and historical.
  applies_to: [TARGET-notes]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-12
  level: must
  statement: After publication, a private consumer must upgrade to immutable RC8 CLI and Action identities and smoke-test doctor, status, catalogue, implementation checking, and lifecycle closure before RC8 is recommended broadly.
  applies_to: [TARGET-adopt, TARGET-notes]
  enforcement: { kind: review, reviewer_role: maintainer }
```

## Verification

```engineering-verification
- id: VER-1
  proves: [CON-1, CON-2, CON-3, CON-4, CON-5, CON-6]
  kind: test
  runner:
    type: command
    argv: [npm, test]
    network: deny
  expected: { exit_code: 0 }
- id: VER-2
  proves: [CON-7, CON-8, CON-9, CON-10, CON-11, CON-12]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer review of immutable pins, release-only scope, package and site integrity, trust-boundary compatibility, publishing, contract closure, and private-consumer rollout
```

## Rollout

```engineering-rollout
strategy: canary
steps:
  - Merge this approved release contract through the contract-only governance lane before release implementation begins.
  - Prepare RC8 against the merged approved base and run all trusted repository, conformance, package-inspection, deterministic-site, skill, and documentation checks.
  - Merge the release implementation and create the annotated v0.1.0-rc.8 tag from its reviewed main commit.
  - Confirm npm publishes 0.1.0-rc.8 on the next dist-tag and smoke-test installation from a clean temporary repository.
  - Upgrade a private consumer to immutable RC8 CLI and Action identities, record adoption friction, and only then recommend RC8 broadly.
rollback:
  actions:
    - Do not move or reuse the RC8 tag.
    - Keep consumers on immutable RC7 pins until a corrective release candidate is published and verified.
  owner: EngineeringSpec maintainers
```
