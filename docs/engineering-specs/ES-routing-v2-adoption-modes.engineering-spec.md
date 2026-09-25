---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-routing-v2-adoption-modes
title: Routing v2, adoption modes, and adoption safety
status: approved
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
base_revision: "35b8ab7786b97604a8cd0622a50d8bd0c132cdf7"
supersedes:
  - ES-external-adopter-pilot-execution
---

# Routing v2, adoption modes, and adoption safety

Design and, only after separate approval, implement RFC 0014. The work covers:

- advisory, standard and controlled adoption modes;
- a zero-contract installation that passes in advisory mode;
- trusted-base repository policy with governed, exempt, protected and grant-before-spend paths;
- explicit base-approved contract selection that can only narrow authority;
- standing versus single-change authority;
- receipt-based closure;
- a lite contract profile;
- optional change budgets;
- secure generated CODEOWNERS and ruleset guidance;
- a vendor-neutral edit guard with thin Claude Code, Codex and Cursor adapters;
- executable ceremony benchmarks;
- routing and authority coverage requirements;
- Action startup optimization;
- base-built self-gating for this repository.

This contract preserves base-pinned authority, deny-overrides-allow, inert runners, canonicalization, the restricted glob dialect, and agent neutrality.

This contract is `proposed`. It grants no implementation authority. Approval must be reviewed and merged as a separate contract-only governance change. That same approval change must move `ES-external-adopter-pilot-execution` from `approved` to `superseded`; otherwise the shared `benchmarks/README.md` claim becomes ambiguous (`ESRT003`).

## Source intent

```engineering-source-refs
- id: SRC-REVIEW
  type: other
  ref: maintainer-engineering-review-2026-09-25
  title: Maintainer engineering review reproducing routing, onboarding, wiring, benchmark, coverage, and Action findings (summarized in RFC 0014 Motivation)
- id: SRC-RFC
  type: document
  ref: rfcs/0014-routing-v2-adoption-modes.md
  title: Proposed Routing v2 and adoption modes design, threat model, and unresolved questions
- id: SRC-PILOT
  type: document
  ref: docs/engineering-specs/ES-external-adopter-pilot-execution.engineering-spec.md
  title: Approved pilot authority whose CON-NO-PRODUCT-WORK freeze this contract supersedes
- id: SRC-SEQUENCING
  type: document
  ref: rfcs/0013-rc16-historical-replay-maintenance-sequencing.md
  title: Existing maintenance-sequencing design that remains supported and unchanged
- id: SRC-RC14
  type: document
  ref: rfcs/0011-maximum-safety-minimum-ceremony.md
  title: Accepted immutable authority and implementation-plus-close design
- id: SRC-SECOND-REVIEW
  type: other
  ref: independent-second-review-2026-09-25
  title: Independent reproduction of the review findings, with verified vendor-hook and GitHub ruleset references
```

## Target surfaces

```engineering-targets
- id: TARGET-RFC
  component: routing-v2-design-record
  paths:
    - rfcs/0014-routing-v2-adoption-modes.md
  change_policy: modify
  notes: The first implementation PR updates RFC status from Proposed to Accepted and records resolved decisions.
- id: TARGET-CONTRACT
  component: routing-v2-contract-lifecycle
  paths:
    - docs/engineering-specs/ES-routing-v2-adoption-modes.engineering-spec.md
  change_policy: modify
- id: TARGET-ROUTING
  component: routing-decision-algorithm
  paths:
    - src/routing/route.ts
    - src/routing/select.ts
    - src/routing/governance.ts
    - src/routing/loadCandidates.ts
    - src/routing/types.ts
    - src/gate/gate.ts
    - src/gate/collectDiff.ts
    - src/gate/types.ts
    - src/authority/diff.ts
    - src/query/applicability.ts
    - src/query/changeBrief.ts
  change_policy: modify
- id: TARGET-POLICY-NEW
  component: modes-policy-selector-standing-budget-receipt-modules
  paths:
    - src/policy/**
    - src/receipts/**
    - src/profiles/lite/**
  change_policy: create
- id: TARGET-CONFIG
  component: trusted-base-repository-config
  paths:
    - src/config/repositoryConfig.ts
    - schemas/repository-config-0.1.schema.json
  change_policy: modify
- id: TARGET-SCHEMAS-NEW
  component: new-versioned-schemas
  paths:
    - schemas/repository-config-0.2.schema.json
    - schemas/closure-receipt-0.1.schema.json
    - schemas/profiles/lite-0.1.schema.json
  change_policy: create
- id: TARGET-FORMAT
  component: additive-draft-format-fields
  paths:
    - schemas/engineering-spec-0.1.schema.json
    - src/model/types.ts
    - src/model/constants.ts
    - src/parser/parseMarkdown.ts
    - src/normalizer/normalize.ts
    - src/normalizer/digest.ts
    - src/validator/validateStructure.ts
    - src/validator/validateSemantics.ts
    - src/validator/validateReferences.ts
    - src/validator/validateProfiles.ts
    - src/diagnostics/codes.ts
    - src/diagnostics/formatter.ts
    - src/diagnostics/github.ts
  change_policy: modify
- id: TARGET-EVIDENCE
  component: implementation-receipt-integration
  paths:
    - src/evidence/receipt.ts
    - src/evidence/prMetadata.ts
  change_policy: modify
- id: TARGET-CLI
  component: cli-workflow-commands
  paths:
    - src/cli/program.ts
    - src/cli/adopt.ts
    - src/cli/templates.ts
    - src/cli/propose.ts
    - src/cli/next.ts
    - src/cli/work.ts
    - src/cli/finish.ts
    - src/cli/doctor.ts
    - src/cli/status.ts
    - src/cli/review.ts
    - src/cli/prepare.ts
    - src/cli/benchmark.ts
    - src/cli/render.ts
    - src/adoption/releases.ts
    - src/index.ts
  change_policy: modify
- id: TARGET-GUARD-NEW
  component: vendor-neutral-edit-guard-and-adapters
  paths:
    - src/cli/guard.ts
    - src/guard/**
    - integrations/claude/hooks/**
    - integrations/codex/hooks/**
    - integrations/cursor/hooks/**
  change_policy: create
- id: TARGET-INTEGRATION-DOCS
  component: agent-integration-guidance
  paths:
    - integrations/README.md
    - integrations/claude/README.md
    - integrations/codex/README.md
    - integrations/cursor/README.md
    - integrations/copilot/README.md
    - integrations/generic/README.md
    - skills/engineering-spec/SKILL.md
    - AGENTS.md
    - CLAUDE.md
  change_policy: modify
- id: TARGET-TESTS
  component: tests-and-conformance
  paths:
    - test/**
    - conformance/**
    - vitest.config.ts
  change_policy: modify
- id: TARGET-BENCHMARK
  component: executable-ceremony-benchmark
  paths:
    - benchmarks/ceremony-scenarios.json
    - benchmarks/ceremony.schema.json
    - benchmarks/README.md
  change_policy: modify
- id: TARGET-ACTION
  component: action-runtime-and-ci
  paths:
    - action.yml
    - .github/workflows/ci.yml
    - package.json
    - package-lock.json
    - scripts/check-package-contents.mjs
  change_policy: modify
- id: TARGET-ACTION-NEW
  component: bundled-action-runtime
  paths:
    - action/**
    - scripts/build-action.mjs
  change_policy: create
- id: TARGET-DOCS
  component: normative-and-user-documentation
  paths:
    - SPEC.md
    - README.md
    - CHANGELOG.md
    - docs/getting-started.md
    - docs/first-change-tutorial.md
    - docs/production-gate.md
    - docs/cli-reference.md
    - docs/troubleshooting.md
    - docs/lifecycle.md
    - docs/maintaining-specs.md
    - docs/agent-integration.md
    - docs/integrations.md
    - examples/adopters/CODEOWNERS.example
  change_policy: modify
```

## Decisions

```engineering-decisions
- id: DEC-NARROW-ONLY-SELECTION
  title: Resolve overlap by explicit narrowing, not precedence
  rationale: A base-approved selector that can only restrict which positive claims are considered removes ambiguity and parallel-agent collisions without implicit glob-specificity or priority ordering. Denies from every approved contract remain in force.
- id: DEC-BASE-PINNED-STANDARD
  title: Standard mode derives authority only from the trusted base
  rationale: One-PR head-contract authority was considered and rejected because it lets a change widen and spend authority together. Standard mode instead combines base-approved standing authority with trusted-base exempt and ungoverned policy.
- id: DEC-ADVISORY-DEFAULT
  title: New installations start advisory
  rationale: A control that fails its own installation is not adopted. Advisory reports identical decisions with non-blocking outcomes and labels itself non-enforcing; enforcement is a trusted-base configuration change.
- id: DEC-LEGACY-PRESERVED
  title: Absent mode means current behavior
  rationale: Existing adopters and fixtures keep exactly-one-claimant routing unless the trusted-base configuration opts into a mode.
- id: DEC-RECEIPTS-SUBTRACT-ONLY
  title: Receipts may only remove eligibility
  rationale: Receipt forgery or staleness then fails safe; receipts never create, widen, reactivate, or re-date authority.
- id: DEC-GUARDRAIL-NOT-BOUNDARY
  title: Edit-time hooks guide; CI enforces
  rationale: Vendor pre-tool hooks can block direct edits but not every shell write. Merge-time base-pinned routing remains the enforcement boundary.
- id: DEC-SINGLE-CONTRACT-PHASED
  title: One authorizing contract with mandatory phase order
  rationale: Requested as a single authority for RFC 0014. Targets are enumerated per workstream rather than broad src/** grants, and CON-PHASE-ORDER requires separately reviewed PRs per phase. Splitting into per-phase contracts remains an open reviewer decision.
```

## Constraints

```engineering-constraints
- id: CON-PRESERVE-INVARIANTS
  level: must
  statement: Preserve trusted-base-pinned authority loading at immutable resolved SHAs, deny-overrides-allow, inert specification runners, byte-identical canonical JSON and digests for all existing valid fixtures, the restricted EngineeringSpec glob dialect for every new policy or selector path, and agent neutrality of the core format.
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-LEGACY-COMPAT
  level: must
  statement: A trusted-base repository configuration without mode must produce identical routing decisions, outcomes, diagnostics, and changed digests for every existing routing, governance, authority-diff, sequencing, and replay conformance fixture and integration test.
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-MODES
  level: must
  statement: Implement advisory, standard, and controlled modes exactly as the RFC 0014 decision-and-outcome table defines; decisions must be identical across modes, only outcomes may differ, and advisory output must state that it is not enforced.
  applies_to: [TARGET-ROUTING, TARGET-POLICY-NEW, TARGET-CONFIG, TARGET-CLI]
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-ZERO-CONTRACT
  level: must
  statement: A fresh repository adopted with default adopt options must be configured for advisory mode and its adoption pull request must pass the generated workflow check with zero contracts, verified end to end in a temporary Git repository with the built CLI.
  applies_to: [TARGET-CLI, TARGET-ACTION]
  enforcement: { kind: test, verifier_ref: VER-ADOPTION }
- id: CON-POLICY
  level: must
  statement: Governed, exempt, protected, and grant-before-spend paths, budgets, and selector settings must be read only from the trusted-base configuration; protected must override exempt; the specification directory, repository configuration, and CODEOWNERS must be implicitly protected in standard and controlled modes.
  applies_to: [TARGET-CONFIG, TARGET-POLICY-NEW, TARGET-ROUTING]
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-SELECTOR-NARROW
  level: must
  statement: A contract selector must be treated as untrusted data, must resolve to exactly one eligible trusted-base contract or fail closed without falling back, and may only narrow the positive claims considered; it must never widen targets, select workspace, head, draft, proposed, spent, or expired authority, satisfy protected or grant-before-spend paths with standing authority, or change mode or policy.
  applies_to: [TARGET-ROUTING, TARGET-POLICY-NEW, TARGET-CLI, TARGET-ACTION]
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-DENY-FIRST
  level: must_not
  statement: No selector, mode, tier, exemption, standing authority, receipt, budget, lite profile, or guard result may suppress or reorder a read_only, observe, or change-policy denial from any eligible approved contract.
  applies_to: [TARGET-ROUTING, TARGET-POLICY-NEW, TARGET-GUARD-NEW]
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-STANDING
  level: must
  statement: Standing authority must declare expires_at, become ineligible after expiry evaluated against the trusted base commit timestamp rather than wall-clock time, never be closed by a receipt, and never positively satisfy protected or grant-before-spend paths.
  applies_to: [TARGET-FORMAT, TARGET-POLICY-NEW, TARGET-ROUTING]
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-RECEIPT-FAILSAFE
  level: must
  statement: Closure receipts must bind contract ID, revision, closure semantic digest, trusted base SHA, and routed change digest; must only remove eligibility of change authority; and receipt location and timing must be resolved in RFC 0014 before any receipt implementation begins.
  applies_to: [TARGET-POLICY-NEW, TARGET-EVIDENCE, TARGET-SCHEMAS-NEW, TARGET-ROUTING]
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-LITE
  level: must
  statement: The lite profile must require only frontmatter and targets, validate any optional blocks it contains as today, be rejected with an unsupported-profile diagnostic by implementations that do not support it, and never satisfy a protected path.
  applies_to: [TARGET-FORMAT, TARGET-POLICY-NEW, TARGET-SCHEMAS-NEW, TARGET-CLI]
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-BUDGETS
  level: must
  statement: Optional contract and repository change budgets must count files and changed lines deterministically from the same resolved base and head range as routing, count binary files toward files only, and report over_budget as a whole-change decision.
  applies_to: [TARGET-ROUTING, TARGET-POLICY-NEW]
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-SECURE-WIRING
  level: must
  statement: adopt must generate CODEOWNERS entries for the specification directory, .github/workflows, .github/CODEOWNERS, and engineering-spec.json; doctor must warn when any are missing; production guidance must specify required check, required code-owner review, stale-approval dismissal, most-recent-push approval, and the residual workflow-modification risk with organization-level mitigations; adopt must stop generating the Copilot prompt file.
  applies_to: [TARGET-CLI, TARGET-DOCS, TARGET-INTEGRATION-DOCS]
  enforcement: { kind: test, verifier_ref: VER-ADOPTION }
- id: CON-GUARD
  level: must
  statement: engineeringspec guard must be read-only, make no network requests, execute no runners, and use the same trusted-base authority, policy, and decision algorithm as routing; vendor adapters must stay thin, be described as guardrails rather than enforcement boundaries, run complete-state check for shell-write coverage, and be re-verified against current vendor hook documentation at implementation time.
  applies_to: [TARGET-GUARD-NEW, TARGET-INTEGRATION-DOCS]
  enforcement: { kind: test, verifier_ref: VER-GUARD }
- id: CON-BENCHMARK-EXECUTABLE
  level: must
  statement: Ceremony benchmark scenarios must declare inputs and expected outcomes only; the harness must derive actual outcomes, command counts, mutations, and diagnostics by executing the real CLI in temporary Git repositories, and must reject authored actual outcomes.
  applies_to: [TARGET-BENCHMARK, TARGET-CLI, TARGET-TESTS]
  enforcement: { kind: test, verifier_ref: VER-BENCHMARK }
- id: CON-COVERAGE
  level: must
  statement: Coverage thresholds of at least 85 statements, 80 branches, 85 functions, and 85 lines must include src/routing, src/authority, src/config, src/gate, src/policy, src/receipts, src/guard, and the next, work, finish, adopt, and guard CLI modules; tests must not call process.chdir.
  applies_to: [TARGET-TESTS]
  enforcement: { kind: test, verifier_ref: VER-UNIT }
- id: CON-ACTION-STARTUP
  level: must
  statement: The Action must not compile TypeScript or install development dependencies at runtime, must declare outputs for result, mode, classification, and selected contract, and production guidance must continue to pin a reviewed immutable SHA.
  applies_to: [TARGET-ACTION, TARGET-ACTION-NEW, TARGET-DOCS]
  enforcement: { kind: test, verifier_ref: VER-ACTION }
- id: CON-SELF-GATING
  level: must
  statement: Before any routing, authority, config, policy, or guard semantic change, repository CI must evaluate pull-request routing with a CLI built from the trusted base or a pinned reviewed SHA rather than the pull request head.
  applies_to: [TARGET-ACTION]
  enforcement: { kind: test, verifier_ref: VER-SELF-GATING }
- id: CON-PHASE-ORDER
  level: must
  statement: Implement in separately reviewed pull requests in this order - phase 0 self-gating, test hygiene, and coverage scope; phase 1 conformance fixtures; phase 2 config, modes, policy, and zero-contract advisory; phase 3 selector, standing authority, and budgets; phase 4 receipts and lite profile; phase 5 secure adoption wiring and documentation; phase 6 guard and adapters; phase 7 executable ceremony benchmark and Action startup. The first implementation PR must record RFC 0014 as Accepted with resolved decisions.
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-PACKAGE-SCOPE
  level: must_not
  statement: Changes to package.json and package-lock.json must not add runtime dependencies, change package identity, or bump the package version; only development tooling needed for Action bundling or tests is authorized.
  applies_to: [TARGET-ACTION]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-SCOPE
  level: must_not
  statement: This authority must not publish, tag, release, or version the package or Action; modify site, brand, pages or release workflows, replay, catalogue, architecture, measurement, or pilot evidence; add MCP, ACP, hosted services or integrations, telemetry, or network access in validation, routing, guard, or receipts; or change maintenance-sequencing semantics.
  enforcement: { kind: test, verifier_ref: VER-SELF-GATING }
- id: CON-SUPERSESSION
  level: must
  statement: The approval change must move this contract to approved and ES-external-adopter-pilot-execution from approved to superseded in the same contract-only change, and no implementation may begin until that change is merged to the trusted base.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-CLOSE
  level: must
  statement: After all phases, separately trusted checks, and security review are complete, close this contract only through the exact approved to implemented monotonic lifecycle transition.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: maintainer }
```

## Verification

```engineering-verification
- id: VER-CONFORMANCE
  proves: [CON-PRESERVE-INVARIANTS, CON-LEGACY-COMPAT, CON-MODES, CON-POLICY, CON-SELECTOR-NARROW, CON-DENY-FIRST, CON-STANDING, CON-RECEIPT-FAILSAFE, CON-LITE, CON-BUDGETS]
  kind: test
  runner:
    type: reference
    reference: npm run test:conformance passes with every fixture in engineering-x-engineeringspec-conformance-inventory implemented and all pre-existing fixtures unchanged
- id: VER-UNIT
  proves: [CON-COVERAGE]
  kind: test
  runner:
    type: reference
    reference: npm test with coverage thresholds applied to the enumerated modules, run serially and in parallel without process.chdir
- id: VER-ADOPTION
  proves: [CON-ZERO-CONTRACT, CON-SECURE-WIRING]
  kind: test
  runner:
    type: reference
    reference: Integration test that adopts a temporary Git repository with default options, commits, and runs the generated workflow's check command against the pre-adoption base expecting pass in advisory mode, then asserts generated CODEOWNERS entries and doctor warnings
- id: VER-GUARD
  proves: [CON-GUARD]
  kind: test
  runner:
    type: reference
    reference: Guard decisions equal routing decisions across the conformance inventory, adapter payload fixtures for each vendor block denied edits, and a network-deny, no-exec test harness observes no child processes or writes
- id: VER-BENCHMARK
  proves: [CON-BENCHMARK-EXECUTABLE]
  kind: test
  runner:
    type: reference
    reference: engineeringspec benchmark --ceremony executes every scenario in temporary repositories and rejects a fixture containing an authored actualOutcome
- id: VER-ACTION
  proves: [CON-ACTION-STARTUP]
  kind: static_analysis
  runner:
    type: reference
    reference: action.yml contains no tsc or npm ci of development dependencies and declares the required outputs; CI records Action step duration before and after
- id: VER-SELF-GATING
  proves: [CON-SELF-GATING, CON-SCOPE]
  kind: test
  runner:
    type: reference
    reference: CI routing job runs a trusted-base-built CLI, and engineeringspec check --spec-dir docs/engineering-specs --base origin/main --strict reports zero violations for each phase pull request
- id: VER-REVIEW
  proves: [CON-PHASE-ORDER, CON-PACKAGE-SCOPE, CON-SUPERSESSION, CON-CLOSE, CON-SELECTOR-NARROW, CON-DENY-FIRST, CON-RECEIPT-FAILSAFE]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer and security reviewer confirm phase order, package scope, narrow-only selection, deny-first evaluation, fail-safe receipts, supersession sequencing, and exact closure
```

## Proposed conformance-fixture inventory

The block below is the required fixture inventory. Each fixture lands in phase 1, before the semantics it tests. Codes are provisional (RFC 0014).

| Group | Fixtures | Asserts |
|---|---|---|
| Legacy compatibility | all existing `conformance/routing`, `governance`, `authority-diff`, `authority-sequencing` cases rerun with no `mode` | Identical decisions, codes, digests |
| Modes | same changed set under advisory, standard, controlled | Identical decisions; outcomes per table |
| Zero-contract | no candidates, non-empty change, each mode | advisory pass; standard/controlled pass only for exempt/ungoverned |
| Policy | exempt, ungoverned, protected-overrides-exempt, implicit protection of spec dir/config/CODEOWNERS, invalid policy glob | Decisions and `ESPTH002` |
| Selector | narrows overlap, cannot widen, conflicting sources, unresolved ID, draft/spent/expired target, invalid ID syntax, cannot suppress deny | `selected`/`uncovered`, `ESRT009`, deny preserved |
| Deny-first | deny from unselected contract, from standing contract, on exempt path | `denied` in every case |
| Standing | single standing allow, change-over-standing attribution, two standing overlap, expired by base timestamp, claims protected | `standing`, `ambiguous`, `ESRT011`, `ESRT012` |
| Grant-before-spend | standing-only claim in controlled, change contract claim | `uncovered` vs `selected` |
| Protected | selected full contract, lite contract, no selector with sole change contract, standing only | `selected` vs `ESRT008` |
| Receipts | valid receipt spends, mismatched digest, stale revision, receipt for standing contract, forged receipt | Spent vs `ESRT013`; never widens |
| Lite profile | minimal valid, optional blocks validated, unsupported-profile rejection | Validity and codes |
| Budgets | under, files over, lines over, binary, rename-only | `over_budget` / `ESRT010` |
| Guard parity | every routing fixture replayed through guard | Guard decision equals routing decision |
| Canonicalization | new frontmatter fields and profile | Byte-identical canonical JSON and digests |

```engineering-x-engineeringspec-conformance-inventory
- group: legacy-compatibility
  path: conformance/routing-v2/legacy
  fixtures: [existing-routing-unchanged, existing-governance-unchanged, existing-authority-diff-unchanged, existing-sequencing-unchanged]
- group: modes
  path: conformance/routing-v2/modes
  fixtures: [advisory-reports-uncovered, standard-fails-uncovered, controlled-fails-uncovered, decisions-identical-across-modes]
- group: zero-contract
  path: conformance/routing-v2/zero-contract
  fixtures: [advisory-no-candidates-passes, standard-no-candidates-exempt-passes, standard-no-candidates-governed-fails, adoption-pr-advisory-passes]
- group: policy
  path: conformance/routing-v2/policy
  fixtures: [exempt-path-passes, ungoverned-path-passes, protected-overrides-exempt, implicit-protection-spec-directory, implicit-protection-config, implicit-protection-codeowners, invalid-policy-glob]
- group: selector
  path: conformance/routing-v2/selector
  fixtures: [selector-narrows-overlap, selector-cannot-widen, selector-conflicting-sources, selector-unresolved-id, selector-rejects-draft, selector-rejects-spent, selector-rejects-expired, selector-invalid-id-syntax, selector-cannot-suppress-deny]
- group: deny-first
  path: conformance/routing-v2/deny-first
  fixtures: [deny-from-unselected-contract, deny-from-standing-contract, deny-on-exempt-path]
- group: standing
  path: conformance/routing-v2/standing
  fixtures: [standing-single-allow, change-over-standing-attribution, standing-overlap-ambiguous, standing-expired-by-base-timestamp, standing-claims-protected-invalid]
- group: grant-before-spend
  path: conformance/routing-v2/grant-before-spend
  fixtures: [controlled-standing-only-uncovered, controlled-change-contract-selected]
- group: protected
  path: conformance/routing-v2/protected
  fixtures: [protected-selected-full, protected-lite-rejected, protected-sole-change-contract, protected-standing-only-rejected]
- group: receipts
  path: conformance/routing-v2/receipts
  fixtures: [receipt-spends-change-contract, receipt-mismatched-digest, receipt-stale-revision, receipt-for-standing-rejected, receipt-forged-fails-safe]
- group: lite-profile
  path: conformance/routing-v2/lite
  fixtures: [lite-minimal-valid, lite-optional-blocks-validated, lite-unsupported-profile-rejected]
- group: budgets
  path: conformance/routing-v2/budgets
  fixtures: [budget-under, budget-files-over, budget-lines-over, budget-binary-files-only, budget-rename-only]
- group: guard-parity
  path: conformance/routing-v2/guard
  fixtures: [guard-equals-routing-all-fixtures]
- group: canonicalization
  path: conformance/routing-v2/canonical
  fixtures: [authority-kind-canonical, expires-at-canonical, change-budget-canonical, lite-profile-canonical]
```

## Rollout

```engineering-rollout
strategy: canary
steps:
  - Merge this proposal and RFC 0014 as a proposal change; the contract remains proposed and grants no implementation authority.
  - In a separate contract-only change, move this contract to approved and ES-external-adopter-pilot-execution to superseded together, then merge to the trusted base.
  - Phase 0 first - base-built self-gating in CI, test hygiene, and coverage scope - so later routing changes cannot evaluate themselves.
  - Phase 1 conformance fixtures, then phases 2 through 7 in order as separately reviewed pull requests; record RFC 0014 as Accepted in the first implementation pull request.
  - Dogfood advisory mode on a scratch repository and this repository's own configuration only after a separately reviewed configuration contract.
rollback:
  actions:
    - Remove or leave unset mode in the trusted-base configuration to return to legacy exactly-one-claimant routing.
    - Revert individual phase pull requests; legacy fixtures guarantee prior behavior is recoverable.
    - Keep the previous immutable Action SHA pinned until the bundled runtime is separately reviewed.
  owner: EngineeringSpec maintainers
```

## Non-goals

This contract does not authorize any of the following:

- a release, tag, or version bump;
- npm or Action publication;
- a hosted service or integration, telemetry, MCP or ACP;
- site or brand work;
- replay, catalogue, architecture or measurement changes;
- pilot evidence collection;
- maintenance-sequencing semantic changes;
- changes to this repository's own `engineering-spec.json` mode.
