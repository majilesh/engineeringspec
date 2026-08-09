---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 2
id: ES-rc5-lifecycle-release
title: Publish the routing lifecycle RC5 release
status: implemented
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
base_revision: e28b124
---

# Publish the routing lifecycle RC5 release

Prepare `v0.1.0-rc.5` from the reviewed routing lifecycle implementation so npm and Action consumers receive clean-state not-applicable routing while non-empty changes remain fail-closed.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: rfcs/0003-vacuous-empty-routing.md
  title: Routing lifecycle edge cases RFC
- id: SRC-2
  type: document
  ref: e28b124ec2ca2135c4f3ad0f999a7cb9f715365d
  title: Reviewed routing lifecycle implementation merge
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
  component: immutable-adopter-pins
  paths:
    - src/cli/adopt.ts
    - test/integration/cli.test.ts
    - skills/engineering-spec/SKILL.md
    - README.md
    - docs/agent-integration.md
    - docs/production-gate.md
    - maintainer-only adoption notes
  change_policy: modify
- id: TARGET-ci
  component: repository-enforcement
  paths:
    - .github/workflows/ci.yml
  change_policy: modify
- id: TARGET-notes
  component: release-and-lifecycle-notes
  paths:
    - CHANGELOG.md
    - maintainer-only roadmap
    - docs/engineering-specs/ES-rc5-lifecycle-release.engineering-spec.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-1
  level: must
  statement: package.json and root package-lock metadata must declare version 0.1.0-rc.5.
  applies_to: [TARGET-version]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-2
  level: must
  statement: Generated and documented routing-capable Action examples must pin the full reviewed lifecycle implementation merge SHA e28b124ec2ca2135c4f3ad0f999a7cb9f715365d.
  applies_to: [TARGET-adopt]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-3
  level: must
  statement: Generated agent checks and packaged skill fallback commands must pin exactly 0.1.0-rc.5 rather than a mutable distribution tag.
  applies_to: [TARGET-adopt]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-4
  level: must
  statement: Repository CI must authorize the RC5 implementation from this approved base contract and retain approved-only directory-routing dogfood.
  applies_to: [TARGET-ci]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-5
  level: must_not
  statement: Release preparation must not change the EngineeringSpec format, schema, routing semantics, contract-only classification, runner inertness, or tag-driven trusted-publishing boundary.
  applies_to: [TARGET-version, TARGET-adopt, TARGET-ci, TARGET-notes]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-6
  level: must
  statement: Release notes must accurately describe clean-state not-applicable routing and the repository contract-only lane without claiming unmeasured agent impact or external adoption.
  applies_to: [TARGET-notes]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-7
  level: must
  statement: Publication must remain gated by a version-matching v0.1.0-rc.5 tag after repository checks pass.
  applies_to: [TARGET-version, TARGET-notes]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-8
  level: must
  statement: This release contract must transition from approved to implemented in the release implementation.
  applies_to: [TARGET-notes]
  enforcement: { kind: review, reviewer_role: maintainer }
```

## Verification

```engineering-verification
- id: VER-1
  proves: [CON-1, CON-2, CON-3, CON-4]
  kind: test
  runner:
    type: command
    argv: [npm, test]
    network: deny
  expected: { exit_code: 0 }
- id: VER-2
  proves: [CON-5, CON-6, CON-7, CON-8]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer review of immutable pins, release claims, trusted publishing, and lifecycle closure
```

## Rollout

```engineering-rollout
strategy: canary
steps:
  - Merge this contract-only authorization change through the RFC/spec governance lane.
  - Prepare RC5 against this approved base contract and run all trusted repository checks.
  - Merge the release implementation and create the annotated v0.1.0-rc.5 tag from its reviewed main commit.
  - Confirm npm publishes 0.1.0-rc.5 on the next dist-tag and smoke-test it from a clean directory.
  - Begin paired-task adoption benchmarking with the published RC5 package.
rollback:
  actions:
    - Do not move or reuse the RC5 tag.
    - Keep consumers on the RC4 immutable pin until a corrective release candidate is published.
  owner: EngineeringSpec maintainers
```
