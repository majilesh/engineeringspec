---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-rc19-release
title: Prepare and publish 0.1.0-rc.19 with the Visual Verification Brief runtime
status: proposed
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
---

# Prepare and publish 0.1.0-rc.19 with the Visual Verification Brief runtime

Release the implemented Visual Verification Brief work (`ES-visual-verification-brief`) as `@engineeringspec/cli@0.1.0-rc.19` and bring npm up to date. The release ships the Visual Verification Brief and merged brace-expansion security remediation, updates current version and immutable Action guidance, and publishes through the existing tag-triggered trusted workflow. It preserves the release-candidate maturity and existing review enforcement behavior.

Once approved on the trusted base, this contract authorizes preparation and publication. Publication is still gated behind the merged, reviewed preparation change, and the tag must name that exact commit.

This contract is `proposed`. It grants nothing until a separate contract-only change approves it. That change may merge only after `ES-visual-verification-brief` is `implemented` on the trusted base, because both contracts claim release-guidance files.

## Source intent

```engineering-source-refs
- id: SRC-VISUAL-BRIEF
  type: document
  ref: rfcs/0015-visual-verification-brief.md
  title: Accepted RFC 0015 Visual Verification Brief design
- id: SRC-IMPLEMENTATION
  type: document
  ref: docs/engineering-specs/ES-visual-verification-brief.engineering-spec.md
  title: Implemented Visual Verification Brief authority whose work this release ships
- id: SRC-RC17
  type: document
  ref: docs/engineering-specs/ES-rc18-release.engineering-spec.md
  title: Previous release preparation precedent
- id: SRC-RC17-PUBLICATION
  type: document
  ref: docs/engineering-specs/ES-RC17-PUBLICATION.engineering-spec.md
  title: Previous publication precedent (tag binding, provenance, partial-failure rules)
```

## Target surfaces

```engineering-targets
- id: TARGET-PACKAGE
  component: rc19-version-metadata
  paths:
    - package.json
    - package-lock.json
  change_policy: modify
- id: TARGET-NOTES
  component: rc19-release-notes
  paths:
    - CHANGELOG.md
  change_policy: modify
- id: TARGET-GUIDANCE
  component: current-version-and-action-pin-guidance
  paths:
    - README.md
    - docs/agent-integration.md
    - docs/cli-reference.md
    - docs/first-change-tutorial.md
    - docs/getting-started.md
    - docs/lifecycle.md
    - docs/maintaining-specs.md
    - docs/production-gate.md
    - docs/troubleshooting.md
    - docs/upgrading.md
    - skills/engineering-spec/SKILL.md
    - site/index.html
    - SPEC.md
    - integrations/claude/README.md
    - integrations/codex/README.md
    - integrations/cursor/README.md
  change_policy: modify
- id: TARGET-ACTION-PIN
  component: generated-action-runtime-pin
  paths:
    - src/adoption/releases.ts
    - action/cli.mjs
  change_policy: modify
- id: TARGET-IDENTITY-TESTS
  component: current-release-identity-fixtures
  paths:
    - test/integration/cli.test.ts
    - test/unit/doctor.test.ts
    - test/unit/release-readiness.test.ts
  change_policy: modify
- id: TARGET-CONTRACT
  component: rc19-release-lifecycle
  paths:
    - docs/engineering-specs/ES-rc19-release.engineering-spec.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-SEQUENCING
  level: must
  statement: Approve this contract only after ES-visual-verification-brief is implemented on the trusted base, and prepare the release in a single implementation change against that base before any tag or publication.
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-VERSION
  level: must
  statement: Set the package version to exactly 0.1.0-rc.19 in package.json and package-lock.json, and rebuild action/cli.mjs so its pinned version matches; change no package name, bin, exports, files list, engines, or license.
  applies_to: [TARGET-PACKAGE, TARGET-ACTION-PIN]
  enforcement: { kind: test, verifier_ref: VER-IDENTITY }
- id: CON-SECURITY-LOCKFILE
  level: must
  statement: Preserve the merged brace-expansion fixes and all dependency ranges; package-lock changes are limited to root version metadata. npm audit --audit-level=high must pass. Record remaining moderate findings without claiming they are resolved.
  applies_to: [TARGET-PACKAGE]
  enforcement: { kind: test, verifier_ref: VER-TRUSTED-CHECKS }
- id: CON-ACTION-PIN
  level: must
  statement: Re-pin CURRENT_ACTION_SHA and every current Action reference in guidance to the full SHA of the trusted-base commit that merged the Visual Verification Brief implementation, after verifying that commit contains action/cli.mjs, passes check:action, and runs without installing dependencies. Never use a mutable ref.
  applies_to: [TARGET-ACTION-PIN, TARGET-GUIDANCE]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-GUIDANCE
  level: must
  statement: Update current-version guidance and runnable examples from 0.1.0-rc.18 to 0.1.0-rc.19, remove the unreleased markers for Visual Verification Brief features that this release ships, and keep historical and pilot references to earlier versions unchanged.
  applies_to: [TARGET-GUIDANCE, TARGET-IDENTITY-TESTS]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-NOTES
  level: must
  statement: Move the Unreleased Visual Verification Brief and brace-expansion entries into a 0.1.0-rc.19 CHANGELOG section with the release date, list the security lockfile fixes, and make no measured productivity, correctness or adoption claims. Describe evidence as supplied assertions and explicitly state that the existing change digest binds paths and change kinds rather than implementation bytes; do not imply Karpathy endorsement.
  applies_to: [TARGET-NOTES]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-DIST-TAGS
  level: must
  statement: Keep the v-tag-triggered release.yml, tag/package version check, npm environment, trusted publishing, public access and provenance. Release candidates still publish to next; after a successful publish, retain the existing step that moves latest to the same exact version using the existing NPM_TOKEN secret and fails loudly if it cannot. Do not add other credentials, change permissions, or publish manually.
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-TRUSTED-CHECKS
  level: must
  statement: Before merging the preparation change, run npm ci, lint, typecheck, npm test, test:conformance, build, package:check, check:action, npm audit --audit-level=high, strict validation of docs/engineering-specs, and the complete-working-state check against the approved trusted base; report actual results.
  enforcement: { kind: test, verifier_ref: VER-TRUSTED-CHECKS }
- id: CON-PACKAGED-SMOKE
  level: must
  statement: Pack the prepared package, install the exact tarball in a clean directory outside the worktree, and verify the installed bin reports 0.1.0-rc.19, validates strictly, and routes a disposable standard-mode fixture (exempt path passes, uncovered path fails, advisory passes without authority) without executing declared runners.
  enforcement: { kind: test, verifier_ref: VER-PACKAGED-SMOKE }
- id: CON-PUBLICATION
  level: must
  statement: After the preparation change is merged, create the annotated tag v0.1.0-rc.19 on that exact merge commit and push only that tag; let release.yml publish. Verify from the public registry in a clean directory that 0.1.0-rc.19 installs and reports its version, that next and latest both resolve to 0.1.0-rc.19, and that provenance is present; then create the GitHub prerelease v0.1.0-rc.19 from the reviewed notes. Publication is authorized only after the preparation PR passes checks and is reviewed and merged; do not publish a workspace-only build.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-PARTIAL-FAILURE
  level: must_not
  statement: After any partial failure, do not move, delete or recreate the tag, publish the same version twice, or change release identities; complete only an independently missing dist-tag or GitHub prerelease step, or stop and obtain new reviewed authority.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-NO-FEATURE-CHANGE
  level: must_not
  statement: Change no runtime behavior, format semantics, schemas, routing, CLI options, tests other than release-identity fixtures, conformance fixtures, or measurement code.
  enforcement: { kind: test, verifier_ref: VER-TRUSTED-CHECKS }
- id: CON-EXACT-CLOSE
  level: must
  statement: After publication is verified, close only this contract from approved to implemented in a lifecycle-only change with every other byte unchanged.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: maintainer }
```

## Verification

```engineering-verification
- id: VER-IDENTITY
  proves: [CON-VERSION]
  kind: test
  runner:
    type: reference
    reference: Release-identity tests assert 0.1.0-rc.19 across package metadata, guidance and the bundled Action CLI version output
- id: VER-TRUSTED-CHECKS
  proves: [CON-SECURITY-LOCKFILE, CON-TRUSTED-CHECKS, CON-NO-FEATURE-CHANGE]
  kind: test
  runner:
    type: reference
    reference: npm ci, lint, typecheck, test, test:conformance, build, package:check, check:action, npm audit --audit-level=high, validate --strict and check --spec-dir docs/engineering-specs --base origin/main --strict all pass
- id: VER-PACKAGED-SMOKE
  proves: [CON-PACKAGED-SMOKE]
  kind: test
  runner:
    type: reference
    reference: npm pack, clean-directory tarball install, and installed-bin smoke against a disposable standard-mode fixture
- id: VER-RELEASE-REVIEW
  proves: [CON-SEQUENCING, CON-ACTION-PIN, CON-GUIDANCE, CON-NOTES, CON-DIST-TAGS, CON-PUBLICATION, CON-PARTIAL-FAILURE, CON-EXACT-CLOSE]
  kind: human_review
  runner:
    type: manual
    reference: Release maintainer reviews the preparation diff, the Action anchor SHA, unchanged release workflow, registry evidence and exact closure
```

## Rollout

```engineering-rollout
strategy: manual
steps:
  - Merge this proposal as a contract-only change; it grants no authority.
  - After ES-visual-verification-brief is implemented on main, approve this contract in a separate contract-only change.
  - Prepare the release in one implementation change (version metadata, Action re-pin, guidance and notes) and merge it after trusted checks and the packaged smoke.
  - Tag the exact merge commit v0.1.0-rc.19 and push the tag; verify registry installation, dist-tags and provenance; create the GitHub prerelease.
  - Close this contract in a lifecycle-only change.
rollback:
  actions:
    - Before tagging, revert the preparation change; nothing external has happened.
    - After publication, never unpublish or retag; fix forward with a later release candidate under new reviewed authority, and move dist-tags back to 0.1.0-rc.18 only with explicit maintainer approval.
  owner: EngineeringSpec maintainers
```
