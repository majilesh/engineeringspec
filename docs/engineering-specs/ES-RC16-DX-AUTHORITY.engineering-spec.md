---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 2
id: ES-RC16-DX-AUTHORITY
title: Add historical replay and trusted maintenance sequencing for RC16
status: implemented
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
---

# Add historical replay and trusted maintenance sequencing for RC16

Design and, only after separate approval, implement a read-only historical snapshot evaluator, a fail-closed path-scoped maintenance sequencing primitive, actionable conflict remediation, and a reproducible ceremony benchmark for `0.1.0-rc.16`. Preserve immutable trusted-base authority, deny-wins routing, the two-phase authority boundary, exact implementation-plus-close semantics, and inert specification runners.

This contract grants implementation authority only when this exact approved revision is present on the trusted base. A proposed amendment, including this revision while unmerged, grants no additional authority until independently reviewed and merged as a contract-only governance change.

## Source intent

```engineering-source-refs
- id: SRC-DOGFOOD
  type: other
  ref: agent-control-plane-dogfood-rc14-rc15-ceremony-2026-08-21
  title: Consumer evidence for trusted-base ProductSpec isolation, approved-authority overlap, and historical verification friction
- id: SRC-RC15
  type: document
  ref: docs/engineering-specs/ES-rc15-finish-productspec-base-isolation.engineering-spec.md
  title: Implemented RC15 trusted-base ProductSpec isolation contract
- id: SRC-RC14-RFC
  type: document
  ref: rfcs/0011-maximum-safety-minimum-ceremony.md
  title: Accepted immutable authority and implementation-plus-close design
- id: SRC-RC16-DESIGN
  type: document
  ref: rfcs/0013-rc16-historical-replay-maintenance-sequencing.md
  title: Proposed RC16 architecture and threat model
- id: SRC-DIAGNOSTICS
  type: document
  ref: docs/engineering-specs/ES-actionable-diagnostic-hints.engineering-spec.md
  title: Existing actionable diagnostic principles
```

## Target surfaces

```engineering-targets
- id: TARGET-REPLAY-NEW
  component: historical-snapshot-evaluation
  paths:
    - src/cli/replay.ts
    - src/replay/**
  change_policy: create
- id: TARGET-REPLAY-INTEGRATION
  component: snapshot-resolution-and-cli-integration
  paths:
    - src/cli/program.ts
    - src/config/repositoryConfig.ts
    - src/gate/loadSpec.ts
    - src/index.ts
    - src/profiles/productspec/resolve.ts
    - src/profiles/productspec/validate.ts
    - src/validator/validateFile.ts
    - src/validator/validateProfiles.ts
  change_policy: modify
- id: TARGET-SEQUENCING-MODEL
  component: additive-authority-control-format
  paths:
    - schemas/engineering-spec-0.1.schema.json
    - src/model/constants.ts
    - src/model/types.ts
    - src/parser/parseMarkdown.ts
    - src/normalizer/digest.ts
    - src/normalizer/normalize.ts
    - src/validator/validateReferences.ts
    - src/validator/validateSemantics.ts
    - src/validator/validateStructure.ts
  change_policy: modify
- id: TARGET-SEQUENCING-ROUTING
  component: trusted-positive-claim-subtraction
  paths:
    - schemas/authority-diff-0.1.schema.json
    - src/authority/diff.ts
    - src/catalogue/catalogue.ts
    - src/cli/next.ts
    - src/cli/prepare.ts
    - src/cli/review.ts
    - src/cli/status.ts
    - src/diagnostics/codes.ts
    - src/routing/loadCandidates.ts
    - src/routing/route.ts
    - src/routing/select.ts
    - src/routing/types.ts
  change_policy: modify
- id: TARGET-REPLAY-SCHEMA
  component: historical-result-contract
  paths:
    - schemas/historical-snapshot-evaluation-0.1.schema.json
  change_policy: create
- id: TARGET-CEREMONY-NEW
  component: machine-readable-ceremony-benchmark
  paths:
    - benchmarks/ceremony.schema.json
    - benchmarks/ceremony-scenarios.json
  change_policy: create
- id: TARGET-CEREMONY-INTEGRATION
  component: ceremony-benchmark-cli
  paths:
    - src/cli/benchmark.ts
  change_policy: modify
- id: TARGET-NEW-TESTS
  component: rc16-new-regression-suites
  paths:
    - test/conformance/rc16.test.ts
    - test/integration/replay.test.ts
    - test/unit/replay.test.ts
    - conformance/authority-sequencing/**
    - conformance/historical-replay/**
  change_policy: create
- id: TARGET-EXISTING-TESTS
  component: routing-lifecycle-profile-and-dx-regressions
  paths:
    - conformance/expected-results/manifest.json
    - test/integration/cli.test.ts
    - test/integration/rc14.test.ts
    - test/integration/routing.test.ts
    - test/unit/authority-diff.test.ts
    - test/unit/benchmark.test.ts
    - test/unit/catalogue.test.ts
    - test/unit/config.test.ts
    - test/unit/diagnostic-codes.test.ts
    - test/unit/doctor.test.ts
    - test/unit/finish.test.ts
    - test/unit/prepare.test.ts
    - test/unit/release-readiness.test.ts
    - test/unit/review.test.ts
    - test/unit/routing.test.ts
    - test/unit/status.test.ts
    - test/unit/transition.test.ts
  change_policy: modify
- id: TARGET-DOCS
  component: rc16-user-guidance
  paths:
    - README.md
    - SPEC.md
    - docs/cli-reference.md
    - docs/lifecycle.md
    - docs/troubleshooting.md
  change_policy: modify
- id: TARGET-PACKAGE
  component: rc16-package-identity-and-notes
  paths:
    - CHANGELOG.md
    - package.json
    - package-lock.json
  change_policy: modify
- id: TARGET-CONTRACT
  component: rc16-authority-lifecycle
  paths:
    - docs/engineering-specs/ES-RC16-DX-AUTHORITY.engineering-spec.md
  change_policy: modify
- id: TARGET-DESIGN-READONLY
  component: reviewed-rc16-design
  paths:
    - rfcs/0013-rc16-historical-replay-maintenance-sequencing.md
  change_policy: read_only
```

## Constraints

```engineering-constraints
- id: CON-HISTORICAL-MODE
  level: must
  statement: Historical replay must be an explicit first-class read-only mode that records authority_mode historical_read_only and current_authority_granted false, accepts only immutable commit-based evaluation inputs and inert bounded change fixtures, and never grants current implementation authority.
  applies_to: [TARGET-REPLAY-NEW, TARGET-REPLAY-INTEGRATION, TARGET-REPLAY-SCHEMA, TARGET-NEW-TESTS, TARGET-EXISTING-TESTS]
  enforcement: { kind: test, verifier_ref: VER-REPLAY }
- id: CON-HISTORICAL-NO-WRITES
  level: must_not
  statement: Replay must not call lifecycle transition or closure writers, modify the evaluated repository, index, worktree, refs, configuration, or contracts, expose any write flag, accept staged or worktree state, or execute specification-declared runners or trusted verifier commands.
  applies_to: [TARGET-REPLAY-NEW, TARGET-REPLAY-INTEGRATION, TARGET-NEW-TESTS]
  enforcement: { kind: test, verifier_ref: VER-SECURITY }
- id: CON-SNAPSHOT-CLOSURE
  level: must
  statement: Repository configuration, EngineeringSpecs, ProductSpecs, and every repository-local reference used by historical evaluation must resolve from the same immutable snapshot reader and commit; absent or invalid snapshot content must fail closed without filesystem fallback.
  applies_to: [TARGET-REPLAY-NEW, TARGET-REPLAY-INTEGRATION, TARGET-NEW-TESTS, TARGET-EXISTING-TESTS]
  enforcement: { kind: test, verifier_ref: VER-REPLAY }
- id: CON-TRUSTED-BASE-SEPARATION
  level: must
  statement: The implementation must distinguish symbolic TrustedBaseRef from ResolvedTrustedBaseCommit and historical snapshot identity while preserving current command enforcement of configured trusted-base identity; replay must record but not impersonate the snapshot configuration's symbolic trustedBase value.
  applies_to: [TARGET-REPLAY-NEW, TARGET-REPLAY-INTEGRATION, TARGET-NEW-TESTS, TARGET-EXISTING-TESTS]
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-WORKSPACE-PROFILES
  level: must
  statement: Ordinary workspace and repository validation must continue resolving local ProductSpecs only with an explicit realpath-confined repository root, while workspace ProductSpec or config mutation cannot influence trusted-base or historical contract identity, digest, authority, routing, or readiness.
  applies_to: [TARGET-REPLAY-INTEGRATION, TARGET-NEW-TESTS, TARGET-EXISTING-TESTS]
  enforcement: { kind: test, verifier_ref: VER-REPLAY }
- id: CON-SEQUENCING-TRUST
  level: must
  statement: Maintenance sequencing may affect routing only when the controlling maintenance contract and every referenced contract are exact, unique, approved candidates loaded from the same trusted-base commit and every reference pins contract ID, spec revision, semantic digest, and exact safe repository-relative paths.
  applies_to: [TARGET-SEQUENCING-MODEL, TARGET-SEQUENCING-ROUTING, TARGET-NEW-TESTS, TARGET-EXISTING-TESTS]
  enforcement: { kind: test, verifier_ref: VER-SEQUENCING }
- id: CON-SEQUENCING-SUBTRACTIVE
  level: must
  statement: A valid maintenance control may subtract only the pinned contract's positive writable claim for an exact path also positively claimed by the controlling contract; it must never add a claim, authorize an uncovered path, suppress read_only or observe claims, suppress deny-wins behavior, use globs in RC16, or choose between remaining multiple claimants.
  applies_to: [TARGET-SEQUENCING-MODEL, TARGET-SEQUENCING-ROUTING, TARGET-NEW-TESTS, TARGET-EXISTING-TESTS]
  enforcement: { kind: test, verifier_ref: VER-SEQUENCING }
- id: CON-SEQUENCING-FAIL-CLOSED
  level: must
  statement: Missing, malformed, stale, broadened, inapplicable, duplicated, chained, cyclic, or competing maintenance controls and any revision, digest, status, path, or candidate mismatch must fail closed; unsequenced overlapping approved contracts must continue returning ESRT003.
  applies_to: [TARGET-SEQUENCING-MODEL, TARGET-SEQUENCING-ROUTING, TARGET-NEW-TESTS, TARGET-EXISTING-TESTS]
  enforcement: { kind: test, verifier_ref: VER-SECURITY }
- id: CON-NO-SELF-AUTHORIZATION
  level: must
  statement: A maintenance contract or authority control created, widened, approved, or edited only in mutable head or workspace content must not affect routing in that operation; proposing sequencing, independently approving it on trusted base, and spending it must remain separate security events unless the exact operation was already authorized by trusted policy.
  applies_to: [TARGET-SEQUENCING-ROUTING, TARGET-NEW-TESTS, TARGET-EXISTING-TESTS]
  enforcement: { kind: test, verifier_ref: VER-SECURITY }
- id: CON-NO-LIFECYCLE-STATE
  level: must
  statement: RC16 must not add a suspended lifecycle status or authority lease; existing lifecycle transitions retain their meaning, and exact approved-to-implemented closure of a maintenance controller must automatically remove its sequencing effect on the next trusted base without modifying or reapproving the referenced feature contract.
  applies_to: [TARGET-SEQUENCING-MODEL, TARGET-SEQUENCING-ROUTING, TARGET-EXISTING-TESTS, TARGET-DOCS]
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-MIXED-CLOSE
  level: must
  statement: Implementation plus close must remain valid only for the exact base-approved controller spent by routed implementation paths, with no semantic authority change beyond the allowed monotonic status close; unrelated, widened, or modified sequencing content beside implementation must fail.
  applies_to: [TARGET-SEQUENCING-ROUTING, TARGET-EXISTING-TESTS]
  enforcement: { kind: test, verifier_ref: VER-SEQUENCING }
- id: CON-AUDITABILITY
  level: must
  statement: Review, prepare, catalogue, routing, authority-diff, and replay results must identify applied and rejected sequencing by trusted base, controller, referenced contract, revision, semantic digest, exact path, remaining claims, and reason, while omitting runner argv and other executable payloads.
  applies_to: [TARGET-SEQUENCING-ROUTING, TARGET-REPLAY-SCHEMA, TARGET-NEW-TESTS, TARGET-EXISTING-TESTS]
  enforcement: { kind: test, verifier_ref: VER-SEQUENCING }
- id: CON-REMEDIATION
  level: must
  statement: ESRT003 must report exact overlapping paths and claimant identities and recommend only safe narrowing or independently approved sequencing; ESPR001 and trusted-base mismatch diagnostics must distinguish workspace, current-authority, and historical modes and may recommend replay without implying that replay grants authority.
  applies_to: [TARGET-SEQUENCING-ROUTING, TARGET-REPLAY-INTEGRATION, TARGET-EXISTING-TESTS, TARGET-DOCS]
  enforcement: { kind: test, verifier_ref: VER-DX }
- id: CON-PROGRESSIVE-DISCLOSURE
  level: must
  statement: next may expose stable recommendations for work, request-approval, resolve-authority-conflict, historical-replay, and finish, but must not create or approve contracts, infer hidden lifecycle transitions, invoke replay implicitly, or select an ambiguous contract.
  applies_to: [TARGET-SEQUENCING-ROUTING, TARGET-EXISTING-TESTS, TARGET-DOCS]
  enforcement: { kind: test, verifier_ref: VER-DX }
- id: CON-CEREMONY-BENCHMARK
  level: must
  statement: The machine-readable ceremony benchmark must reproduce scenarios A through G and measure commands, pull requests, lifecycle edits, hand-edited files, concepts, mutations, outcome, diagnostics, and remediation while keeping security outcomes binding and specification runners inert.
  applies_to: [TARGET-CEREMONY-NEW, TARGET-CEREMONY-INTEGRATION, TARGET-NEW-TESTS, TARGET-EXISTING-TESTS]
  enforcement: { kind: test, verifier_ref: VER-DX }
- id: CON-PR-TARGETS
  level: must
  statement: Benchmark targets must remain one implementation pull request for existing authority, two pull requests for new authority, no more than two for overlapping maintenance, zero mutations for one-command historical replay, and fail-closed outcomes for unresolved competition and self-suspension even when that increases command count.
  applies_to: [TARGET-CEREMONY-NEW, TARGET-CEREMONY-INTEGRATION, TARGET-NEW-TESTS, TARGET-EXISTING-TESTS]
  enforcement: { kind: test, verifier_ref: VER-DX }
- id: CON-BACKWARDS-COMPATIBILITY
  level: must
  statement: Existing format 0.1 documents must continue validating without rewrites and retain their meaning; absence of authority controls must preserve current routing, old approved contracts must remain unchanged, and older CLIs must fail closed rather than spend sequencing they do not understand.
  applies_to: [TARGET-SEQUENCING-MODEL, TARGET-SEQUENCING-ROUTING, TARGET-NEW-TESTS, TARGET-EXISTING-TESTS, TARGET-DOCS]
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-RUNNERS-INERT
  level: must_not
  statement: Replay, routing, validation, preparation, review, catalogue, benchmarks, tests, and documentation must not execute specification runner argv; runner declarations remain inert identity data unless a separately trusted execution mechanism is approved later.
  applies_to: [TARGET-REPLAY-NEW, TARGET-REPLAY-INTEGRATION, TARGET-SEQUENCING-ROUTING, TARGET-CEREMONY-INTEGRATION, TARGET-NEW-TESTS, TARGET-EXISTING-TESTS]
  enforcement: { kind: test, verifier_ref: VER-SECURITY }
- id: CON-RC15-REGRESSION
  level: must
  statement: All RC15 trusted-base ProductSpec isolation, strict validation, exact-close, complete-working-state, deny-wins, ambiguity, uncovered-path, malformed-candidate, and evidence-binding regressions must remain green.
  applies_to: [TARGET-REPLAY-INTEGRATION, TARGET-SEQUENCING-ROUTING, TARGET-EXISTING-TESTS]
  enforcement: { kind: test, verifier_ref: VER-REGRESSION }
- id: CON-RC16-IDENTITY
  level: must
  statement: Only after approved implementation passes all trusted checks may package metadata and changelog be prepared as exact version 0.1.0-rc.16; prior package versions, tags, changelog history, Action pins, retained benchmark evidence, and published artifacts must not be rewritten.
  applies_to: [TARGET-PACKAGE, TARGET-EXISTING-TESTS]
  enforcement: { kind: test, verifier_ref: VER-RELEASE }
- id: CON-SCOPED-FOLLOWUPS
  level: must_not
  statement: This contract must not implement the equivalent agentCheck, context, explain, or single-contract gate base-blob follow-ups; those fail-closed availability and diagnostic risks require a separate narrowly approved hardening contract and may only reuse reviewed snapshot abstractions later.
  applies_to: [TARGET-REPLAY-INTEGRATION, TARGET-SEQUENCING-ROUTING, TARGET-EXISTING-TESTS]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-NO-ESCAPE-HATCH
  level: must_not
  statement: RC16 must not add force selection, preference, priority, latest-wins, last-writer-wins, contract-wins, mutable activation, generic trusted-base mismatch bypass, workspace-derived authority, or any option that resolves ambiguity without separately trusted base-approved sequencing.
  applies_to: [TARGET-REPLAY-NEW, TARGET-REPLAY-INTEGRATION, TARGET-SEQUENCING-MODEL, TARGET-SEQUENCING-ROUTING, TARGET-DOCS]
  enforcement: { kind: test, verifier_ref: VER-SECURITY }
- id: CON-NO-RELEASE-OR-ACP
  level: must_not
  statement: Implementation work under this contract must not publish npm, move dist-tags, create or move Git tags, create GitHub releases, merge itself automatically, update Action pins, touch Agent Control Plane, or modify surfaces not explicitly declared by this contract.
  applies_to: [TARGET-REPLAY-NEW, TARGET-REPLAY-INTEGRATION, TARGET-SEQUENCING-MODEL, TARGET-SEQUENCING-ROUTING, TARGET-REPLAY-SCHEMA, TARGET-CEREMONY-NEW, TARGET-CEREMONY-INTEGRATION, TARGET-NEW-TESTS, TARGET-EXISTING-TESTS, TARGET-DOCS, TARGET-PACKAGE]
  enforcement: { kind: review, reviewer_role: release-maintainer }
```

## Verification

```engineering-verification
- id: VER-REPLAY
  proves: [CON-HISTORICAL-MODE, CON-SNAPSHOT-CLOSURE, CON-WORKSPACE-PROFILES]
  kind: test
  runner:
    type: reference
    reference: Focused immutable snapshot, ProductSpec, configuration drift, review simulation, finish-readiness, and no-mutation tests followed by npm test
- id: VER-SEQUENCING
  proves: [CON-SEQUENCING-TRUST, CON-SEQUENCING-SUBTRACTIVE, CON-MIXED-CLOSE, CON-AUDITABILITY]
  kind: test
  runner:
    type: reference
    reference: Focused routing, maintenance sequencing, authority diff, review, prepare, catalogue, and exact-close tests followed by npm test
- id: VER-SECURITY
  proves: [CON-HISTORICAL-NO-WRITES, CON-SEQUENCING-FAIL-CLOSED, CON-NO-SELF-AUTHORIZATION, CON-RUNNERS-INERT, CON-NO-ESCAPE-HATCH]
  kind: security
  runner:
    type: reference
    reference: Adversarial self-authorization, stale pin, deny preservation, chain and cycle, workspace injection, immutable replay, forbidden flag, and inert-runner regression suite
- id: VER-CONFORMANCE
  proves: [CON-TRUSTED-BASE-SEPARATION, CON-NO-LIFECYCLE-STATE, CON-BACKWARDS-COMPATIBILITY]
  kind: schema_check
  runner:
    type: reference
    reference: npm run test:conformance plus additive format, old-reader fail-closed, repository-config, authority-control, and historical-result fixtures
- id: VER-DX
  proves: [CON-REMEDIATION, CON-PROGRESSIVE-DISCLOSURE, CON-CEREMONY-BENCHMARK, CON-PR-TARGETS]
  kind: test
  runner:
    type: reference
    reference: Deterministic CLI output and ceremony benchmark scenarios A through G with schema validation and golden remediation results
- id: VER-REGRESSION
  proves: [CON-RC15-REGRESSION]
  kind: test
  runner:
    type: reference
    reference: Existing RC15, RC14, routing, lifecycle, ProductSpec, evidence, and complete-working-state regression suites
- id: VER-RELEASE
  proves: [CON-RC16-IDENTITY]
  kind: test
  runner:
    type: reference
    reference: npm ci, npm run lint, npm run typecheck, npm test, npm run test:conformance, npm run build, npm run package:check, git diff --check, and exact RC16 version assertions
- id: VER-REVIEW
  proves: [CON-SCOPED-FOLLOWUPS, CON-NO-RELEASE-OR-ACP]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer security and release review of trusted snapshot boundaries, subtractive routing semantics, declared file scope, unchanged Action pins, excluded follow-up commands, no ACP changes, and publication boundary
```

## Rollout

```engineering-rollout
strategy: manual
steps:
  - Review RFC 0013 and this draft without changing implementation, schema, package, release, Action, or consumer-repository surfaces.
  - Resolve open design questions, revise this draft if necessary, then change and merge only the reviewed governance files with status approved.
  - Start implementation from the new trusted main and run engineeringspec work ES-RC16-DX-AUTHORITY before any source write.
  - Add failing replay, self-authorization, deny-preservation, stale-control, old-reader, and ceremony fixtures before implementation.
  - Implement the immutable snapshot reader and replay without exposing writes or current authority.
  - Implement additive exact-path maintenance sequencing, audit output, remediation, and benchmark behavior without adding a suspended lifecycle state.
  - Run focused tests, full repository verification, strict complete-working-state routing, package audit, and exact monotonic closure.
  - Prepare 0.1.0-rc.16 metadata and a draft implementation pull request only; do not merge or publish automatically.
rollback:
  actions:
    - Keep RC15 immutable and current if RC16 implementation or review fails.
    - Remove or defer the optional authority-control implementation before release if old-reader, deny-preservation, or self-authorization tests fail.
    - Retain current ESRT003 ambiguity and current trusted-base mismatch enforcement as the safe fallback.
    - Never repair a failed sequencing rollout by adding priority, force selection, mutable activation, or workspace fallback.
  owner: EngineeringSpec maintainers
```

## Non-goals

Approval, implementation, publication, dist-tag movement, Git tagging, GitHub release creation, Action-pin changes, hosted authority, server-side leases, vendor-specific core behavior, verifier execution, broad site work, agentCheck/context/explain/single-contract-gate hardening, automatic conflict selection, and Agent Control Plane changes are outside this draft proposal.
