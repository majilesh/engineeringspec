---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-rc17-release
title: Prepare the release-only RC17 PermissionTicket increment
status: approved
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
---

# Prepare the release-only RC17 PermissionTicket increment

Prepare `@engineeringspec/cli@0.1.0-rc.17` from the already-reviewed compact PermissionTicket implementation merged by PR #118 at trusted main `06134ef3a81a0df47504d6a0652d18c2cab1063e`. The implementation commit is `120e35ebcd18e93f8a7311e366b86c7aa1ef7d6e`; `ES-compact-agent-ticket` revision 2 is implemented. The inspected package and both lockfile root version fields remain `0.1.0-rc.16`.

This draft grants no implementation or publication authority. Independently review and merge the exact contract as approved before any dependent release preparation. RC17 packages the already-implemented compact PermissionTicket capabilities without expanding the product surface.

Following RC14 preparation and RC16 publication precedent, this contract covers repository preparation only. External publication needs a later separately reviewed trusted-base publication contract pinned to the exact reviewed RC17 release-source SHA, which does not exist yet. The intended tag and GitHub prerelease identity is `v0.1.0-rc.17`; this contract does not authorize creating it. Path routing does not itself enforce tags, registry operations, or GitHub Releases.

## Source intent

```engineering-source-refs
- id: SRC-COMPACT-MERGE
  type: other
  ref: 06134ef3a81a0df47504d6a0652d18c2cab1063e
  title: Trusted main containing merged PR 118 and the exact compact-ticket closure
- id: SRC-COMPACT-AUTHORITY
  type: document
  path: docs/engineering-specs/ES-compact-agent-ticket.engineering-spec.md
  title: Implemented revision 2 compact PermissionTicket authority
- id: SRC-COMPACT-RFC
  type: document
  path: rfcs/0012-compact-agent-ticket.md
  title: Already-merged compact projection and compatibility design
- id: SRC-RELEASE-PRECEDENT
  type: document
  path: docs/engineering-specs/ES-rc14-release.engineering-spec.md
  title: Repository release preparation separated from external publication
- id: SRC-PUBLICATION-PRECEDENT
  type: document
  path: docs/engineering-specs/ES-RC16-PUBLICATION.engineering-spec.md
  title: Exact-source tag-triggered trusted publication and evidence boundary
- id: SRC-PUBLISH-WORKFLOW
  type: document
  path: .github/workflows/release.yml
  title: Existing tag-triggered npm next publication with provenance
- id: SRC-CI
  type: document
  path: .github/workflows/ci.yml
  title: Repository-owned quality, package, example, and governance checks
- id: SRC-PACKAGE
  type: document
  path: package.json
  title: RC16 identity, existing package manifest and verification commands
- id: SRC-LOCK
  type: document
  path: package-lock.json
  title: Root version metadata and unchanged dependency graph
- id: SRC-NOTES
  type: document
  path: CHANGELOG.md
  title: Unreleased compact-ticket notes and immutable historical release notes
- id: SRC-PINS
  type: document
  path: docs/production-gate.md
  title: Independently versioned CLI and immutable reviewed Action runtime
- id: SRC-READINESS
  type: document
  path: test/unit/release-readiness.test.ts
  title: Existing hard-coded current package identity and historical-pin regressions
```

## Target surfaces

```engineering-targets
- id: TARGET-PACKAGE
  component: rc17-package-version-only
  paths:
    - package.json
    - package-lock.json
  change_policy: modify
- id: TARGET-NOTES
  component: rc17-release-notes
  paths:
    - CHANGELOG.md
  change_policy: modify
- id: TARGET-GUIDANCE
  component: exact-current-cli-version-and-publication-wording
  paths:
    - README.md
    - docs/agent-integration.md
    - docs/cli-reference.md
    - docs/first-change-tutorial.md
    - docs/getting-started.md
    - docs/lifecycle.md
    - docs/production-gate.md
    - docs/troubleshooting.md
    - docs/upgrading.md
    - skills/engineering-spec/SKILL.md
  change_policy: modify
- id: TARGET-SITE
  component: existing-quickstart-cli-version-only
  paths:
    - site/index.html
  change_policy: modify
- id: TARGET-IDENTITY-TESTS
  component: existing-current-release-identity-fixtures
  paths:
    - test/integration/cli.test.ts
    - test/unit/doctor.test.ts
    - test/unit/release-readiness.test.ts
  change_policy: modify
- id: TARGET-CONTRACT
  component: rc17-preparation-lifecycle
  paths:
    - docs/engineering-specs/ES-rc17-release.engineering-spec.md
  change_policy: modify
```

The 18 exact paths above are requested future writable surfaces, not edits made by this proposal. The three test files hard-code current CLI identity; they require narrow fixture/assertion alignment with the package bump, not feature implementation. Current docs, the packaged skill, and the site quickstart contain exact CLI pins or unreleased compact-ticket wording. No source, Action-pin, workflow, schema, integration-adapter, catalogue-generation, or broad directory target is needed.

## Decisions

```engineering-decisions
- id: DEC-PREPARATION-THEN-PUBLICATION
  title: Separate mutable preparation from immutable-source publication
  rationale: RC16 publication authority named a fully reviewed existing source SHA. RC17 package metadata is not prepared yet, so this draft cannot name its final source and must not grant open-ended permission to publish a future main tip.
- id: DEC-KEEP-ACTION-ANCHOR
  title: Retain the independently reviewed RC16 Action runtime
  rationale: Compact next and work projections do not change Action-exercised routing or finish semantics. CLI and Action identities are independent; the existing full SHA ddf813e4e69d9b2f9a9eb3f0f241747746021cf3 remains pinned, and no new anchor or pin-alignment commit is required for this release-only increment.
- id: DEC-NO-GENERATED-SCHEMA-CHANGES
  title: Keep format assets and release machinery immutable
  rationale: The npm workflow publishes existing manifest assets and the Pages workflow copies existing format 0.1 schemas; neither requires source schema changes, a new format version, or catalogue regeneration for the RC17 package bump.
```

## Constraints

```engineering-constraints
- id: CON-GRANT-BEFORE-SPEND
  level: must
  statement: Begin dependent preparation only after this exact contract is approved on trusted main, next grants implementation permission, and work loads that approved base revision and digest; draft or workspace authority cannot authorize its own implementation.
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-VERSION
  level: must
  statement: Set package.json version, package-lock.json top-level version, and packages[empty-string].version to exactly 0.1.0-rc.17; preserve the package name, dependencies, resolutions, integrity values, manifest, scripts, engines, and all other package and lock semantics. The eventual external release identity is v0.1.0-rc.17, subject to separate publication approval.
  applies_to: [TARGET-PACKAGE]
  enforcement: { kind: test, verifier_ref: VER-IDENTITY }
- id: CON-EXISTING-IMPLEMENTATION
  level: must
  statement: Retain the complete already-reviewed compact default next and work JSON, exact currentChangeClassification vocabulary, executable blocked recovery, full --verbose payload and exit compatibility, stale-governance regression, RFC 0012, and aligned agent guidance; classification remains observed diff information, not authority or a forecast.
  enforcement: { kind: test, verifier_ref: VER-PACKAGED-TICKETS }
- id: CON-RELEASE-ONLY
  level: must_not
  statement: Do not change src, runtime or CLI behavior, routing, authorization, next/work/finish semantics, Action behavior, schemas, format 0.1, RFCs, conformance fixtures, dependencies, release machinery, or unrelated files. Do not add refactors, cleanup, commands, Context Plane, ContextEnvelope, Context Providers or Graph, architecture/ownership/dependency context, MCP, ACP runtime integration, hosted services, telemetry, or format 0.2. If verification reveals a required change outside this release-only scope, stop for separately reviewed corrective authority.
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-IDENTITY-FIXTURES
  level: must
  statement: Limit the three authorized test-file edits to current release identity literals, labels, and exact-version fixture/assertion alignment. Preserve test behavior, negative cases, current Action SHA expectations, and historical identities; do not delete or weaken checks to make a version change pass.
  applies_to: [TARGET-IDENTITY-TESTS]
  enforcement: { kind: test, verifier_ref: VER-IDENTITY }
- id: CON-CURRENT-GUIDANCE
  level: must
  statement: Limit current guidance and the site quickstart to RC17 CLI identity, compact-ticket availability and --verbose migration wording, and publication-state distinctions. Before publication describe RC17 as a prepared candidate, not an available registry artifact; keep any runnable published-package fallback explicitly identified as RC16 without implying it has compact tickets. Preserve lifecycle instructions, trust boundaries, layouts, and all historical facts; do not perform a repository-wide version replacement.
  applies_to: [TARGET-GUIDANCE, TARGET-SITE]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-ACTION-PIN
  level: must
  statement: Preserve CURRENT_ACTION_SHA and every current Action reference at ddf813e4e69d9b2f9a9eb3f0f241747746021cf3. Do not repin to RC17 merely for package-version symmetry, relabel that SHA as an RC17 CLI runtime, use mutable pins, or change action.yml, adoption generators, CI, or publishing workflows. Verify the existing immutable Action can evaluate the release diff and exact closure; failure requires new reviewed authority, not a workaround.
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-NOTES
  level: must
  statement: Prepare an RC17 CHANGELOG section from reviewed Unreleased content, with an accurate preparation date and explicit pre-publication state. Describe the compact agent-facing authority envelope, reduced parsing and ceremony as design changes, executable recovery, verbose compatibility, RFC 0012, aligned guidance, and the stale-governance regression; preserve earlier release sections and make no measured productivity, time, token, correctness, or adoption improvement claims without retained supporting evidence.
  applies_to: [TARGET-NOTES]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-TRUSTED-CHECKS
  level: must
  statement: Before preparation review, run separately trusted npm ci, npm run lint, npm run typecheck, npm test, npm run test:conformance, npm run build, npm run package:check, git diff --check, strict validation of docs/engineering-specs, and complete-working-state check against the approved trusted base. Retain existing CI Node 20/22 quality, demo, example-validation, audit, and governance requirements. Report actual results without inferring that declared runners executed.
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-PACKAGED-DOGFOOD
  level: must
  statement: Pack the candidate using the unchanged package manifest, install that exact tarball in a clean temporary directory outside the evaluated worktree, and invoke its installed bin rather than the source-tree dist CLI. Verify version 0.1.0-rc.17 and strict validation; in a disposable Git fixture with an independently committed approved base contract, verify next permission implementation with classification none and work ready with exact base/revision/digest, paths, constraints, verifier identities and stopWhen. Check compact default JSON against the existing status/prepare projections, --verbose full fields/nesting/values and exit behavior including a blocked case, executable routing recovery, and the authorized all-spec diff retaining contract_only and unchanged governance-only finish behavior. Do not use the closed production compact-ticket contract as artificial current authority. Retain smoke evidence outside the evaluated worktree and repeat this smoke against the exact registry package under later publication authority.
  enforcement: { kind: test, verifier_ref: VER-PACKAGED-TICKETS }
- id: CON-PUBLICATION-BOUNDARY
  level: must_not
  statement: This preparation contract must not create or push tags, publish npm, move dist-tags, create GitHub Releases, add credentials, change environments or workflow permissions, introduce alternate publishing mechanisms, or mutate consumers. After preparation review and merge, obtain separate approved publication authority naming the exact release-source SHA and v0.1.0-rc.17 before any external release operation.
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-TRUSTED-PUBLISHING-HANDOFF
  level: must
  statement: The later publication authority must preserve the existing v-tag-triggered release.yml boundary, tag/package agreement check, npm environment and trusted publishing, public access, next prerelease channel and provenance; prohibit duplicate manual npm publish and stable/latest promotion. Bind the tag to the reviewed exact RC17 source, preserve the pre-publication observed latest value, verify package/tag/release absence before execution, require the GitHub prerelease only after npm succeeds, verify provenance and clean exact-version registry installation, and prohibit moving or recreating immutable tags or artifacts after partial failure. Do not treat this handoff requirement as publication permission.
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-EXACT-CLOSE
  level: must
  statement: After preparation checks and review, use finish to close only this spent contract from approved to implemented with every other semantic field, revision, source reference, and prose byte unchanged; require ready and implementation_with_monotonic_close for the complete release-preparation diff. Closure records repository preparation only, not external publication. Leave ES-precode-brief-evidence-pilot proposed and preserve all other historical contracts and retained evidence.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-RUNNERS-INERT
  level: must_not
  statement: Parsing, validation, coverage, inspection, and routing must not execute specification-declared runners or obtain publication credentials; verification references are inert descriptions and evidence states must distinguish separately executed checks from unsupplied receipt evidence.
  enforcement: { kind: review, reviewer_role: maintainer }
```

## Verification

```engineering-verification
- id: VER-IDENTITY
  proves: [CON-VERSION, CON-IDENTITY-FIXTURES]
  kind: test
  runner:
    type: reference
    reference: Existing repository release-readiness, CLI integration and doctor tests plus exact package/root-lock identity and dependency-graph diff review
- id: VER-PACKAGED-TICKETS
  proves: [CON-EXISTING-IMPLEMENTATION, CON-PACKAGED-DOGFOOD]
  kind: test
  runner:
    type: reference
    reference: Repository-owned compact-ticket and stale-governance regressions plus clean candidate-tarball installed-bin smoke, using disposable approved-base Git fixtures and retained external evidence; repeat on the exact registry version only after separately authorized publication
- id: VER-QUALITY
  proves: [CON-TRUSTED-CHECKS, CON-RUNNERS-INERT]
  kind: static_analysis
  runner:
    type: reference
    reference: Separately trusted repository and CI commands listed in CON-TRUSTED-CHECKS, package-content manifest audit, strict validation, complete-state routing and read-only verifier review
- id: VER-RELEASE-REVIEW
  proves: [CON-GRANT-BEFORE-SPEND, CON-RELEASE-ONLY, CON-CURRENT-GUIDANCE, CON-ACTION-PIN, CON-NOTES, CON-PUBLICATION-BOUNDARY, CON-TRUSTED-PUBLISHING-HANDOFF, CON-EXACT-CLOSE]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer review of exact approved base, all 18 requested surfaces, release-only diff, unchanged Action and workflow boundaries, truthful publication wording, historical preservation, no unsupported metrics, exact close, and separate immutable-source publication handoff
```

## Rollout

```engineering-rollout
strategy: manual
steps:
  - Review this draft as a contract-only governance proposal; no release preparation or publication is performed.
  - Merge the independently reviewed exact release-preparation contract as approved before spending its authority.
  - Start from updated trusted main, run next, and load work ES-rc17-release; stop unless the approved authority is available and matches the intended revision and digest.
  - Prepare only the exact package/root-lock identity, release notes, necessary current guidance and site-version wording, and existing identity-test updates; retain the current immutable Action SHA.
  - Run trusted checks and clean candidate-tarball PermissionTicket dogfood, keeping evidence outside the evaluated worktree and stopping on any need for source or wider authority changes.
  - Obtain release-preparation review, write only the exact permitted lifecycle close, reverify implementation_with_monotonic_close, and submit the preparation change for human review and merge.
  - Record the reviewed merged RC17 release-source full SHA and stop; propose and merge separate publication authority binding that SHA, the exact version and tag, and the unchanged trusted publishing boundary.
  - Only under that later authority may publication occur, followed by exact registry-package dogfood; any publication-state guidance correction needs its own reviewed authority.
rollback:
  actions:
    - Stop preparation if version identity, packaging, compact behavior, governance, or immutable Action verification fails; do not widen scope from the same workspace.
    - Leave RC16 artifacts, immutable Action pins, tags, dist-tags, consumers, and historical evidence untouched.
    - Use separately reviewed corrective authority for any necessary repository repair; never repair a release by overwriting immutable publication identities.
  owner: EngineeringSpec maintainers
```

## Non-goals

This draft neither implements release preparation nor grants present authority. New product features, pilot or benchmark work, test-reliability fixes, source refactors or cleanup, format/schema changes, routing or finish changes, Context Plane work, MCP, ACP changes, hosted services, telemetry, new dependencies, Action repinning, workflow changes, generated catalogues, approval, commits, tags, npm publication, GitHub Releases, stable promotion, and consumer upgrades are outside this proposal. The future approved preparation authority remains limited to the enumerated release-only repository surfaces; external publication remains a separate gate.
