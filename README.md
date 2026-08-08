# EngineeringSpec

[![CI](https://github.com/majilesh/engineeringspec/actions/workflows/ci.yml/badge.svg)](https://github.com/majilesh/engineeringspec/actions/workflows/ci.yml)
[![Specification](https://img.shields.io/badge/spec-0.1%20draft-3974d8)](https://engineeringspec.org/spec/0.1/)

EngineeringSpec is an open, agent-neutral format for versioned engineering change contracts. It connects source intent to affected technical surfaces, authoritative contracts, enforceable constraints, verification obligations, rollout controls, and implementation evidence.

This repository contains a **draft open specification and reference implementation**. It is not a project planner, agent runtime, test runner, policy engine, or replacement for ProductSpec, AGENTS.md, ADRs, OpenAPI, AsyncAPI, JSON Schema, Protocol Buffers, SARIF, OPA, SLSA, or in-toto.

EngineeringSpec gives coding agents, CI, and reviewers the same scoped obligations and traceability graph. Deterministic validation is possible where a contract or adapter exists; the format does not claim to guarantee correct code or infer all architecture drift.

## Minimal example

````markdown
---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-session-fix
title: Preserve session validity
status: draft
owners: [{ team: identity }]
---

```engineering-source-refs
- id: SRC-1
  type: github_issue
  ref: acme/app#42
```

```engineering-targets
- id: TARGET-1
  paths: [src/session/**]
  change_policy: modify
```

```engineering-constraints
- id: CON-1
  level: must
  statement: Existing refresh tokens remain valid.
  enforcement: { kind: test, verifier_ref: VER-1 }
```

```engineering-verification
- id: VER-1
  proves: [CON-1]
  kind: test
  runner: { type: reference, reference: session integration suite }
```
````

ProductSpec is optional. Enable its profile in frontmatter and reference durable product IDs without copying their content:

```yaml
profiles: [{ name: productspec, version: "0.1" }]
```

```yaml
- id: SRC-1
  type: productspec
  path: ../product/ticket-triage.product-spec.md
  revision: 3
  item_ids: [AC-1, EVAL-1]
```

## Quick start

```sh
npx @engineeringspec/cli@next init --template feature --id ES-my-change
npx @engineeringspec/cli@next validate ENGINEERING_SPEC.md
npx @engineeringspec/cli@next validate docs/engineering-specs
npx @engineeringspec/cli@next normalize ENGINEERING_SPEC.md --digest
npx @engineeringspec/cli@next inspect ENGINEERING_SPEC.md --path src/example.ts
npx @engineeringspec/cli@next coverage ENGINEERING_SPEC.md --fail-on uncovered
npx @engineeringspec/cli@next gate ENGINEERING_SPEC.md --base origin/main --receipt gate-receipt.json
```

Directory validation discovers `ENGINEERING_SPEC.md`, `*.engineering-spec.md`, and `*.engineeringspec.md` recursively. Add repository-relative glob patterns to `.engineeringspecignore` to exclude generated content or intentionally invalid fixtures.

## Diff-scope gate

`gate` is a **diff-scope gate**: it compares a git diff (or explicit `--changed` paths) to declared targets and `change_policy` values. It does **not** prove constraints, run verifiers, or inspect file contents. Out-of-scope files, `read_only`/`observe` matches (deny-overrides), and policy mismatches fail with `ESG001`–`ESG003`. Unknown git statuses fail with `ESG004`. Optional `--require-status approved` fails drafts with `ESG005`. `interface_only` is a path-writable label (warning `ESG006`), not AST/API enforcement—pair it with an OpenAPI/schema adapter.

```sh
# Enforcing CI: load the approved contract from the base branch (prevents PR self-widening)
npx @engineeringspec/cli@next gate docs/engineering-specs/ES-my-change.engineering-spec.md \
  --base origin/main --require-status approved --receipt gate-receipt.json

# Local / CI smoke without git history
npx @engineeringspec/cli@next gate docs/engineering-specs/ES-my-change.engineering-spec.md --changed src/api.ts
```

Use one EngineeringSpec per consequential change, protect `docs/engineering-specs/**` with CODEOWNERS, and configure the gate job as a **required** status check so failures block merge. Full checklist: [Production diff-scope gate](docs/production-gate.md).

## GitHub Action

Pin the Action to a full commit SHA for production (mutable `@main` is only for quick trials):

```yaml
steps:
  - uses: actions/checkout@v4
    with:
      fetch-depth: 0
  - uses: majilesh/engineeringspec@479d77818669db8a32c515ebfa2a0bb01ca51afb
    with:
      path: docs/engineering-specs
      strict: true
      gate-spec: docs/engineering-specs/ES-my-change.engineering-spec.md
      gate-base: origin/main
      gate-spec-from: base          # default; do not use workspace for enforcing CI
      gate-require-status: approved # enforcing mode
```

The action validates specs (annotations + job summary) and, when `gate-spec` is set, runs `gate` against `gate-base`…`gate-head`. It never executes declared verification runners. Use `fetch-depth: 0` so the base ref exists.

After tagging, `majilesh/engineeringspec@v0.1.0-rc.2` is acceptable for less sensitive repos; SHA pins remain preferred. See [production-gate.md](docs/production-gate.md) for required checks and CODEOWNERS.

```sh
# CLI (npm dist-tag next)
npx @engineeringspec/cli@next validate docs/engineering-specs
```

## Coding agents

Use [AGENTS.md](AGENTS.md) as the shared workflow for Codex and other compatible agents. [CLAUDE.md](CLAUDE.md) imports the same guidance for Claude Code, and the checked-in [Cursor rule](.cursor/rules/engineering-spec.mdc) applies it in Cursor. See [Agent integration](docs/agent-integration.md) for a reusable setup and prompt.

Specifications are untrusted input. Declared commands are inert data: validation never executes them. See [engineeringspec.org](https://engineeringspec.org), [SECURITY.md](SECURITY.md), [SPEC.md](SPEC.md), [maintainer-only roadmap](maintainer-only roadmap), and [CONTRIBUTING.md](CONTRIBUTING.md).

## Status

The parser, schema, semantic validator, normalizer, query API, ProductSpec profile, CLI, conformance fixtures, and fail-closed **diff gate** form the v0.1 release candidate. A read-only MCP adapter remains deliberately deferred until the file format is stable.
