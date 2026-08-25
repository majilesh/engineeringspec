---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-rc3-release
title: Publish the agent-first RC3 release
status: superseded
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
---

# Publish the agent-first RC3 release

Prepare `v0.1.0-rc.3` from the reviewed agent-first implementation. Keep package metadata synchronized, update adopter examples to the immutable merged commit, and preserve the existing tag-driven trusted-publishing boundary.

Historical note: Implemented by commit `e72c134298b329be70cfd21f4e26923b708452d3` and released as tag `v0.1.0-rc.3`; the later implemented `ES-rc14-release` authority superseded this proposal.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: agent-first-release-follow-up
  title: Release the merged agent-first workflow for consumer dogfooding
```

## Target surfaces

```engineering-targets
- id: TARGET-version
  component: package-metadata
  paths:
    - package.json
    - package-lock.json
  change_policy: modify
- id: TARGET-pins
  component: immutable-adopter-pins
  paths:
    - src/cli/adopt.ts
    - README.md
    - docs/production-gate.md
    - _internal/adoption-notes.md
    - test/integration/cli.test.ts
  change_policy: modify
- id: TARGET-notes
  component: release-notes
  paths:
    - CHANGELOG.md
    - _internal/roadmap.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-1
  level: must
  statement: package.json and the root package-lock metadata must declare version 0.1.0-rc.3.
  applies_to: [TARGET-version]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-2
  level: must
  statement: Generated and documented production Action examples must use the full immutable SHA of the reviewed agent-first merge.
  applies_to: [TARGET-pins]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-3
  level: must_not
  statement: Release preparation must not change the format schema, Action execution semantics, or the tag-driven npm trusted-publishing workflow.
  applies_to: [TARGET-version, TARGET-pins, TARGET-notes]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-4
  level: must
  statement: Release notes must identify the agent-first workflow, trust-boundary hardening, adoption scaffold, skill, and benchmark without claiming measured impact from example data.
  applies_to: [TARGET-notes]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-5
  level: must
  statement: Publication must remain gated by a version-matching v0.1.0-rc.3 tag after repository checks pass.
  applies_to: [TARGET-version, TARGET-notes]
  enforcement: { kind: review, reviewer_role: maintainer }
```

## Verification

```engineering-verification
- id: VER-1
  proves: [CON-1, CON-2]
  kind: test
  runner:
    type: command
    argv: [npm, test]
    network: deny
  expected: { exit_code: 0 }
- id: VER-2
  proves: [CON-3, CON-4, CON-5]
  kind: human_review
  runner:
    type: manual
    reference: maintainer review of release diff, notes, immutable pins, and tag workflow
```

## Rollout

```engineering-rollout
strategy: canary
steps:
  - Merge the contract-only authorization change.
  - Merge the dependent RC3 preparation change after all checks pass.
  - Create the signed or annotated v0.1.0-rc.3 tag from the reviewed main commit.
  - Confirm the publish workflow places 0.1.0-rc.3 on the npm next dist-tag.
rollback:
  actions:
    - Do not move or reuse the tag; publish a subsequent release candidate for corrections.
  owner: EngineeringSpec maintainers
```
