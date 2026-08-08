# Changelog

All notable changes to this project are documented here.

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
- Concrete Action pin: `479d77818669db8a32c515ebfa2a0bb01ca51afb` (PR #4 trust hardening)

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
