---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-rc18-release
title: Prepare and publish 0.1.0-rc.18 with the RFC 0014 runtime
status: approved
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
---

# Prepare and publish 0.1.0-rc.18 with the RFC 0014 runtime

Release the implemented RFC 0014 work (`ES-routing-v2-adoption-modes`) as `@engineeringspec/cli@0.1.0-rc.18` and bring npm up to date. The release does four things:

- It fixes the high-severity `npm audit` advisories with lockfile-only updates.
- It re-pins the generated GitHub Action to the reviewed commit that contains the bundled RFC 0014 runtime, so adopters actually receive it.
- It updates version guidance.
- It publishes through the existing trusted-publishing workflow, then moves both the `next` and `latest` dist-tags to rc.18.

Unlike RC17, which used separate preparation and publication contracts, this one contract authorizes both. Publication is still gated behind the merged, reviewed preparation change, and the tag must name that exact commit.

This contract is `proposed`. It grants nothing until a separate contract-only change approves it. That change may merge only after `ES-routing-v2-adoption-modes` is `implemented` on the trusted base, because both contracts claim release-guidance files.

## Source intent

```engineering-source-refs
- id: SRC-RFC0014
  type: document
  ref: rfcs/0014-routing-v2-adoption-modes.md
  title: Accepted RFC 0014 and its recorded clarifications C1-C26
- id: SRC-IMPLEMENTATION
  type: document
  ref: docs/engineering-specs/ES-routing-v2-adoption-modes.engineering-spec.md
  title: Implemented RFC 0014 authority whose work this release ships
- id: SRC-RC17
  type: document
  ref: docs/engineering-specs/ES-rc17-release.engineering-spec.md
  title: Previous release preparation precedent
- id: SRC-RC17-PUBLICATION
  type: document
  ref: docs/engineering-specs/ES-RC17-PUBLICATION.engineering-spec.md
  title: Previous publication precedent (tag binding, provenance, partial-failure rules)
- id: SRC-AUDIT
  type: security_finding
  ref: npm-audit-2026-09-25
  title: High-severity fast-uri (runtime, via ajv) and js-yaml (development, via eslint) advisories failing CI audit
- id: SRC-NPM-STATE
  type: other
  ref: npm-dist-tags-2026-09-25
  title: Observed npm dist-tags before this release - latest 0.1.0-rc.15, next 0.1.0-rc.17
```

## Target surfaces

```engineering-targets
- id: TARGET-PACKAGE
  component: rc18-version-and-security-lockfile
  paths:
    - package.json
    - package-lock.json
  change_policy: modify
- id: TARGET-NOTES
  component: rc18-release-notes
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
- id: TARGET-RELEASE-WORKFLOW
  component: npm-dist-tag-promotion
  paths:
    - .github/workflows/release.yml
  change_policy: modify
- id: TARGET-IDENTITY-TESTS
  component: current-release-identity-fixtures
  paths:
    - test/integration/cli.test.ts
    - test/unit/doctor.test.ts
    - test/unit/release-readiness.test.ts
  change_policy: modify
- id: TARGET-CONTRACT
  component: rc18-release-lifecycle
  paths:
    - docs/engineering-specs/ES-rc18-release.engineering-spec.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-SEQUENCING
  level: must
  statement: Approve this contract only after ES-routing-v2-adoption-modes is implemented on the trusted base, and prepare the release in a single implementation change against that base before any tag or publication.
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-VERSION
  level: must
  statement: Set the package version to exactly 0.1.0-rc.18 in package.json and package-lock.json, and rebuild action/cli.mjs so its pinned version matches; change no package name, bin, exports, files list, engines, or license.
  applies_to: [TARGET-PACKAGE, TARGET-ACTION-PIN]
  enforcement: { kind: test, verifier_ref: VER-IDENTITY }
- id: CON-SECURITY-LOCKFILE
  level: must
  statement: Resolve the fast-uri and js-yaml high-severity advisories with lockfile-only updates inside existing semver ranges (npm audit fix without --force) so that npm audit --audit-level=high passes; do not add dependencies, change package.json dependency ranges, or take major-version upgrades. The moderate vitest advisory that needs a breaking upgrade stays out of scope and is recorded in the release notes.
  applies_to: [TARGET-PACKAGE]
  enforcement: { kind: test, verifier_ref: VER-TRUSTED-CHECKS }
- id: CON-ACTION-PIN
  level: must
  statement: Re-pin CURRENT_ACTION_SHA and every current Action reference in guidance to the full SHA of the trusted-base commit that merged the RFC 0014 phase 7 change, after verifying that commit contains action/cli.mjs, passes check:action, and runs without installing dependencies. Never use a mutable ref.
  applies_to: [TARGET-ACTION-PIN, TARGET-GUIDANCE]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-GUIDANCE
  level: must
  statement: Update current-version guidance and runnable examples from 0.1.0-rc.17 to 0.1.0-rc.18, remove the unreleased markers for RFC 0014 features that this release ships, and keep historical and pilot references to earlier versions unchanged.
  applies_to: [TARGET-GUIDANCE, TARGET-IDENTITY-TESTS]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-NOTES
  level: must
  statement: Move the Unreleased RFC 0014 entries into a 0.1.0-rc.18 CHANGELOG section with the release date, list the security lockfile fixes, and make no measured productivity, correctness or adoption claims.
  applies_to: [TARGET-NOTES]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-DIST-TAGS
  level: must
  statement: Keep the v-tag-triggered release.yml, tag/package version check, npm environment, trusted publishing, public access and provenance. Release candidates still publish to next; after a successful publish, add one step that moves latest to the same exact version using the existing NPM_TOKEN secret and fails loudly if it cannot. Do not add other credentials, change permissions, or publish manually.
  applies_to: [TARGET-RELEASE-WORKFLOW]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-TRUSTED-CHECKS
  level: must
  statement: Before merging the preparation change, run npm ci, lint, typecheck, npm test, test:conformance, build, package:check, check:action, npm audit --audit-level=high, strict validation of docs/engineering-specs, and the complete-working-state check against the approved trusted base; report actual results.
  enforcement: { kind: test, verifier_ref: VER-TRUSTED-CHECKS }
- id: CON-PACKAGED-SMOKE
  level: must
  statement: Pack the prepared package, install the exact tarball in a clean directory outside the worktree, and verify the installed bin reports 0.1.0-rc.18, validates strictly, and routes a disposable standard-mode fixture (exempt path passes, uncovered path fails, advisory passes without authority) without executing declared runners.
  enforcement: { kind: test, verifier_ref: VER-PACKAGED-SMOKE }
- id: CON-PUBLICATION
  level: must
  statement: After the preparation change is merged, create the annotated tag v0.1.0-rc.18 on that exact merge commit and push only that tag; let release.yml publish. Verify from the public registry in a clean directory that 0.1.0-rc.18 installs and reports its version, that next and latest both resolve to 0.1.0-rc.18, and that provenance is present; then create the GitHub prerelease v0.1.0-rc.18 from the reviewed notes.
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
    reference: Release-identity tests assert 0.1.0-rc.18 across package metadata, guidance and the bundled Action CLI version output
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
    reference: Release maintainer reviews the preparation diff, the Action anchor SHA, workflow change, registry evidence and exact closure
```

## Rollout

```engineering-rollout
strategy: manual
steps:
  - Merge this proposal as a contract-only change; it grants no authority.
  - After ES-routing-v2-adoption-modes is implemented on main, approve this contract in a separate contract-only change.
  - Prepare the release in one implementation change (version, security lockfile, Action re-pin, guidance, notes, workflow) and merge it after trusted checks and the packaged smoke.
  - Tag the exact merge commit v0.1.0-rc.18 and push the tag; verify registry installation, dist-tags and provenance; create the GitHub prerelease.
  - Close this contract in a lifecycle-only change.
rollback:
  actions:
    - Before tagging, revert the preparation change; nothing external has happened.
    - After publication, never unpublish or retag; fix forward with 0.1.0-rc.19 under new reviewed authority, and move dist-tags back to 0.1.0-rc.17 only with explicit maintainer approval.
  owner: EngineeringSpec maintainers
```
