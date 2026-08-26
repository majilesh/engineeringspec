# Changelog

All notable changes to this project are documented here.

## [Unreleased]

### Changed

- `next` and `work` default JSON now project compact permission tickets; `--verbose` restores their previous full reports and exit behavior.
- `next` exposes the existing current-change classification separately from permission, names approved and draft/proposed IDs, and gives executable directory `explain` commands for routing blockers.
- `work` retains base identity, policy-bearing writable/protected paths, constraints, technical contracts, verifier identities, and stop conditions without predicting a lane or finish mode.
- Shared agent guidance uses `engineeringspec` consistently and documents the authorized all-specification governance case. `finish`, routing decisions, and trusted-base authority semantics are unchanged.

## [0.1.0-rc.16] - 2026-08-22

### Added

- Explicit `replay` simulations for historical review and finish readiness using one immutable Git snapshot for configuration, EngineeringSpecs, ProductSpecs, and repository-local references.
- Optional exact-path `engineering-authority-controls` for independently approved, subtractive maintenance sequencing.
- Deterministic ceremony benchmark scenarios A–G and machine-readable historical replay and ceremony schemas.

### Changed

- Routing, review, preparation, catalogue, status, and authority-diff reports expose stable sequencing identities and outcomes without executable runner payloads.
- `next` reports deterministic remediation recommendations for work, approval, ambiguity resolution, historical replay, and finish.

### Security

- Historical replay always reports `historical_read_only` and `currentAuthorityGranted: false`; it cannot write, transition lifecycle state, inspect mutable Git state, or execute runners or trusted verifiers.
- Maintenance sequencing can only subtract a pinned positive claim on an exact path also writable by the trusted controller. Denials and remaining ambiguity continue to fail closed.
- Workspace-only, stale, broad, duplicated, chained, cyclic, competing, and self-authorizing controls have no authority effect and fail closed.

## [0.1.0-rc.15] - 2026-08-19

### Fixed

- `finish --write-closure` now accepts base-approved EngineeringSpecs containing repository-local ProductSpec references while preserving strict structural, semantic, lifecycle, routing, and exact-close validation.

### Security

- Trusted-base EngineeringSpec Git blobs used by `review` and `finish` no longer resolve local ProductSpec references against mutable workspace or head content. Workspace ProductSpec changes cannot authorize or alter base authority or its semantic digest.
- Ordinary explicit-root ProductSpec validation remains enabled and unchanged. RC15 introduces no EngineeringSpec contract-format or schema change.

## [0.1.0-rc.14] - 2026-08-17

### Added

- Trusted-base `engineering-spec.json` defaults for zero-flag daily commands, with workspace drift reported but ignored for authorization.
- Thin `next`, `work`, and `finish` commands composing existing status, prepare, routing, review, transition, and receipt primitives.
- Versioned semantic authority diffs, bound implementation receipts, and copy-ready pull-request metadata.
- Additive `next` fields distinguish successful analysis and lifecycle state from implementation permission.
- A documented architecture boundary keeps EngineeringSpec as portable reviewed authority while an optional Agent Control Plane owns runtime orchestration and may only restrict that authority.

### Changed

- An implementation may close its exact authorizing contract in the same pull request through `approved -> implemented` when every other normalized field is unchanged.
- `status`, directory `check`, `review`, and `prepare` can use trusted repository defaults while retaining explicit options.
- Generated adoption guidance now leads with the RC14 `next -> work -> trusted checks -> finish` journey and presents lower-level commands as advanced or CI primitives.
- The first-change tutorial and CLI reference now teach the two-PR authority model and require `finish` evidence output outside the evaluated worktree.
- `next.command` now matches every lifecycle state and emits executable `work` or `finish` commands only for a deterministic single contract.
- Prospective proposal guidance now uses explicit paths and output filenames; `--from-diff` remains strict for existing working changes.

### Security

- Head configuration and head contracts never contribute authority; configuration and verifier mappings come only from one resolved base SHA.
- Mixed close routing excludes the contract path only after exact semantic identity succeeds. Any other semantic edit fails closed.
- Specification runners remain inert. Evidence states bind the base, contract, semantic digest, and intended-change digest.
- Generated GitHub enforcement pins immutable RC14 runtime anchor `1b9fe313353584862456d607c495f4e660e3fdf3`, avoiding local CLI and CI closure-semantic drift.
- Agent Control Plane guidance now requires repository-wide deny, ambiguity, and uncovered-path semantics over the same immutable approved candidate set used by CI.

## [0.1.0-rc.13] - 2026-08-16

### Fixed

- ProductSpec local source paths now resolve from an explicit repository root, including sibling repository directories, and reject real-path escapes.
- The vulnerable development-only `nanoid` transitive dependency is locked to `3.3.18`.

### Changed

- Current CLI examples and generated guidance pin `0.1.0-rc.13`; current Action examples pin the sanitized reviewed commit `e2d485cfeeb4ce745a57293db089ff70cc4648de`.
- Release CI now audits the concrete npm publish manifest and rejects private, sensitive, unexpected, or incomplete package contents.

### Security

- RC13 is the first publishable package after the sensitive-data history rewrite and RC9-RC12 npm withdrawal. It does not assert that GitHub has garbage-collected historical objects; that remains pending Support confirmation.

## [0.1.0-rc.12] - 2026-08-12

### Added

- Repository-routing-derived `concrete-paths-v2` receipts with canonical candidate-set, routing-decision, and path-set digests
- Complete v2 provenance and paired reproducibility metadata for task stimulus, agent, harness, evaluator, immutable condition heads, timestamps, and review blinding

### Changed

- `measure` now projects one requested contract from the same complete approved-candidate routing decision used by enforcement
- Finite authority measures authority granted, including unexercised exact create paths and absent modify/interface paths, while respecting cross-contract denial and ambiguity
- Publishable v2 evidence retains denied, ambiguous, uncovered, and other-contract outcomes; affected single-contract precision is explicitly unavailable instead of excluding the run

### Security

- Candidate loading is shared, base-pinned, bounded at 10,000 documents, strict-validation aware, and runner-inert
- V1 receipts and sparse historical records remain readable but cannot qualify as RC12 publishable quantitative scope evidence
- Scope receipts remain unsigned, non-authoritative observations: they grant no implementation authority and prove neither correctness nor trusted-check execution
- Sample publishability is distinct from numeric metric eligibility; complete negative outcomes remain retained while affected precision is null
- The external pilot remains at zero retained observations, so RC12 makes no productivity, correctness, causality, adoption, or external-impact claim

## [0.1.0-rc.11] - 2026-08-12

### Added

- Deterministic, read-only `measure` receipts pinned to one exact approved base contract and committed base/head revisions
- Benchmark evidence-quality reporting and opt-in `--require-publishable` enforcement with paired time-limit, opaque reviewer, and condition-order metadata
- Explicit finite, open-create-namespace, and repository-wide authority classification plus embedded receipt consistency checks

### Changed

- `ESG006` is informational, so strict mode accepts `interface_only` path authorization while continuing to disclose that semantic interface verification is separate
- Current agent guidance, documentation, generated site, CLI examples, and adoption scaffolding use immutable RC11 identities

### Security

- Scope receipts omit individual paths by default, load authority only from immutable Git state, execute no runners or trusted checks, grant no authorization, and reject impossible counts
- Shared `prepare` and `review` rendering removes the complete Unicode Bidi_Control set and safely renders arbitrary inline-code backtick runs
- Publishability remains an evidence-completeness policy rather than a correctness, causality, or external-impact claim; the external pilot still has zero retained observations

## [0.1.0-rc.10] - 2026-08-12

### Added

- Deterministic `prepare` pre-code briefs for one explicitly identified approved base contract, with text, Markdown, and JSON output
- Clear writable, protected, and repository-read boundaries plus source intent, constraint, verifier identity, digest, and unresolved-question reporting
- Backward-compatible paired benchmark observations for contract effort, amendments, first-pass gating, review cycles, exploration breadth, unauthorized paths, and concrete-path scope precision
- Consent-aware external adopter pilot kit with an honest zero-observation status, onboarding-failure capture, sanitization rules, and negative-result publication policy

### Security

- `prepare` fails closed for missing, ambiguous, invalid, draft, proposed, implemented, superseded, or rejected authority and never exposes or executes verifier runner payloads
- Benchmark summaries retain failed, slower, amended, incomplete, and catch-all runs while preventing synthetic or uninformative authority from being presented as measured impact
- Human-facing `prepare` output strips terminal, newline, and bidirectional control characters; renders technical contracts consistently; explains `interface_only` as path-level access; and defers final path authorization to multi-contract routing

## [0.1.0-rc.9] - 2026-08-12

### Added

- Deterministic draft `propose` generation from explicit paths or the complete local Git state
- Base-pinned `review` reports in text, Markdown, JSON, and GitHub job summaries without runner payloads
- Dry-run-first `adopt --quickstart` scaffolding with a draft contract, CODEOWNERS, immutable CI, and neutral agent handoffs
- Thin Codex, Claude Code, Cursor, GitHub Copilot, and generic integrations over one portable workflow
- A credential-free demo that fails an uncovered change and passes it only after separate base approval
- Evidence-first launch, case-study, and paired-pilot guidance without unmeasured outcome claims

### Security

- Proposals remain drafts, immutable base contracts remain the sole implementation authority, and GitHub summaries require no pull-request write permission
- Review, integration, and demo surfaces keep specification runners inert and omit secret-bearing runner command payloads

## [0.1.0-rc.8] - 2026-08-11

### Added

- Offline CLI/Action/guidance version-health diagnostics and bounded managed integration upgrades
- Validated lifecycle status transition previews with explicit write mode and no Git side effects
- Deterministic contract catalogue/search JSON, generated static Explorer, and repository path-impact filtering
- Read-only Backstage component adapter with owners, dependencies, standards, explicit path mappings, and provenance
- Role-based CLI, integration, upgrade, and architecture-bridge documentation plus Open Graph assets

### Changed

- Mixed specification and implementation changes now include split-change remediation while retaining normal fail-closed routing
- The portable Agent Skill and generated guidance include catalogue discovery and safe lifecycle closure
- Current CLI examples, managed adoption guidance, Agent Skill, and production Action examples use immutable RC8 identities

### Security

- Catalogue and agent-facing output omit verifier command payloads; architecture imports always declare read-only authority and never participate in routing

## [0.1.0-rc.7] - 2026-08-10

### Added

- Explicit `--allow-contract-only` classification for directory `select`, `check`, and `status`, with strict workspace validation and lifecycle-only closure reporting
- Opt-in `gate-allow-contract-only` Action policy and generated adopter configuration
- Governance conformance vectors for mixed changes, prefix confusion, empty state, nested specs, and cross-boundary renames

### Security

- Workspace contracts remain non-authoritative; mixed spec-and-code changes, invalid workspace specs, unsafe paths, and cross-boundary renames retain normal fail-closed approved-base routing

### Changed

- Current CLI examples, generated adoption guidance, Agent Skill, and production Action examples now use immutable RC7 identities
- private consumer dogfood established that a completed lifecycle-only contract transition passes as `contract_only` without selecting implementation authority

## [0.1.0-rc.6] - 2026-08-10

### Added

- Read-only `doctor` diagnostics for Git, trusted base, specification validation, lifecycle counts, neutral agent guidance, and enforcing CI readiness
- Read-only `status` summaries for base-pinned routing, complete working state, selected contracts/targets, coverage, and the safest lifecycle action
- Guided `explore -> propose -> approve -> implement -> verify -> close` onboarding, role, maintenance, and troubleshooting documentation

### Changed

- Repository instructions and the portable Agent Skill now present one agent-neutral lifecycle while preserving contract-only approval and inert specification runners
- Generated adoption guidance includes the six lifecycle stages plus read-only `doctor` and `status`; production examples pin the reviewed intuitive-workflow merge
- Repository PR enforcement uses approved-only directory routing as its single authorization decision while retaining compatible single-spec Action inputs

## [0.1.0-rc.5] - 2026-08-09

### Changed

- Clean multi-spec checks now succeed as `not_applicable` after all contracts close, while every non-empty change without an approved contract still fails with `ESRT001`
- Repository CI recognizes strictly validated RFC/spec-only governance changes without allowing mixed implementation diffs to self-authorize
- Adoption scaffolds, documentation, and the packaged Agent Skill use immutable RC5 CLI and Action versions

## [0.1.0-rc.4] - 2026-08-09

### Changed

- `adopt` generates base-pinned agent context, exact-version CLI commands, and enforcing CI that requires an `approved` contract
- `adopt` detects `origin/HEAD`, accepts `--base`, and can merge managed AGENTS/Claude guidance without overwriting structured integration files
- Project CI includes `package-lock.json` changes when deciding whether to run the diff-scope gate
- Generated agent and CI scaffolds use base-pinned, approved-only directory routing with immutable RC4 CLI and Action versions

### Added

- Deterministic `select` routing over base-pinned approved EngineeringSpec directories
- Multi-spec `check --spec-dir` with aggregate declared coverage and complete-worktree routing
- `gate-spec-dir` Action input with strict approved-only selection by default
- Stable `ESRT001`–`ESRT005` routing diagnostics and cross-contract deny-wins conformance vectors

## [0.1.0-rc.3] - 2026-08-09

### Changed

- `gate --strict` fails on validation warnings from the loaded contract (not only gate-produced warnings)
- Coverage treats `policy` / `review` enforcement as declared coverage; advisory `should_not` excluded like `should`
- Agent workflow docs use the complete-working-state `check` self-check in AGENTS.md / agent integration / Cursor rule
- Canonical JSON key order uses Unicode code-point comparison (not `localeCompare` or UTF-16 code-unit `<`)
- Target globs reject `..` segments and backslashes in addition to negation/extglob/braces/classes (`ESPTH002`)
- `inspect` fully validates by default (`--parse-only` for debugging); `coverage` refuses invalid specs before reporting
- Production Action examples pin the reviewed agent-first merge `cecc34d…`; CI always enforces `--spec-from base`, requires two-phase contract evolution, and supports `merge_group`
- Action exposes `gate-receipt` input
- Gate resolves base/head SHAs once before loading the contract and collecting the diff
- Gate defaults `--spec-from base` when `--base` is set
- Typed reference validation (`ESR008`) for target/verifier/contract/constraint edges
- Restricted target glob dialect (`ESPTH002`); matching uses nobrace/noext/nonegate
- CLI `--version` reads `package.json`
- Enforcement and runner kinds are field-complete in schema + semantics
- Docs clarify `interface_only` as a path-writable label (`ESG006`)

### Added

- `ESP009` — reject conflicting snake_case/camelCase key spellings (fail closed)
- `ESP010` — reject invalid UTF-8 without reusing the key-collision diagnostic
- Worktree-aware `gate --worktree` / `--staged` collection, including committed, staged, unstaged, deleted, renamed, and untracked paths
- Read-only, base-pinnable `check`, `context`, and `explain` agent workflows; agent context omits runner command payloads
- Safe `adopt` scaffolding for AGENTS.md, Claude, Cursor, and merge-queue-aware GitHub CI
- Portable `skills/engineering-spec` Agent Skill and paired agent-impact benchmark format/summarizer
- Mixed-case key ordering unit coverage for canonicalization
- Adversarial gate tests; `--receipt` durable unsigned `gate-receipt.json`
- Conformance fixtures for incomplete enforcement/runners, forbidden/parent-segment globs, typed-ref mismatches

## [0.1.0-rc.2] - 2026-08-08

### Changed

- **Gate trust hardening (diff-scope gate)**
  - Deny-overrides: any matching `read_only`/`observe` target rejects the path (`ESG003`), even when a broader writable target also matches
  - `--spec-from workspace|base` (Action `gate-spec-from`, default `base`) loads the contract from `git show base:path` to prevent PR self-widening
  - `--require-status` / Action `gate-require-status` for enforcing mode (`ESG005`)
  - Null-delimited `git diff -z --name-status` with fail-closed unknown/malformed status handling (`ESG004`)
  - `interface_only` remains path-scoped and emits warning `ESG006`
  - Gate JSON/text reports bind spec digest, optional base/head SHAs, and changed-file digest
- Validate warns (`ESR007`) on likely overlapping incompatible target globs
- Docs: describe the feature as a diff-scope gate; recommend Action SHA pins and required checks; document npm `@next`

### Added

- [docs/production-gate.md](docs/production-gate.md) — SHA pin, required checks, CODEOWNERS pilot recipe
- `.github/CODEOWNERS` and [examples/adopters/CODEOWNERS.example](examples/adopters/CODEOWNERS.example)
- Concrete Action pin (at rc.2): `479d77818669db8a32c515ebfa2a0bb01ca51afb` — superseded in Unreleased by Sprint 4 tip

## [0.1.0-rc.1] - 2026-08-07

### Added

- EngineeringSpec 0.1 draft format, JSON Schema, and reference CLI (`init`, `validate`, `normalize`, `inspect`, `coverage`)
- Recursive directory validation and `.engineeringspecignore`
- GitHub Action with workflow annotations and job summary
- **`gate`** — fail-closed diff check against declared targets (`ESG001`–`ESG003`)
- Action inputs `gate-spec`, `gate-base`, and `gate-head` for adopters (no hand-rolled shell required)
- Agent starters (`AGENTS.md`, Claude/Cursor guidance) and adoption handoff
- Public site at [engineeringspec.org](https://engineeringspec.org) with versioned schema URLs

### Notes

- Validation never executes verification runners; command runners must use `argv` arrays
- `gate` is reference CI tooling (separate trust boundary from parse/validate)
