# Changelog

All notable changes to this project are documented here.

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
- npm package `@engineeringspec/cli` publish is pending for this RC; use the GitHub Action or build from source
