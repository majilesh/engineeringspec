---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-RC17-PUBLICATION
title: Publish EngineeringSpec 0.1.0-rc.17
status: proposed
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
---

# Publish EngineeringSpec 0.1.0-rc.17

Authorize a future external publication ceremony for the already-reviewed RC17 release source at immutable commit `adee67a580d2f1c681de8d362963a8b0783d2017`. This proposal performs no publication and grants no external release authority until this exact revision is independently reviewed, changed only to `approved` in a separate contract-only change, and merged into trusted main.

EngineeringSpec directly governs repository changes. Git tags, npm publication and dist-tags, and GitHub Releases are external side effects: this reviewed contract records and constrains release authority, release operators and workflows must bind execution to its exact identities and invariants, and external evidence must be separately reviewed before lifecycle closure. Path routing does not itself technically enforce those external operations.

## Source intent

```engineering-source-refs
- id: SRC-RELEASE-SOURCE
  type: other
  ref: adee67a580d2f1c681de8d362963a8b0783d2017
  title: Immutable merged RC17 release-preparation source
- id: SRC-RC17-RELEASE
  type: document
  path: docs/engineering-specs/ES-rc17-release.engineering-spec.md
  title: Implemented RC17 release-preparation authority
- id: SRC-PACKAGE
  type: document
  path: package.json
  title: RC17 npm package identity
- id: SRC-PACKAGE-LOCK
  type: document
  path: package-lock.json
  title: Locked RC17 npm package identity and dependency graph
- id: SRC-RELEASE-WORKFLOW
  type: document
  path: .github/workflows/release.yml
  title: Existing v-star-tag-triggered npm publication workflow
- id: SRC-RELEASE-NOTES
  type: document
  path: CHANGELOG.md
  title: Reviewed RC17 release notes
```

## Target surfaces

```engineering-targets
- id: TARGET-CONTRACT
  component: rc17-publication-authority-lifecycle
  paths:
    - docs/engineering-specs/ES-RC17-PUBLICATION.engineering-spec.md
  change_policy: modify
```

The initial proposal is admitted only through the separately protected contract-only governance lane. After approval, the only repository write authorized by this contract is the exact `approved -> implemented` lifecycle close on this same path after publication evidence and separate post-publication review are complete.

## Decisions

```engineering-decisions
- id: DEC-IMMUTABLE-RELEASE-SOURCE
  title: Publish only the reviewed RC17 source tree
  rationale: The sole publishable RC17 artifact is commit adee67a580d2f1c681de8d362963a8b0783d2017. The future v0.1.0-rc.17 tag must point to that commit, not to a proposal, approval, publication, or closure commit; authority review and lifecycle closure must not alter the release source.
- id: DEC-EXISTING-WORKFLOW
  title: Let the reviewed tag workflow own npm publication
  rationale: The unchanged release workflow verifies tag and package identity and publishes prereleases publicly to npm dist-tag next with provenance. Publication must not be duplicated by a manual npm publish.
- id: DEC-NPM-BEFORE-GITHUB
  title: Require npm success before creating the GitHub prerelease
  rationale: The existing workflow does not create GitHub Releases. Only after its npm publication succeeds may the approved ceremony create the missing GitHub prerelease using the reviewed RC17 notes.
- id: DEC-SEPARATE-EVIDENCE-CLOSE
  title: Review immutable publication evidence before lifecycle closure
  rationale: External publication results must be collected and separately reviewed before the exact approved-to-implemented close is proposed; publication execution and closure must not be combined.
```

## Constraints

```engineering-constraints
- id: CON-NO-DRAFT-AUTHORITY
  level: must
  statement: This proposed revision grants no publication authority. Publication may begin only after this exact revision is independently reviewed, changed only from proposed to approved in a separate contract-only change, and merged into trusted main.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-EXACT-RELEASE-SOURCE
  level: must
  statement: Tag v0.1.0-rc.17 must point exactly to commit adee67a580d2f1c681de8d362963a8b0783d2017; no proposal, approval, publication-contract closure, replacement, or other commit is permitted, and any release-source change requires new reviewed publication authority.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-ONLY-RC17-IDENTITY
  level: must_not
  statement: This authority must not create, publish, move, delete, recreate, or otherwise operate on any Git tag, npm package version, or GitHub Release other than the exact v0.1.0-rc.17 and @engineeringspec/cli@0.1.0-rc.17 identities constrained here; the only permitted dist-tag change is next resolving to 0.1.0-rc.17.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-IMMUTABLE-TAG
  level: must
  statement: Tag v0.1.0-rc.17 must not exist before publication and, once created, must never be force-moved, deleted and recreated, or repointed, including after partial failure.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-PACKAGE-IDENTITY
  level: must
  statement: At release source adee67a580d2f1c681de8d362963a8b0783d2017, package.json, the package-lock top-level version, and the package-lock root-package version must all identify exactly @engineeringspec/cli version 0.1.0-rc.17; the tag and package identities must agree exactly.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-RC17-PREPARED
  level: must
  statement: ES-rc17-release must be revision 1 and implemented at the exact release source.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-ACTION-IDENTITY
  level: must
  statement: CURRENT_ACTION_SHA and current source guidance at the release source must remain pinned to immutable Action commit ddf813e4e69d9b2f9a9eb3f0f241747746021cf3; publication must not change the Action or its pin.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-EXISTING-WORKFLOW-ONLY
  level: must
  statement: The unchanged existing v*-tag-triggered .github/workflows/release.yml at the exact release source must own npm publication and must verify tag and package version agreement. This authority prohibits any duplicate manual npm publish.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-NPM-PROVENANCE
  level: must
  statement: Publication evidence must show @engineeringspec/cli@0.1.0-rc.17 was published by the trusted release workflow with public access, npm dist-tag next, and provenance using npm publish --access public --tag next --provenance or its exact workflow-defined equivalent.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-NPM-NEXT
  level: must
  statement: After successful publication, npm dist-tag next must resolve exactly to 0.1.0-rc.17.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-NPM-LATEST
  level: must
  statement: npm dist-tag latest must remain at its recorded pre-publication value 0.1.0-rc.15; RC17 must not promote the default or stable channel.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-GITHUB-PRERELEASE
  level: must
  statement: Only after successful npm publication, GitHub Release v0.1.0-rc.17 must be created as a prerelease, not stable or latest, using the reviewed RC17 release notes; this is the only manual publication step authorized because the trusted npm workflow does not create GitHub Releases.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-CLEAN-REGISTRY-INSTALL
  level: must
  statement: Post-publication evidence from a clean temporary directory must install exactly @engineeringspec/cli@0.1.0-rc.17 from the public npm registry, confirm the installed CLI reports 0.1.0-rc.17, and prove the installed artifact identity rather than reusing a local tarball or repository checkout.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-PERMISSION-TICKET-SMOKE
  level: must
  statement: The exact clean registry installation must pass a compact PermissionTicket smoke covering next and work, including expected implementation permission from a base-pinned approved fixture, while preserving the verbose compatibility path and executing no specification-declared runners.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-PARTIAL-FAILURE
  level: must
  statement: After any partial failure, do not move, delete, recreate, or repoint the immutable tag, do not duplicate npm publication, and do not change release identities. Complete only an independently missing GitHub prerelease after npm success, or stop and obtain new reviewed authority for any other correction.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-NO-SOURCE-CHANGE
  level: must_not
  statement: Publication must not modify source, package or lock identity, workflows, schemas, Action code or pins, consumers, dependencies, guidance, tests, features, release notes, or the immutable release source; only the later exact approved-to-implemented close of this contract may change the repository under this authority.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-NO-CONSUMERS
  level: must_not
  statement: Publication must not modify downstream repositories, consumers, integrations, deployment configuration, or dist-tags other than npm next.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-NO-STABLE-RELEASE
  level: must_not
  statement: This ceremony must not create stable version 0.1.0, move npm latest, mark the GitHub Release stable or latest, or claim EngineeringSpec format 0.1 is stable; RC17 remains a prerelease.
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
  proves: [CON-EXACT-RELEASE-SOURCE, CON-ONLY-RC17-IDENTITY, CON-PACKAGE-IDENTITY, CON-RC17-PREPARED, CON-ACTION-IDENTITY, CON-EXISTING-WORKFLOW-ONLY, CON-NO-SOURCE-CHANGE]
  kind: human_review
  runner:
    type: manual
    reference: Full-history local Git inspection of exact commit adee67a580d2f1c681de8d362963a8b0783d2017, package and lock identity, implemented RC17 preparation contract, immutable Action pin, and unchanged release workflow
- id: VER-PRE-PUBLICATION
  proves: [CON-NO-DRAFT-AUTHORITY, CON-IMMUTABLE-TAG, CON-NPM-LATEST]
  kind: human_review
  runner:
    type: manual
    reference: Read-only remote Git tag, GitHub Release, and npm registry inspection recording RC17 absence plus pre-publication next 0.1.0-rc.16 and latest 0.1.0-rc.15 immediately before execution
- id: VER-PUBLICATION-EVIDENCE
  proves: [CON-NPM-PROVENANCE, CON-NPM-NEXT, CON-NPM-LATEST, CON-GITHUB-PRERELEASE, CON-CLEAN-REGISTRY-INSTALL, CON-PERMISSION-TICKET-SMOKE, CON-PARTIAL-FAILURE]
  kind: human_review
  runner:
    type: manual
    reference: Exact immutable tag and workflow evidence, npm provenance and dist-tag inspection, GitHub prerelease inspection, and clean exact-version public-registry installation with PermissionTicket smoke results
- id: VER-POST-PUBLICATION-REVIEW
  proves: [CON-PARTIAL-FAILURE, CON-NO-SOURCE-CHANGE, CON-NO-CONSUMERS, CON-NO-STABLE-RELEASE, CON-RUNNERS-INERT]
  kind: human_review
  runner:
    type: manual
    reference: Separate release-maintainer review of every immutable identity, external result, recovery decision, excluded surface, and the proposed exact lifecycle close after publication evidence is complete
```

## Failure and recovery

- If the exact release-source SHA or any package, lock, preparation-contract, Action, or workflow invariant differs, stop before creating the tag and obtain new reviewed publication authority.
- If tag `v0.1.0-rc.17`, GitHub Release `v0.1.0-rc.17`, or npm version `@engineeringspec/cli@0.1.0-rc.17` exists unexpectedly before execution, stop without duplicating or repairing publication.
- If tag creation succeeds but npm publication fails, leave the immutable tag untouched. Do not move, delete, recreate, or repoint it; do not manually publish or modify repository files. Inspect the failure and obtain new reviewed authority if any correction is required.
- If npm publication succeeds but GitHub prerelease creation fails, do not republish npm or move the tag. Complete only the missing GitHub prerelease step while this exact approved authority remains valid.
- Never repair a partial release by moving immutable identities, duplicating publication, moving `latest`, creating stable `0.1.0`, changing consumers, or modifying source.

## Rollout

```engineering-rollout
strategy: manual
steps:
  - Independently review this proposed publication authority without performing external release operations.
  - Merge the proposed contract, then change only this exact revision from proposed to approved in a separate contract-only pull request and merge it.
  - Immediately before execution, re-verify release source adee67a580d2f1c681de8d362963a8b0783d2017 and every package, lock, preparation-contract, Action, workflow, npm, tag, GitHub Release, and dist-tag precondition.
  - Create and push annotated tag v0.1.0-rc.17 pointing exactly to release source adee67a580d2f1c681de8d362963a8b0783d2017.
  - Observe the trusted v-star-tag-triggered release workflow and require successful public npm publication to dist-tag next with provenance; do not manually duplicate publication.
  - Verify npm provenance, next equals 0.1.0-rc.17, and latest remains 0.1.0-rc.15.
  - Only after npm success, create GitHub Release v0.1.0-rc.17 as a prerelease using the reviewed RC17 release notes.
  - From a clean temporary directory, install exactly @engineeringspec/cli@0.1.0-rc.17 from the public registry and run the version and compact PermissionTicket smoke, including verbose compatibility.
  - Collect immutable publication evidence and obtain a separate post-publication release-maintainer review.
  - Close ES-RC17-PUBLICATION from approved to implemented in a later lifecycle-only pull request containing only the exact status transition; do not combine proposal, approval, publication execution, evidence review, or closure.
rollback:
  actions:
    - Leave any successfully created immutable tag or published npm artifact untouched while investigating failure.
    - Complete only a missing GitHub prerelease when npm publication and immutable tag already succeeded under this exact authority.
    - Obtain new reviewed authority before any repository correction, release-source change, replacement tag, or replacement release candidate.
  owner: EngineeringSpec maintainers
```

## Non-goals

Source, package, lock, workflow, schema, Action, consumer, dependency, guidance, test, feature, or release-note changes; npm `latest`; stable `0.1.0`; downstream upgrades; and any publication operation inside this proposal PR are outside this contract.
