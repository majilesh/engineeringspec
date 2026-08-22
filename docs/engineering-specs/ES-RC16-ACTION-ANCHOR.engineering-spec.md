---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-RC16-ACTION-ANCHOR
title: Align the immutable Action anchor with RC16
status: implemented
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
---

# Align the immutable Action anchor with RC16

Align current public, generated, and enforcement guidance with the already-reviewed RC16 runtime at immutable commit `ddf813e4e69d9b2f9a9eb3f0f241747746021cf3`. This proposal grants no implementation authority until this exact revision is independently reviewed, changed to `approved`, and merged into trusted main. External publication remains a separate authority decision.

## Source intent

```engineering-source-refs
- id: SRC-RC16-MERGE
  type: other
  ref: ddf813e4e69d9b2f9a9eb3f0f241747746021cf3
  title: Reviewed RC16 implementation merge and prospective immutable Action runtime anchor
- id: SRC-RC16-AUTHORITY
  type: document
  path: docs/engineering-specs/ES-RC16-DX-AUTHORITY.engineering-spec.md
  title: Implemented RC16 historical replay and maintenance sequencing authority
- id: SRC-ANCHOR-PROCESS
  type: document
  path: docs/maintaining-specs.md
  title: Existing non-self-referential immutable Action anchor process
- id: SRC-PRODUCTION-GATE
  type: document
  path: docs/production-gate.md
  title: Current immutable production enforcement guidance
```

## Target surfaces

```engineering-targets
- id: TARGET-ACTION-PIN
  component: current-immutable-action-runtime-identity
  paths:
    - src/adoption/releases.ts
  change_policy: modify
- id: TARGET-CURRENT-GUIDANCE
  component: current-public-adoption-and-enforcement-guidance
  paths:
    - README.md
    - docs/agent-integration.md
    - docs/first-change-tutorial.md
    - docs/getting-started.md
    - docs/maintaining-specs.md
    - docs/production-gate.md
    - docs/upgrading.md
    - site/index.html
    - skills/engineering-spec/SKILL.md
  change_policy: modify
- id: TARGET-PIN-REGRESSIONS
  component: current-action-pin-and-guidance-regressions
  paths:
    - test/integration/cli.test.ts
    - test/unit/doctor.test.ts
    - test/unit/release-readiness.test.ts
  change_policy: modify
- id: TARGET-CONTRACT
  component: rc16-action-anchor-authority-lifecycle
  paths:
    - docs/engineering-specs/ES-RC16-ACTION-ANCHOR.engineering-spec.md
  change_policy: modify
```

## Decisions

```engineering-decisions
- id: DEC-ANCHOR
  title: Reuse the reviewed RC16 merge as the Action runtime anchor
  rationale: Commit ddf813e4e69d9b2f9a9eb3f0f241747746021cf3 already predates this alignment, identifies as 0.1.0-rc.16, contains the composite Action entrypoint, and contains the reviewed RC16 routing implementation; creating another runtime-only anchor would add ceremony without adding reviewed behavior.
- id: DEC-EXACT-INVENTORY
  title: Align only current surfaces found by explicit inventory
  rationale: Exact current guidance, generated-adoption identity, and regression paths avoid rewriting historical RC14 and RC15 contracts, changelog entries, evidence, catalogue snapshots, or provenance facts.
```

## Constraints

```engineering-constraints
- id: CON-ANCHOR-IDENTITY
  level: must
  statement: CURRENT_ACTION_SHA and every current production Action example or generated-adoption expectation in scope must use exactly ddf813e4e69d9b2f9a9eb3f0f241747746021cf3; movable refs are not acceptable for current production guidance.
  applies_to: [TARGET-ACTION-PIN, TARGET-CURRENT-GUIDANCE, TARGET-PIN-REGRESSIONS]
  enforcement: { kind: test, verifier_ref: VER-STATIC }
- id: CON-ANCHOR-PREEXISTS
  level: must
  statement: The selected anchor must remain the already-existing reviewed RC16 merge commit ddf813e4e69d9b2f9a9eb3f0f241747746021cf3 and must be an ancestor of the future pin-alignment implementation; the alignment commit must not pin itself.
  applies_to: [TARGET-ACTION-PIN, TARGET-PIN-REGRESSIONS]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-FULL-HISTORY
  level: must
  statement: A separate full-history release review must use deterministic local Git object and ancestry inspection to prove that the anchor commit exists, identifies package version 0.1.0-rc.16, contains action.yml building the Action-local CLI and invoking select and review for directory enforcement, contains trusted-base-only subtractive and deny-preserving maintenance sequencing, fails closed for invalid, stale, chained, cyclic, or competing controls, keeps specification runners inert, and predates the final pin-alignment commit; ordinary unit tests alone are insufficient proof.
  applies_to: [TARGET-ACTION-PIN, TARGET-PIN-REGRESSIONS]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-CURRENT-COHERENCE
  level: must
  statement: Current CLI guidance must identify 0.1.0-rc.16, current production Action guidance and generated adopt and doctor expectations must use the RC16 anchor, the site quickstart and production-gate guidance must no longer present RC14 as current, and no guidance may claim that v0.1.0-rc.16 or its npm package already exists before separate publication completes.
  applies_to: [TARGET-ACTION-PIN, TARGET-CURRENT-GUIDANCE, TARGET-PIN-REGRESSIONS]
  enforcement: { kind: test, verifier_ref: VER-STATIC }
- id: CON-CURRENT-JOURNEY
  level: must
  statement: Current first-adoption and prospective site guidance must prefer explicit intended paths when proposing new authority, while the normal memorable agent journey remains next followed by work for the approved contract and finish; propose --from-diff may remain documented as an advanced supported capability but must not be the normal clean prospective-change path.
  applies_to: [TARGET-CURRENT-GUIDANCE, TARGET-PIN-REGRESSIONS]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-HISTORICAL-PRESERVATION
  level: must
  statement: Historical RC14 and RC15 EngineeringSpecs, changelog and release-note identities, retained receipts, evidence, benchmark provenance, generated catalogue content that embeds historical contracts, prior immutable-pin facts explicitly presented as historical, and compatibility fixtures must remain unchanged; implementation must not perform a repository-wide blind replacement.
  applies_to: [TARGET-CURRENT-GUIDANCE, TARGET-PIN-REGRESSIONS]
  enforcement: { kind: test, verifier_ref: VER-SCOPE }
- id: CON-NO-RUNTIME-CHANGE
  level: must_not
  statement: This alignment must not modify action.yml, routing, select, review, replay, authority-control semantics, trusted-base rules, EngineeringSpec schemas, receipt formats, package identity, package-lock identity, release workflow, or any runtime behavior.
  applies_to: [TARGET-ACTION-PIN, TARGET-CURRENT-GUIDANCE, TARGET-PIN-REGRESSIONS, TARGET-CONTRACT]
  enforcement: { kind: test, verifier_ref: VER-SCOPE }
- id: CON-NO-PUBLICATION
  level: must_not
  statement: This authority must not publish npm, move npm dist-tags, create or move Git tags, create GitHub releases, promote npm latest, update downstream consumers, or represent external RC16 publication as complete; publication requires a later separately reviewed contract.
  applies_to: [TARGET-ACTION-PIN, TARGET-CURRENT-GUIDANCE, TARGET-PIN-REGRESSIONS, TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: release-maintainer }
- id: CON-NO-ACP
  level: must_not
  statement: No Agent Control Plane repository, source, documentation, consumer configuration, or release surface is in scope.
  applies_to: [TARGET-ACTION-PIN, TARGET-CURRENT-GUIDANCE, TARGET-PIN-REGRESSIONS, TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-VERIFICATION
  level: must
  statement: The future alignment must pass lint, typecheck, complete tests, conformance, build, package-content inspection, strict full-catalogue validation, current pin and guidance consistency checks, complete-working-state routing, git diff checks, and the separate full-history anchor review before the exact approved-to-implemented contract close is proposed.
  applies_to: [TARGET-ACTION-PIN, TARGET-CURRENT-GUIDANCE, TARGET-PIN-REGRESSIONS, TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: maintainer }
```

## Verification

```engineering-verification
- id: VER-STATIC
  proves: [CON-ANCHOR-IDENTITY, CON-CURRENT-COHERENCE]
  kind: test
  runner:
    type: reference
    reference: Current-tree release identity and generated-adoption regressions followed by lint, typecheck, complete tests, conformance, build, and package-content inspection
- id: VER-FULL-HISTORY
  proves: [CON-ANCHOR-PREEXISTS, CON-FULL-HISTORY]
  kind: human_review
  runner:
    type: manual
    reference: Full-history local git cat-file, git show, and merge-base ancestry inspection of ddf813e4e69d9b2f9a9eb3f0f241747746021cf3 and the future alignment commit
- id: VER-SCOPE
  proves: [CON-HISTORICAL-PRESERVATION, CON-NO-RUNTIME-CHANGE]
  kind: security
  runner:
    type: reference
    reference: Exact changed-path allowlist, historical-identity regression, strict catalogue validation, complete EngineeringSpec routing, and git diff inspection
- id: VER-RELEASE-REVIEW
  proves: [CON-CURRENT-JOURNEY, CON-NO-PUBLICATION, CON-NO-ACP, CON-VERIFICATION]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer review of current guidance, immutable anchor identity, verification evidence, publication separation, and excluded repositories and release operations
```

## Rollout

```engineering-rollout
strategy: manual
steps:
  - Review this proposal and its exact inventory-derived targets without changing current code, guidance, tests, pins, packages, tags, releases, consumers, or external repositories.
  - Approve and merge only this exact contract revision before any alignment write.
  - Start a fresh implementation branch from the new trusted main and run engineeringspec work ES-RC16-ACTION-ANCHOR before editing.
  - Change only the approved current Action pin, current guidance, and regression surfaces; preserve historical identities and runtime semantics.
  - Run the complete current-tree verification and separate full-history anchor review, then include only the exact approved-to-implemented close if safe.
  - Merge the independently reviewed alignment before preparing a separate external-publication authority contract.
rollback:
  actions:
    - Keep current consumers on the prior immutable RC14 Action anchor if alignment verification fails.
    - Correct current guidance through a later reviewed alignment rather than moving or rewriting any immutable identity.
    - Never repair an alignment failure by changing runtime authority, publication state, or downstream consumers under this contract.
  owner: EngineeringSpec maintainers
```

## Non-goals

Runtime or Action-entrypoint changes, package or schema changes, publication, npm dist-tag movement, Git tagging, GitHub release creation, downstream consumer updates, historical-record rewriting, and Agent Control Plane work are outside this proposal.
