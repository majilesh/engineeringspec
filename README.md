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
npx @engineeringspec/cli init --template feature --id ES-my-change
npx @engineeringspec/cli validate ENGINEERING_SPEC.md
npx @engineeringspec/cli validate docs/engineering-specs
npx @engineeringspec/cli normalize ENGINEERING_SPEC.md --digest
npx @engineeringspec/cli inspect ENGINEERING_SPEC.md --path src/example.ts
npx @engineeringspec/cli coverage ENGINEERING_SPEC.md --fail-on uncovered
npx @engineeringspec/cli gate ENGINEERING_SPEC.md --base origin/main
```

Directory validation discovers `ENGINEERING_SPEC.md`, `*.engineering-spec.md`, and `*.engineeringspec.md` recursively. Add repository-relative glob patterns to `.engineeringspecignore` to exclude generated content or intentionally invalid fixtures.

## Diff gate (fail closed)

`gate` compares a git diff (or explicit `--changed` paths) to declared targets and `change_policy` values. Out-of-scope files, `read_only`/`observe` matches, and policy mismatches fail with `ESG001`–`ESG003`. The gate does not execute verification runners.

```sh
# PR / branch vs main
npx @engineeringspec/cli gate docs/engineering-specs/ES-my-change.engineering-spec.md --base origin/main

# Local / CI smoke without git history
npx @engineeringspec/cli gate docs/engineering-specs/ES-my-change.engineering-spec.md --changed src/api.ts
```

Use one EngineeringSpec per consequential change and run `gate` on that file in CI so agents and humans cannot merge scope violations.

## GitHub Action

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: majilesh/engineeringspec@main
    with:
      path: docs/engineering-specs
      strict: true
```

The action emits source-positioned workflow annotations and writes a validation table to the job summary. It validates only; it never executes declared verification runners. Run `gate` as a separate step with the built CLI when a PR is bound to a specific EngineeringSpec.

## Coding agents

Use [AGENTS.md](AGENTS.md) as the shared workflow for Codex and other compatible agents. [CLAUDE.md](CLAUDE.md) imports the same guidance for Claude Code, and the checked-in [Cursor rule](.cursor/rules/engineering-spec.mdc) applies it in Cursor. See [Agent integration](docs/agent-integration.md) for a reusable setup and prompt.

Specifications are untrusted input. Declared commands are inert data: validation never executes them. See [engineeringspec.org](https://engineeringspec.org), [SECURITY.md](SECURITY.md), [SPEC.md](SPEC.md), [maintainer-only roadmap](maintainer-only roadmap), and [CONTRIBUTING.md](CONTRIBUTING.md).

## Status

The parser, schema, semantic validator, normalizer, query API, ProductSpec profile, CLI, conformance fixtures, and fail-closed **diff gate** form the v0.1 release candidate. A read-only MCP adapter remains deliberately deferred until the file format is stable.
