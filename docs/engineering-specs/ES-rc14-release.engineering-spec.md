---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-rc14-release
title: Prepare the immutable RC14 release
status: implemented
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
base_revision: "14bf6129690c993fdf396653612b139767906c36"
---

# Prepare the immutable RC14 release

Prepare a coherent `0.1.0-rc.14` repository release candidate after the reviewed RC14 runtime and release-readiness work. Use a non-self-referential two-commit sequence so generated GitHub Actions guidance pins an immutable commit that already contains the complete RC14 runtime, while the final release tip contains the pin and closes the temporary authority.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: docs/engineering-specs/ES-rc14-maximum-safety-minimum-ceremony.engineering-spec.md
  title: Implemented RC14 authority and minimum-ceremony workflow contract
- id: SRC-2
  type: document
  ref: docs/engineering-specs/ES-rc14-release-readiness.engineering-spec.md
  title: Implemented RC14 release-readiness contract
- id: SRC-3
  type: document
  ref: docs/maintaining-specs.md
  title: Non-self-referential release-pin choreography
- id: SRC-4
  type: document
  ref: 14bf6129690c993fdf396653612b139767906c36
  title: Reviewed RC14 release-readiness implementation merge
```

## Target surfaces

```engineering-targets
- id: TARGET-package
  component: rc14-package-identity
  paths:
    - package.json
    - package-lock.json
  change_policy: modify
- id: TARGET-action-pin
  component: immutable-rc14-action-identity
  paths:
    - src/adoption/releases.ts
  change_policy: modify
- id: TARGET-guidance
  component: current-rc14-user-and-agent-guidance
  paths:
    - README.md
    - CHANGELOG.md
    - docs/agent-integration.md
    - docs/cli-reference.md
    - docs/first-change-tutorial.md
    - docs/getting-started.md
    - docs/integrations.md
    - docs/lifecycle.md
    - docs/maintaining-specs.md
    - docs/production-gate.md
    - docs/troubleshooting.md
    - docs/upgrading.md
    - integrations/README.md
    - integrations/claude/README.md
    - integrations/codex/README.md
    - integrations/copilot/README.md
    - integrations/cursor/README.md
    - integrations/generic/README.md
    - skills/engineering-spec/SKILL.md
    - .cursor/rules/engineering-spec.mdc
  change_policy: modify
- id: TARGET-tests
  component: rc14-release-identity-regressions
  paths:
    - test/integration/cli.test.ts
    - test/unit/doctor.test.ts
    - test/unit/release-readiness.test.ts
    - test/unit/version.test.ts
  change_policy: modify
- id: TARGET-site
  component: deterministic-current-release-site
  paths:
    - site/catalogue.json
    - site/explorer.html
    - site/index.html
  change_policy: modify
- id: TARGET-contract
  component: rc14-release-lifecycle
  paths:
    - docs/engineering-specs/ES-rc14-release.engineering-spec.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-1
  level: must
  statement: Commit A must set package.json and the root package-lock metadata to exact version 0.1.0-rc.14 and align current CLI examples, generated guidance, package-shipped integration guidance, active agent handoffs, tests, changelog, and site output with that version without rewriting historical contracts, historical changelog text, receipts, benchmarks, or retained evidence.
  applies_to: [TARGET-package, TARGET-guidance, TARGET-tests, TARGET-site]
  enforcement: { kind: test, verifier_ref: VER-IDENTITY }
- id: CON-2
  level: must
  statement: Commit A must contain the complete reviewed RC14 runtime and documentation required by adopters, pass all trusted checks, and leave the previously reviewed Action pin unchanged so its own full immutable SHA can be computed after the commit exists.
  applies_to: [TARGET-package, TARGET-guidance, TARGET-tests, TARGET-site]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-3
  level: must
  statement: Commit B must set CURRENT_ACTION_SHA and every current production Action example and exact-pin regression to the full 40-character SHA of Commit A, and the pinned Commit A must be an ancestor of Commit B.
  applies_to: [TARGET-action-pin, TARGET-guidance, TARGET-tests]
  enforcement: { kind: test, verifier_ref: VER-PIN }
- id: CON-4
  level: must
  statement: A separate deterministic release-review step in a full-history checkout must inspect Commit A rather than only the current tree and use local Git operations to prove that Commit A exists, is an ancestor of Commit B, identifies as 0.1.0-rc.14, and contains the release-compatible Action entrypoint, approved-base-only authority loading, implementation_with_monotonic_close routing, unsafe mixed-closure rejection, unrelated-closure rejection, and runner inertness. This verification must require no network access after full history is available.
  applies_to: [TARGET-action-pin, TARGET-tests]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-5
  level: must
  statement: Current public documentation, package-shipped integration guidance, active repository agent handoffs, generated adoption output, package metadata, compiled CLI identity, deterministic site output, and release regressions must agree on CLI version 0.1.0-rc.14 and the Commit A Action pin at the final Commit B tree.
  applies_to: [TARGET-package, TARGET-action-pin, TARGET-guidance, TARGET-tests, TARGET-site]
  enforcement: { kind: test, verifier_ref: VER-IDENTITY }
- id: CON-6
  level: must
  statement: The final Commit B must contain only the immutable-pin alignment, deterministic outputs affected by that alignment, and the exact approved-to-implemented transition of this contract; it must not widen or semantically mutate the approved authority.
  applies_to: [TARGET-action-pin, TARGET-guidance, TARGET-tests, TARGET-site, TARGET-contract]
  enforcement: { kind: test, verifier_ref: VER-GOVERNANCE }
- id: CON-7
  level: must_not
  statement: This repository-preparation contract must not publish to npm, move npm dist-tags, create or move Git tags, create a GitHub release, update external consumers, modify action.yml or runtime semantics, execute specification-declared runners, add telemetry, restore removed sensitive material, or change format 0.1, routing authority, target-policy semantics, receipt schemas, or trust boundaries.
  applies_to: [TARGET-package, TARGET-action-pin, TARGET-guidance, TARGET-tests, TARGET-site]
  enforcement: { kind: test, verifier_ref: VER-GOVERNANCE }
- id: CON-8
  level: must
  statement: An explicit allowlist of current release and adoption surfaces must control RC14 identity updates. Historical RC13 contracts, prior release sections in the changelog, retained evidence, benchmark records, receipts, provenance, and historical RFC facts must retain their original versions and pins; implementation must not perform a repository-wide blind replacement, and deterministic regressions must distinguish designated current surfaces from designated historical artifacts.
  applies_to: [TARGET-guidance, TARGET-tests, TARGET-site]
  enforcement: { kind: test, verifier_ref: VER-IDENTITY }
- id: CON-9
  level: must
  statement: Before review, the final tree must pass lint, typecheck, unit tests, conformance tests, build, package-content audit, deterministic site generation, clean-package smoke testing, static current-tree release regressions, the separate RC14 Action-pin full-history release-review step, and the strict complete-working-state EngineeringSpec check.
  applies_to: [TARGET-package, TARGET-action-pin, TARGET-guidance, TARGET-tests, TARGET-site, TARGET-contract]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-10
  level: must
  statement: External publication must require a separate explicit maintainer decision after the repository preparation merges; published npm, tag, and GitHub release identities must never be inferred or performed merely from this contract.
  applies_to: [TARGET-package, TARGET-action-pin, TARGET-contract]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-11
  level: must
  statement: Public integration guidance must present next followed by work for the selected contract, separately trusted repository checks, and finish as the normal agent journey. Prepare, status, review, select, check, context, and explain must remain available as deterministic advanced, CI, or debugging primitives and must not be described as deprecated. Vendor-specific handoffs must remain thin consumers of AGENTS.md and must not define a second authorization model.
  applies_to: [TARGET-guidance]
  enforcement: { kind: test, verifier_ref: VER-IDENTITY }
```

## Verification

```engineering-verification
- id: VER-IDENTITY
  proves: [CON-1, CON-5, CON-8, CON-11]
  kind: test
  runner:
    type: command
    argv: [npm, test]
    network: deny
  expected: { exit_code: 0 }
- id: VER-PIN
  proves: [CON-3]
  kind: security
  runner:
    type: command
    argv: [npm, test]
    network: deny
  expected: { exit_code: 0 }
- id: VER-FULL-HISTORY
  proves: [CON-4]
  kind: human_review
  runner:
    type: manual
    reference: Deterministic full-history release review using local git cat-file, git merge-base --is-ancestor, and git show against Commit A and Commit B; ordinary unit tests prove only static current-tree release consistency
- id: VER-GOVERNANCE
  proves: [CON-6, CON-7]
  kind: security
  runner:
    type: command
    argv: [npm, run, test:conformance]
    network: deny
  expected: { exit_code: 0 }
- id: VER-RELEASE-REVIEW
  proves: [CON-2, CON-9, CON-10]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer review of Commit A runtime identity, Commit B immutable pin and exact close, historical preservation, trusted verification, and the explicit external-publication boundary
```

## Rollout

```engineering-rollout
strategy: manual
steps:
  - Review this contract-only proposal and narrow any unnecessary release surface.
  - Change only status from proposed to approved and merge that authority before preparing RC14.
  - Create Commit A with the RC14 package identity, current version guidance, tests, and deterministic site; run all trusted repository and packaging checks.
  - Record Commit A's full immutable SHA, then create Commit B that aligns the Action pin and current examples, regenerates deterministic outputs as needed, and exactly closes this contract.
  - In a full-history checkout, use local Git object and ancestry checks to verify Commit A independently from the static current-tree regressions; verify the final Commit B tree and merge the reviewed repository-preparation pull request.
  - Stop and obtain an explicit maintainer publication decision before creating the npm package, npm dist-tag, Git tag, GitHub release, or consumer updates.
rollback:
  actions:
    - Do not move, reuse, or overwrite an immutable tag or published package.
    - Keep adopters on RC13 and its reviewed immutable Action pin if either release commit or any verification is incomplete.
    - Prepare a new corrective release candidate rather than mutating a published artifact.
  owner: EngineeringSpec maintainers
```

## Non-goals

Publishing npm, changing npm dist-tags, tagging Git, creating a GitHub release, updating downstream consumers, changing runtime behavior, modifying the Action entrypoint or CI workflows, changing format 0.1, and weakening grant-versus-spend are outside this contract.
