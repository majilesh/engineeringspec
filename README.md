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
npx @engineeringspec/cli@next check ENGINEERING_SPEC.md --base origin/main --strict
npx @engineeringspec/cli@next context ENGINEERING_SPEC.md --path src/example.ts --base origin/main --format markdown
npx @engineeringspec/cli@next explain ENGINEERING_SPEC.md --path src/example.ts --base origin/main
```

The multi-spec router can be exercised from a built checkout:

```sh
node dist/cli.js select docs/engineering-specs --base origin/main --worktree --strict
node dist/cli.js check --spec-dir docs/engineering-specs --base origin/main --strict
```

Directory routing enumerates candidates from one resolved base tree, validates them before filtering, considers `approved` contracts by default, and requires every changed path to have exactly one allowing contract. Uncovered paths, ambiguous allows, duplicate IDs, and any matching denial fail closed. RC4 exposes the corresponding `gate-spec-dir` Action input and generated adoption scaffolds use it by default.

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
  - uses: majilesh/engineeringspec@da9b6d7a7fabb17ec2169cdf3a4ca4278cbdeb76
    with:
      path: docs/engineering-specs
      strict: true
      gate-spec-dir: docs/engineering-specs
      gate-base: origin/main
      gate-require-status: approved # enforcing mode
```

The action validates specs and, when `gate-spec-dir` is set, routes the diff against approved candidates loaded from `gate-base`. The compatible `gate-spec` input remains available for single-spec gates and receipts. It never executes declared verification runners. Use `fetch-depth: 0` so the base ref exists. If you use merge queues, add a `merge_group` trigger on the workflow that runs this Action.

After tagging, `majilesh/engineeringspec@v0.1.0-rc.4` is acceptable for less sensitive repos; SHA pins remain preferred. See [production-gate.md](docs/production-gate.md) for required checks and CODEOWNERS.

```sh
# CLI (npm dist-tag next)
npx @engineeringspec/cli@next validate docs/engineering-specs
```

## Coding agents

Use [AGENTS.md](AGENTS.md) as the shared workflow for Codex and other compatible agents. [CLAUDE.md](CLAUDE.md) imports the same guidance for Claude Code, and the checked-in [Cursor rule](.cursor/rules/engineering-spec.mdc) applies it in Cursor. See [Agent integration](docs/agent-integration.md) for a reusable setup and prompt.

`check` is the agent pre-completion command: it evaluates committed, staged, unstaged, deleted, renamed, and non-ignored untracked paths and defaults to the approved base contract when `--base` is provided. `context` returns the smallest relevant target/constraint/contract/verification set for paths; `explain` gives a deterministic allow/deny reason. None of these commands execute declared runners.

Bootstrap an existing repository without overwriting its agent files by default:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.4 adopt . \
  --spec docs/engineering-specs/ES-my-change.engineering-spec.md \
  --merge --dry-run
```

`adopt` detects the default branch from `origin/HEAD` (falling back to `origin/main`); override it with `--base`. Review the dry-run, then rerun without `--dry-run`. Generated agent commands pin the current CLI version, context is loaded from the approved base, and generated enforcing CI requires an `approved` contract. Merge mode updates AGENTS.md and the Claude import without replacing existing content; existing structured Cursor and workflow files are skipped for manual integration.

The portable [EngineeringSpec skill](skills/engineering-spec/SKILL.md) is the primary integration for skill-aware agents. The generated AGENTS.md, Claude import, and Cursor rule cover file-instruction agents without putting vendor behavior in the format. A plugin or MCP server is not required for the core workflow; add thin adapters only when real usage shows discovery or transport friction.

Measure the effect rather than assuming it: [the agent-impact benchmark](benchmarks/README.md) compares paired tasks on success, scope violations, review corrections, duration, and tokens.

Specifications are untrusted input. Declared commands are inert data: validation never executes them. See [engineeringspec.org](https://engineeringspec.org), [SECURITY.md](SECURITY.md), [SPEC.md](SPEC.md), [maintainer-only roadmap](maintainer-only roadmap), and [CONTRIBUTING.md](CONTRIBUTING.md).

## Status

The parser, schema, semantic validator, normalizer, query API, ProductSpec profile, CLI, conformance fixtures, fail-closed **diff gate**, agent self-check loop, adoption scaffold, and portable skill form the v0.1 release candidate. A read-only MCP adapter remains deliberately deferred until measured adoption friction warrants another transport.
