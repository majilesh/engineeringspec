---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 2
id: ES-rc6-intuitive-workflow-release
title: Publish the intuitive agent workflow RC6 release
status: implemented
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
base_revision: b391a64
---

# Publish the intuitive agent workflow RC6 release

Prepare `v0.1.0-rc.6` from the reviewed intuitive workflow implementation so package and Action consumers receive read-only `doctor` and `status`, six-stage agent guidance, and directory-only repository authorization.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: rfcs/0004-intuitive-agent-workflow.md
  title: Intuitive agent workflow RFC
- id: SRC-2
  type: document
  ref: 122ec6f0329b19e21a58a2f179aea3328cb8e1ac
  title: Reviewed intuitive agent workflow implementation merge
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
  component: released-adoption-surface
  paths:
    - src/cli/adopt.ts
    - test/integration/cli.test.ts
    - skills/engineering-spec/SKILL.md
    - README.md
    - docs/agent-integration.md
    - docs/getting-started.md
    - docs/production-gate.md
    - maintainer-only adoption notes
  change_policy: modify
- id: TARGET-notes
  component: release-and-roadmap-notes
  paths:
    - CHANGELOG.md
    - maintainer-only roadmap
    - docs/engineering-specs/ES-rc6-intuitive-workflow-release.engineering-spec.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-1
  level: must
  statement: package.json and root package-lock metadata must declare version 0.1.0-rc.6.
  applies_to: [TARGET-version]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-2
  level: must
  statement: Generated and documented production Action examples must pin the full reviewed intuitive-workflow implementation merge SHA 122ec6f0329b19e21a58a2f179aea3328cb8e1ac.
  applies_to: [TARGET-adopt]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-3
  level: must
  statement: Current generated agent guidance, packaged skill commands, and current adoption documentation must use exact CLI version 0.1.0-rc.6 rather than RC5 or a mutable distribution tag, without rewriting historical release records.
  applies_to: [TARGET-adopt, TARGET-notes]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-4
  level: must
  statement: Generated neutral agent guidance must present explore, propose, approve, implement, verify, and close; include doctor and status; retain base-pinned approved-only selection and complete-working-state check; and keep declared runners inert.
  applies_to: [TARGET-adopt]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-5
  level: must
  statement: RC6 package verification must demonstrate that the compiled doctor and status commands are present, read-only, and successful for a clean self-contained checkout without requiring a remote-tracking ref.
  applies_to: [TARGET-version, TARGET-adopt]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-6
  level: must_not
  statement: Release preparation must not change the EngineeringSpec format, schema, doctor/status semantics, routing rules, runner inertness, directory-only repository authorization, or tag-driven trusted-publishing boundary.
  applies_to: [TARGET-version, TARGET-adopt, TARGET-notes]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-7
  level: must
  statement: Release notes must accurately describe workflow and diagnostics without claiming unmeasured agent impact, enterprise adoption, or architectural enforcement.
  applies_to: [TARGET-notes]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-8
  level: must
  statement: Publication must remain gated by a version-matching v0.1.0-rc.6 tag created from the reviewed release merge after repository checks pass.
  applies_to: [TARGET-version, TARGET-notes]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-9
  level: must
  statement: This release contract must transition from approved to implemented in the release implementation so it cannot remain future implementation authority.
  applies_to: [TARGET-notes]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-10
  level: must
  statement: Roadmap guidance must make private consumer dogfooding and at least ten paired benchmark tasks the next proof step before hosted UI, broad plugins, MCP, or architecture adapters.
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
  proves: [CON-6, CON-7, CON-8, CON-9, CON-10]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer review of immutable pins, lifecycle guidance, release claims, trusted publishing, roadmap ordering, and contract closure
```

## Rollout

```engineering-rollout
strategy: canary
steps:
  - Merge this approved release contract through the contract-only governance lane.
  - Prepare RC6 against the merged base and run all trusted repository checks.
  - Merge the release implementation and create the annotated v0.1.0-rc.6 tag from its reviewed main commit.
  - Confirm npm publishes 0.1.0-rc.6 on the next dist-tag and smoke-test doctor and status from a clean temporary repository.
  - Dogfood the released workflow in a private consumer repository and begin paired-task measurement.
rollback:
  actions:
    - Do not move or reuse the RC6 tag.
    - Keep consumers on the immutable RC5 pin until a corrective release candidate is published.
  owner: EngineeringSpec maintainers
```
