# Changelog

All notable changes to this project are documented here.

## [Unreleased]

### Changed

- `gate --strict` fails on validation warnings from the loaded contract (not only gate-produced warnings)
- Coverage treats `policy` / `review` enforcement as declared coverage; advisory `should_not` excluded like `should`
- Docs: mid-task `gate` self-check in AGENTS.md / agent integration / Cursor rule
- Canonical JSON key order uses Unicode code-point comparison (not `localeCompare` or UTF-16 code-unit `<`)
- Target globs reject `..` segments and backslashes in addition to negation/extglob/braces/classes (`ESPTH002`)
- `inspect` fully validates by default (`--parse-only` for debugging); `coverage` refuses invalid specs before reporting
- Docs Action pin bumped to `4110e47…` (credibility cluster + code-point canonicalization tip); CI dogfoods `--spec-from base` (workspace only when evolving the dogfood contract) and supports `merge_group`
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
