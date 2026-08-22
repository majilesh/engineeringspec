---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-RC16-PUBLICATION
title: Publish EngineeringSpec 0.1.0-rc.16
status: approved
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
---

# Publish EngineeringSpec 0.1.0-rc.16

Authorize the future external publication ceremony for the already-reviewed RC16 repository tree at immutable commit `38c3be53a681eaee9d0948138250374ba28da69e`. This proposal performs no publication and grants no external release authority until this exact revision is independently reviewed, changed to `approved`, and merged into trusted main.

EngineeringSpec directly governs repository changes. Git tags, npm publication and dist-tags, and GitHub Releases are external side effects: this reviewed contract records and constrains release authority, release operators and workflows must bind execution to its exact identities and invariants, and external evidence must be reviewed before lifecycle closure. Path routing does not by itself technically enforce those external operations.

## Source intent

```engineering-source-refs
- id: SRC-RELEASE-SOURCE
  type: other
  ref: 38c3be53a681eaee9d0948138250374ba28da69e
  title: Immutable post-PR-102 RC16 release source
- id: SRC-RC16-AUTHORITY
  type: document
  path: docs/engineering-specs/ES-RC16-DX-AUTHORITY.engineering-spec.md
  title: Implemented RC16 historical replay and maintenance sequencing authority
- id: SRC-ACTION-ANCHOR
  type: document
  path: docs/engineering-specs/ES-RC16-ACTION-ANCHOR.engineering-spec.md
  title: Implemented RC16 immutable Action-anchor alignment authority
- id: SRC-PACKAGE
  type: document
  path: package.json
  title: RC16 npm package identity
- id: SRC-PACKAGE-LOCK
  type: document
  path: package-lock.json
  title: Locked RC16 npm package identity and dependency graph
- id: SRC-RELEASE-WORKFLOW
  type: document
  path: .github/workflows/release.yml
  title: Existing tag-triggered npm publication workflow
- id: SRC-RELEASE-NOTES
  type: document
  path: CHANGELOG.md
  title: Reviewed RC16 release notes
```

## Target surfaces

```engineering-targets
- id: TARGET-CONTRACT
  component: rc16-publication-authority-lifecycle
  paths:
    - docs/engineering-specs/ES-RC16-PUBLICATION.engineering-spec.md
  change_policy: modify
```

The initial proposal file is admitted only through the separately protected contract-only governance lane. After approval, the only repository write authorized by this contract is the exact `approved -> implemented` lifecycle close on this same path after external publication evidence is complete.

## Decisions

```engineering-decisions
- id: DEC-IMMUTABLE-RELEASE-SOURCE
  title: Publish only the pre-existing reviewed RC16 tree
  rationale: The publishable RC16 artifact is exactly commit 38c3be53a681eaee9d0948138250374ba28da69e. The future v0.1.0-rc.16 tag must point to that commit, not to the publication proposal, approval, execution, or closure commit; neither authority review nor lifecycle closure may alter the release source.
- id: DEC-EXISTING-WORKFLOW
  title: Let the reviewed tag workflow own npm publication
  rationale: The existing release workflow verifies tag and package identity and publishes prereleases to npm next with provenance. Publication must not be duplicated by a preceding manual npm publish.
- id: DEC-SEPARATE-PRERELEASE
  title: Create the GitHub prerelease only after successful npm publication
  rationale: The existing workflow does not create GitHub Releases, so the approved ceremony may create one manual prerelease using the reviewed RC16 notes after npm publication succeeds.
```

## Constraints

```engineering-constraints
- id: CON-EXACT-RELEASE-SOURCE
  level: must
  statement: The future v0.1.0-rc.16 tag must point exactly to commit 38c3be53a681eaee9d0948138250374ba28da69e; no proposal, approval, publication-contract closure, replacement, or other commit is permitted, and any release-source change requires a new reviewed publication authority decision.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-IMMUTABLE-TAG
  level: must
  statement: Tag v0.1.0-rc.16 must not exist before publication and, once created, must never be force-moved, deleted and recreated, or repointed as a repair mechanism.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-PACKAGE-IDENTITY
  level: must
  statement: At release source 38c3be53a681eaee9d0948138250374ba28da69e, package.json and the root package-lock package must both identify exactly @engineeringspec/cli version 0.1.0-rc.16.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-RC16-CLOSED
  level: must
  statement: ES-RC16-DX-AUTHORITY must be revision 2 and implemented, and ES-RC16-ACTION-ANCHOR must be revision 1 and implemented, at the exact release source.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-ACTION-IDENTITY
  level: must
  statement: CURRENT_ACTION_SHA and current source guidance at the release source must remain pinned to immutable Action commit ddf813e4e69d9b2f9a9eb3f0f241747746021cf3; publication must not change the Action or its pin.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-EXISTING-WORKFLOW-ONLY
  level: must
  statement: The existing reviewed v*-tag-triggered release workflow at the exact release source must own npm publication, must verify tag and package version agreement, and must not be modified or preceded by a duplicate manual npm publish under this authority.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-NPM-PROVENANCE
  level: must
  statement: Publication evidence must show that @engineeringspec/cli@0.1.0-rc.16 was published by the trusted release workflow with public access, npm dist-tag next, and provenance using npm publish --access public --tag next --provenance or its exact verified equivalent.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-NPM-NEXT
  level: must
  statement: After successful publication, npm dist-tag next must resolve exactly to 0.1.0-rc.16.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-NPM-LATEST
  level: must
  statement: npm dist-tag latest must remain at its recorded pre-publication value 0.1.0-rc.15; RC16 is a prerelease and this ceremony must not promote the default or stable channel.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-GITHUB-PRERELEASE
  level: must
  statement: After successful npm publication, GitHub release v0.1.0-rc.16 must be created as a prerelease, not as stable or latest; because the trusted npm workflow does not create it, the approved ceremony may perform only this missing manual release step.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-RELEASE-NOTES
  level: must
  statement: The GitHub prerelease notes must correspond to the reviewed public RC16 CHANGELOG content and must not include private prompts, conversations, commercial strategy, launch plans, reviewer scoring, or internal deliberation.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-CLEAN-INSTALL
  level: must
  statement: Post-publication evidence from a clean temporary directory must show successful installation, CLI version 0.1.0-rc.16, basic strict validation, the replay command, and the packaged RC16 schemas and ceremony assets.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-REPLAY-SAFETY-SMOKE
  level: must
  statement: Where practical, the published-package smoke must show historical replay retaining authorityMode historical_read_only, currentAuthorityGranted false, and writePermitted false; this verification grants no current authority and performs no replay writes or runner execution.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-NO-SOURCE-CHANGE
  level: must_not
  statement: Publication must not modify source, package identity or lock identity, schemas, action.yml, Action pins, release workflows, guidance, format, or the immutable release source; only the later exact approved-to-implemented close of this contract may change the repository under this authority.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-NO-CONSUMERS
  level: must_not
  statement: Publication must not automatically modify downstream repositories, consumers, integrations, or deployment configuration.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-NO-ACP
  level: must_not
  statement: No Agent Control Plane repository, source, documentation, configuration, package, tag, release, or consumer is part of RC16 publication.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-NO-STABLE-RELEASE
  level: must_not
  statement: This ceremony must not create version 0.1.0, move npm latest, mark the GitHub release as stable or latest, or claim EngineeringSpec format 0.1 is a stable release; RC16 remains a release candidate.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-RUNNERS-INERT
  level: must_not
  statement: Specification-declared runners are inert data and must not be executed merely because they appear in this contract.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
```

## Verification

```engineering-verification
- id: VER-RELEASE-SOURCE
  proves: [CON-EXACT-RELEASE-SOURCE, CON-PACKAGE-IDENTITY, CON-RC16-CLOSED, CON-ACTION-IDENTITY, CON-EXISTING-WORKFLOW-ONLY, CON-NO-SOURCE-CHANGE]
  kind: human_review
  runner:
    type: manual
    reference: Full-history local Git inspection of exact commit 38c3be53a681eaee9d0948138250374ba28da69e, package and lock identity, implemented RC16 contracts, immutable Action pin, and unchanged reviewed release workflow
- id: VER-PRE-PUBLICATION
  proves: [CON-IMMUTABLE-TAG, CON-NPM-LATEST]
  kind: human_review
  runner:
    type: manual
    reference: Read-only npm registry, remote Git tag, and GitHub release inspection recording rc16 absence and pre-publication next and latest values immediately before execution
- id: VER-PUBLICATION-EVIDENCE
  proves: [CON-NPM-PROVENANCE, CON-NPM-NEXT, CON-NPM-LATEST, CON-GITHUB-PRERELEASE, CON-RELEASE-NOTES, CON-CLEAN-INSTALL, CON-REPLAY-SAFETY-SMOKE]
  kind: human_review
  runner:
    type: manual
    reference: Exact tag-object and workflow evidence, npm provenance and dist-tag inspection, GitHub prerelease inspection, and clean temporary-directory published-package smoke results
- id: VER-HUMAN-RELEASE-REVIEW
  proves: [CON-NO-SOURCE-CHANGE, CON-NO-CONSUMERS, CON-NO-ACP, CON-NO-STABLE-RELEASE, CON-RUNNERS-INERT]
  kind: human_review
  runner:
    type: manual
    reference: Release-maintainer review of every immutable identity, external result, recovery decision, excluded surface, and lifecycle close after publication evidence is complete
```

## Failure and recovery

- If npm reports `0.1.0-rc.16` already exists unexpectedly, stop before creating the tag.
- If the release source SHA changes for any reason, stop and obtain a new reviewed publication-authority decision.
- If tag creation succeeds but npm publication fails, do not move, delete, recreate, or repoint the tag and do not change package files under this authority. Inspect the failure; if repository changes are required, stop and obtain new reviewed authority.
- If npm publication succeeds but GitHub prerelease creation fails, do not republish npm or move the tag. Complete only the missing GitHub prerelease step while this exact authority remains valid.
- Never repair a partial release by duplicating publication, changing immutable identities, moving `latest`, or modifying consumers.

## Rollout

```engineering-rollout
strategy: manual
steps:
  - Independently review this proposed publication authority without performing external release operations.
  - Merge the proposal, then change only this exact revision to approved in a separate lifecycle-only approval pull request and merge it.
  - Immediately before execution, re-verify release source 38c3be53a681eaee9d0948138250374ba28da69e and every package, contract, Action, workflow, npm, tag, GitHub release, and dist-tag precondition.
  - Create and push annotated tag v0.1.0-rc.16 pointing exactly to release source 38c3be53a681eaee9d0948138250374ba28da69e.
  - Observe the trusted tag workflow and require successful npm publication with public access, dist-tag next, and provenance; do not manually duplicate publication.
  - Verify npm provenance, next equals 0.1.0-rc.16, and latest remains 0.1.0-rc.15.
  - Because the workflow does not create GitHub Releases, create v0.1.0-rc.16 as a prerelease using the reviewed RC16 release notes.
  - Clean-install and smoke-test the published package, including version, strict validation, replay availability, packaged RC16 schemas and ceremony assets, and historical read-only safety where practical.
  - Collect immutable release evidence and obtain human release-maintainer review.
  - Close ES-RC16-PUBLICATION from approved to implemented in a later lifecycle-only pull request; do not combine proposal, approval, publication execution, or closure.
rollback:
  actions:
    - Leave any successfully created immutable tag or published npm artifact untouched while investigating failure.
    - Complete only a missing GitHub prerelease when npm publication and the immutable tag already succeeded under this authority.
    - Obtain new reviewed authority before any repository correction, release-source change, or replacement release candidate.
  owner: EngineeringSpec maintainers
```

## Non-goals

Source or package changes, version or lock changes, schema or format changes, Action or Action-pin changes, release-workflow changes, npm `latest`, stable `0.1.0`, site redesign, new product features, downstream consumer upgrades, Agent Control Plane work, and any publication operation inside this proposal PR are outside this contract.
