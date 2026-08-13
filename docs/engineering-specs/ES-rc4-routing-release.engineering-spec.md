---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 2
id: ES-rc4-routing-release
title: Publish the multi-spec routing RC4 release
status: implemented
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
base_revision: da9b6d7
---

# Publish the multi-spec routing RC4 release

Prepare `v0.1.0-rc.4` from the reviewed multi-spec routing implementation. Publish immutable routing-capable pins before switching generated adopters from the compatible single-spec workflow to strict, approved-only directory routing.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: rfcs/0002-deterministic-multi-spec-routing.md
  title: Deterministic multi-spec routing RFC
- id: SRC-2
  type: document
  ref: da9b6d7
  title: Reviewed multi-spec routing implementation merge
```

## Target surfaces

```engineering-targets
- id: TARGET-version
  component: package-release
  paths:
    - package.json
    - package-lock.json
    - .github/workflows/release.yml
  change_policy: modify
- id: TARGET-adopt
  component: immutable-routing-adoption
  paths:
    - src/cli/adopt.ts
    - test/integration/cli.test.ts
    - skills/**
    - README.md
    - docs/agent-integration.md
    - docs/production-gate.md
    - _internal/adoption-notes.md
  change_policy: modify
- id: TARGET-ci
  component: repository-enforcement
  paths:
    - .github/workflows/ci.yml
    - AGENTS.md
    - CLAUDE.md
    - .cursor/rules/**
  change_policy: modify
- id: TARGET-notes
  component: release-and-lifecycle-notes
  paths:
    - CHANGELOG.md
    - _internal/roadmap.md
    - docs/engineering-specs/ES-rc4-routing-release.engineering-spec.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-1
  level: must
  statement: package.json and root package-lock metadata must declare version 0.1.0-rc.4.
  applies_to: [TARGET-version]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-2
  level: must
  statement: Generated and documented routing-capable Action examples must pin the full reviewed implementation merge SHA da9b6d7a7fabb17ec2169cdf3a4ca4278cbdeb76.
  applies_to: [TARGET-adopt]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-3
  level: must
  statement: Generated enforcing CI must use gate-spec-dir over docs/engineering-specs, a resolved approved base, strict mode, and approved-only eligibility without removing compatible single-spec Action inputs.
  applies_to: [TARGET-adopt, TARGET-ci]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-4
  level: must
  statement: Generated agent checks must use base-pinned multi-spec check/select, and packaged skill fallback commands must pin exactly 0.1.0-rc.4 rather than a mutable distribution tag.
  applies_to: [TARGET-adopt]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-5
  level: must
  statement: Repository CI must authorize the release implementation from this approved base contract and continue dogfooding directory routing.
  applies_to: [TARGET-ci]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-6
  level: must_not
  statement: Release preparation must not change the EngineeringSpec format/schema, routing semantics, runner inertness, or tag-driven trusted-publishing boundary.
  applies_to: [TARGET-version, TARGET-adopt, TARGET-ci, TARGET-notes]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-7
  level: must
  statement: Release notes must describe routing and adoption capabilities without claiming unmeasured agent impact or external adoption.
  applies_to: [TARGET-notes]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-8
  level: must
  statement: Publication must remain gated by a version-matching v0.1.0-rc.4 tag after repository checks pass.
  applies_to: [TARGET-version, TARGET-notes]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-9
  level: must
  statement: This release contract must transition from approved to implemented in the release implementation so historical contracts do not remain eligible for future routing.
  applies_to: [TARGET-notes]
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
  proves: [CON-6, CON-7, CON-8, CON-9]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer review of immutable pins, release notes, trusted publishing, and contract lifecycle
```

## Rollout

```engineering-rollout
strategy: canary
steps:
  - Merge this contract-only lifecycle and authorization change.
  - Prepare RC4 against this approved base contract and switch generated adopters to directory routing.
  - Merge the release implementation after all single-spec and multi-spec gates pass.
  - Create the signed or annotated v0.1.0-rc.4 tag from the reviewed merge commit.
  - Confirm npm publishes 0.1.0-rc.4 on the next dist-tag before announcing adopter migration.
rollback:
  actions:
    - Do not move or reuse the RC4 tag.
    - Keep existing adopters on the prior immutable single-spec Action pin until a corrective release is published.
  owner: EngineeringSpec maintainers
```
