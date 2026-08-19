---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 2
id: ES-rc15-finish-productspec-base-isolation
title: Fix finish ProductSpec base isolation for RC15
status: implemented
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
---

# Fix finish ProductSpec base isolation for RC15

Correct the released RC14 closure defect where `finish --write-closure` rereads an approved trusted-base EngineeringSpec containing a repository-local ProductSpec reference with workspace-oriented profile resolution. Prepare the reviewed correction as `0.1.0-rc.15` without changing format 0.1, weakening ordinary ProductSpec validation, publishing artifacts, or allowing mutable workspace ProductSpec content to influence base authority.

This contract grants no implementation authority while `draft` or `proposed`.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: other
  ref: agent-control-plane-dogfood-finish-productspec-2026-08-19
  title: RC14 consumer reproduction of ESPR001 during finish closure
- id: SRC-2
  type: document
  ref: docs/engineering-specs/ES-rc14-maximum-safety-minimum-ceremony.engineering-spec.md
  title: Implemented finish and exact monotonic-close semantics
- id: SRC-3
  type: document
  ref: docs/engineering-specs/ES-rc13-recovery-release.engineering-spec.md
  title: Repository-root ProductSpec validation and prior corrective release convention
- id: SRC-4
  type: document
  ref: docs/engineering-specs/ES-rc14-release.engineering-spec.md
  title: Current non-self-referential release preparation and immutable Action pin convention
```

## Target surfaces

```engineering-targets
- id: TARGET-base-reads
  component: finish-and-review-trusted-base-validation
  paths:
    - src/cli/finish.ts
    - src/cli/review.ts
  change_policy: modify
- id: TARGET-regressions
  component: productspec-finish-and-closure-regressions
  paths:
    - test/integration/rc14.test.ts
    - test/integration/cli.test.ts
    - test/conformance/rc14.test.ts
    - test/unit/finish.test.ts
  change_policy: modify
- id: TARGET-package
  component: rc15-package-identity-and-release-note
  paths:
    - package.json
    - package-lock.json
    - CHANGELOG.md
  change_policy: modify
- id: TARGET-release-tests
  component: minimal-rc15-version-regressions
  paths:
    - test/unit/doctor.test.ts
    - test/unit/release-readiness.test.ts
    - test/unit/version.test.ts
  change_policy: modify
- id: TARGET-contract
  component: rc15-correction-lifecycle
  paths:
    - docs/engineering-specs/ES-rc15-finish-productspec-base-isolation.engineering-spec.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-BASE-ISOLATION
  level: must
  statement: Every EngineeringSpec blob reread from the selected trusted Git base by the finish path for routing, review projection, revision, or semantic digest must use base-authority validation semantics that preserve structural and EngineeringSpec semantic validation while disabling mutable-filesystem ProductSpec resolution unless a future resolver reads the ProductSpec from the exact same trusted Git commit.
  applies_to: [TARGET-base-reads, TARGET-regressions]
  enforcement: { kind: test, verifier_ref: VER-REGRESSION }
- id: CON-FINISH-SUCCESS
  level: must
  statement: With strict trusted configuration, a valid implementation authorized by an approved base contract that declares the productspec profile and a repository-local ProductSpec source must complete finish --write-closure successfully.
  applies_to: [TARGET-base-reads, TARGET-regressions]
  enforcement: { kind: test, verifier_ref: VER-REGRESSION }
- id: CON-EXACT-CLOSE
  level: must
  statement: Successful closure must change only metadata.status from approved to implemented, preserve spec_revision and normalized semantic authority, evaluate the complete implementation working state, and continue to reject unsafe mixed closes and unrelated or uncovered changes.
  applies_to: [TARGET-base-reads, TARGET-regressions]
  enforcement: { kind: test, verifier_ref: VER-REGRESSION }
- id: CON-FAIL-CLOSED
  level: must
  statement: Malformed EngineeringSpecs and missing, invalid, ambiguous, or non-approved trusted-base contracts must continue to fail closed; structural validation, EngineeringSpec semantic validation, lifecycle checks, complete-change routing, and mixed-close validation must remain enabled.
  applies_to: [TARGET-base-reads, TARGET-regressions]
  enforcement: { kind: test, verifier_ref: VER-REGRESSION }
- id: CON-WORKSPACE-INERT
  level: must
  statement: Creating, changing, deleting, corrupting, or redirecting a workspace or head ProductSpec must not influence the trusted-base contract digest, metadata, authority, routing decision, or closure safety, and no trusted-base read may resolve a local ProductSpec against the feature-branch filesystem.
  applies_to: [TARGET-base-reads, TARGET-regressions]
  enforcement: { kind: test, verifier_ref: VER-REGRESSION }
- id: CON-ORDINARY-PROFILES
  level: must
  statement: Ordinary repository validation with an explicit repository root must continue to resolve and validate local ProductSpec references normally, including revision, digest, item, missing-file, and real-path confinement checks; ProductSpec and external-profile errors must not become globally ignorable.
  applies_to: [TARGET-regressions]
  enforcement: { kind: test, verifier_ref: VER-REGRESSION }
- id: CON-RUNNERS-INERT
  level: must_not
  statement: Finish, review, transition, validation, and regression tests must not execute or expose specification-declared runner argv, and the correction must not introduce trusted runner execution.
  applies_to: [TARGET-base-reads, TARGET-regressions]
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-OTHER-READS
  level: must
  statement: Review must report every other readGitBlob-to-validateMarkdown or validateBytes path that lacks either resolveProfiles false or a same-commit profile resolver. Equivalent paths outside the finish dependency must not be changed in this focused correction without separately approved authority.
  applies_to: [TARGET-base-reads]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-RC15-IDENTITY
  level: must
  statement: package.json, root package-lock metadata, compiled CLI output, minimal version assertions, and the new changelog entry must use exact version 0.1.0-rc.15 without rewriting historical release contracts, prior changelog sections, guidance, Action pins, site output, receipts, benchmark inputs, or retained evidence.
  applies_to: [TARGET-package, TARGET-release-tests]
  enforcement: { kind: test, verifier_ref: VER-RELEASE }
- id: CON-RELEASE-NOTE
  level: must
  statement: RC15 release notes must state that finish --write-closure now works for base-approved contracts containing local ProductSpec references, trusted-base isolation is preserved, workspace ProductSpec content cannot authorize or alter base authority, and no contract-format or schema change is introduced.
  applies_to: [TARGET-package]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-NO-PUBLISH
  level: must_not
  statement: This work must not publish npm, move a dist-tag, create or move a Git tag, create a GitHub release, merge the implementation pull request, update the Agent Control Plane repository, alter format 0.1 or schemas, change Action pins, guidance, site output, unrelated command implementations, weaken ProductSpec validation globally, execute specification runners, or trust workspace profile content as base authority.
  applies_to: [TARGET-base-reads, TARGET-regressions, TARGET-package, TARGET-release-tests]
  enforcement: { kind: review, reviewer_role: release-maintainer }
```

## Verification

```engineering-verification
- id: VER-REGRESSION
  proves: [CON-BASE-ISOLATION, CON-FINISH-SUCCESS, CON-EXACT-CLOSE, CON-FAIL-CLOSED, CON-WORKSPACE-INERT, CON-ORDINARY-PROFILES]
  kind: test
  runner:
    type: reference
    reference: Focused finish, review, transition, routing, and ProductSpec integration tests followed by npm test
- id: VER-CONFORMANCE
  proves: [CON-RUNNERS-INERT]
  kind: test
  runner:
    type: reference
    reference: npm run test:conformance; specification-declared runners remain inert
- id: VER-RELEASE
  proves: [CON-RC15-IDENTITY]
  kind: test
  runner:
    type: reference
    reference: npm ci, npm run lint, npm run typecheck, npm test, npm run test:conformance, npm run build, npm run package:check, focused regressions, and git diff --check
- id: VER-REVIEW
  proves: [CON-OTHER-READS, CON-RELEASE-NOTE, CON-NO-PUBLISH]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer security and release review of base-blob validation modes, minimal patch scope, RC15 notes, unchanged Action and documentation surfaces, and publication boundary
```

## Rollout

```engineering-rollout
strategy: manual
steps:
  - Review this draft and the strict-mode RC14 reproduction without editing runtime or release surfaces.
  - Change only this contract to approved and merge that contract-only authority before dependent implementation begins.
  - Load the merged base-pinned work brief, add the failing regression first, and confirm the compiled RC14 behavior fails for the intended reason.
  - Apply the smallest safe correction to finish and its selected-contract review dependency, then run the focused regression matrix and complete trusted suite.
  - Prepare the RC15 correction, minimal package identity, changelog entry, and exact contract closure without changing Action pins, broad guidance, or deterministic site output.
  - Push the dedicated implementation branch and open a draft pull request for maintainer review; do not merge or publish automatically.
rollback:
  actions:
    - Keep RC14 immutable and prepare a later corrective release candidate if RC15 review or verification fails.
    - Do not move, reuse, or overwrite a published package or tag.
    - Preserve ordinary explicit-root ProductSpec validation and trusted-base isolation if the finish projection is withdrawn.
  owner: EngineeringSpec maintainers
```

## Non-goals

A base-aware ProductSpec resolver, changes to agentCheck/context/explain/gate or other unrelated commands, Action-pin updates, broad guidance and site refreshes, format or schema changes, Agent Control Plane edits, npm publication, tagging, GitHub release creation, and automatic implementation merge remain outside this contract.
