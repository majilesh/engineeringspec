# Changelog

All notable changes to this project are documented here.

## [Unreleased]

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
