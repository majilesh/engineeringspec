---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-rc13-recovery-release
title: Publish a clean post-rewrite RC13 recovery release
status: approved
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
base_revision: "292d14a"
---

# Publish a clean post-rewrite RC13 recovery release

Restore a consumable immutable release after the sensitive-data history rewrite and RC9-RC12 npm withdrawal. RC13 corrects repository-relative ProductSpec resolution, replaces the garbage-collectable Action identity with its sanitized equivalent, and adds a fail-closed package-content audit before publication.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: 292d14a1c99ec08487c7f8592916938fa22303be
  title: Sanitized public main after the sensitive-data history rewrite
- id: SRC-2
  type: document
  ref: e2d485cfeeb4ce745a57293db089ff70cc4648de
  title: Sanitized equivalent of the previously reviewed Action implementation merge
- id: SRC-3
  type: document
  ref: SPEC.md
  title: EngineeringSpec format 0.1 repository-relative local source-path requirement
- id: SRC-4
  type: document
  ref: docs/engineering-specs/ES-rc12-routing-evidence-release.engineering-spec.md
  title: Last historical release contract before package withdrawal and history rewrite
```

## Target surfaces

```engineering-targets
- id: TARGET-profile-resolution
  component: productspec-repository-path-resolution
  paths:
    - src/profiles/productspec/validate.ts
    - src/validator/validateFile.ts
    - src/validator/validateProfiles.ts
    - src/cli/program.ts
    - examples/productspec/**
    - test/integration/cli.test.ts
    - test/unit/core.test.ts
  change_policy: modify
- id: TARGET-package-safety
  component: release-package-content-audit
  paths:
    - package.json
    - package-lock.json
    - scripts/check-package-contents.mjs
    - test/unit/package-contents.test.ts
    - .github/workflows/ci.yml
  change_policy: modify
- id: TARGET-pins
  component: immutable-consumer-identities
  paths:
    - src/adoption/releases.ts
    - src/cli/adopt.ts
    - test/unit/version.test.ts
    - test/unit/doctor.test.ts
    - test/integration/cli.test.ts
    - skills/engineering-spec/**
    - integrations/**
    - AGENTS.md
    - CLAUDE.md
    - .cursor/rules/**
  change_policy: modify
- id: TARGET-documentation
  component: rc13-recovery-guidance
  paths:
    - README.md
    - CHANGELOG.md
    - docs/agent-integration.md
    - docs/cli-reference.md
    - docs/first-change-tutorial.md
    - docs/getting-started.md
    - docs/lifecycle.md
    - docs/production-gate.md
    - docs/troubleshooting.md
    - docs/upgrading.md
  change_policy: modify
- id: TARGET-site
  component: deterministic-release-site
  paths:
    - site/**
    - scripts/generate-site.mjs
  change_policy: modify
- id: TARGET-contract
  component: rc13-recovery-lifecycle
  paths:
    - docs/engineering-specs/ES-rc13-recovery-release.engineering-spec.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-1
  level: must
  statement: ProductSpec source paths must resolve from an explicit repository root in accordance with format 0.1, remain confined to that root, and work when an EngineeringSpec under docs/engineering-specs references a sibling repository path such as docs/product/spec.md.
  applies_to: [TARGET-profile-resolution]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-2
  level: must
  statement: Profile resolution must fail closed under strict external validation when the repository root is absent, invalid, escaping, or the referenced ProductSpec cannot be read, while --no-profile-resolution remains read-only and compatible.
  applies_to: [TARGET-profile-resolution]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-3
  level: must
  statement: package.json, root package-lock metadata, compiled CLI output, current generated guidance, current integrations, current documentation, and generated site examples must consistently use exact version 0.1.0-rc.13 without rewriting historical contracts, changelog entries, receipts, benchmark inputs, or retained evidence.
  applies_to: [TARGET-package-safety, TARGET-pins, TARGET-documentation, TARGET-site]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-4
  level: must
  statement: Current generated and documented production Action examples must pin the full sanitized reviewed commit e2d485cfeeb4ce745a57293db089ff70cc4648de, and no current consumer surface may retain the pre-rewrite Action SHA.
  applies_to: [TARGET-pins, TARGET-documentation, TARGET-site]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-5
  level: must
  statement: A deterministic package-content check must inspect the npm publish file set and fail if it contains .private, maintainer-only launch or promotion material, removed private documentation, repository secrets, Git metadata, unexpected top-level paths, or omits any declared public runtime, schema, skill, integration, example, license, specification, README, or Action entrypoint.
  applies_to: [TARGET-package-safety]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-6
  level: must_not
  statement: Recovery must not restore removed sensitive material, republish RC9-RC12, move existing tags, claim GitHub garbage collection is complete before Support confirms it, execute specification-declared runners, add telemetry, or change format 0.1, routing authority, governance decisions, target-policy semantics, receipt schemas, or trusted publication boundaries.
  applies_to: [TARGET-profile-resolution, TARGET-package-safety, TARGET-pins, TARGET-documentation, TARGET-site]
  enforcement: { kind: test, verifier_ref: VER-2 }
- id: CON-7
  level: must
  statement: RC13 publication must use a new immutable v0.1.0-rc.13 tag created from the reviewed release merge, publish npm under the next dist-tag, and pass repository, conformance, package-content, deterministic-site, clean-install CLI, and consumer Action smoke checks before any latest-tag promotion.
  applies_to: [TARGET-package-safety, TARGET-pins, TARGET-documentation, TARGET-site]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-8
  level: must
  statement: The recovery contract must transition out of approved only after the implementation and all trusted checks are reviewed, without widening its targets in the spending change.
  applies_to: [TARGET-contract]
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
  proves: [CON-7, CON-8]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer review of sanitized identities, package contents, repository-root confinement, immutable publication, and lifecycle closure
```

## Rollout

```engineering-rollout
strategy: canary
steps:
  - Review this approved-status contract-only pull request; merging it is the explicit approval act that grants authority but spends none.
  - Prepare RC13 against the merged approved base before editing the declared surfaces.
  - Implement repository-root ProductSpec resolution, sanitized pins, version repair, package auditing, tests, and current public guidance.
  - Run lint, typecheck, unit and conformance suites, build, package-content inspection, deterministic site generation, clean-install CLI smoke tests, Action smoke tests, and the complete-working-state EngineeringSpec check.
  - Merge the reviewed implementation, close the contract without widening it, create the immutable v0.1.0-rc.13 tag, publish npm under next, and verify the package and Action from a clean consumer repository.
rollback:
  actions:
    - Do not move or reuse the RC13 tag or restore an unpublished RC9-RC12 artifact.
    - Keep consumers on RC8 or a verified sanitized Action SHA until RC13 passes clean-install and consumer smoke verification.
    - Publish a new corrective release candidate rather than mutating a published package or tag.
  owner: EngineeringSpec maintainers
```
