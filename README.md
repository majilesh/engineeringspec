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
npx --yes @engineeringspec/cli@0.1.0-rc.8 adopt . --quickstart --maintainer @your-org/platform --dry-run
npx --yes @engineeringspec/cli@0.1.0-rc.8 propose --id ES-my-change --title "My change" --from-diff --base origin/main --dry-run
npx --yes @engineeringspec/cli@0.1.0-rc.8 review --spec-dir docs/engineering-specs --base origin/main --strict --format markdown
npx --yes @engineeringspec/cli@0.1.0-rc.8 init --template feature --id ES-my-change
npx --yes @engineeringspec/cli@0.1.0-rc.8 validate ENGINEERING_SPEC.md
npx --yes @engineeringspec/cli@0.1.0-rc.8 validate docs/engineering-specs
npx --yes @engineeringspec/cli@0.1.0-rc.8 normalize ENGINEERING_SPEC.md --digest
npx --yes @engineeringspec/cli@0.1.0-rc.8 inspect ENGINEERING_SPEC.md --path src/example.ts
npx --yes @engineeringspec/cli@0.1.0-rc.8 coverage ENGINEERING_SPEC.md --fail-on uncovered
npx --yes @engineeringspec/cli@0.1.0-rc.8 gate ENGINEERING_SPEC.md --base origin/main --receipt gate-receipt.json
npx --yes @engineeringspec/cli@0.1.0-rc.8 check ENGINEERING_SPEC.md --base origin/main --strict
npx --yes @engineeringspec/cli@0.1.0-rc.8 context ENGINEERING_SPEC.md --path src/example.ts --base origin/main --format markdown
npx --yes @engineeringspec/cli@0.1.0-rc.8 explain ENGINEERING_SPEC.md --path src/example.ts --base origin/main
npx --yes @engineeringspec/cli@0.1.0-rc.8 catalogue docs/engineering-specs --query session --format json
```

Diagnose setup and inspect the current lifecycle with RC7:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.8 doctor . --spec-dir docs/engineering-specs --base origin/main --strict
npx --yes @engineeringspec/cli@0.1.0-rc.8 status --spec-dir docs/engineering-specs --base origin/main --allow-contract-only --strict
```

For a first adoption, follow [Getting started](docs/getting-started.md) and the [first-change tutorial](docs/first-change-tutorial.md). The memorable workflow is:

```text
explore -> propose -> approve -> implement -> verify -> close
```

Exploration and proposal grant no authority. Merge the contract-only approval first; dependent code changes then route against that approved base. `doctor` diagnoses the repository setup, while `status` reports lifecycle counts, complete working-state routing, declared coverage, and the safest next stage. Both are read-only and never execute declared verification runners.

The multi-spec router can be exercised from a built checkout:

```sh
node dist/cli.js select docs/engineering-specs --base origin/main --worktree --allow-contract-only --strict
node dist/cli.js check --spec-dir docs/engineering-specs --base origin/main --allow-contract-only --strict
```

Directory routing enumerates candidates from one resolved base tree, validates them before filtering, considers `approved` contracts by default, and requires every changed path to have exactly one allowing contract. Uncovered paths, ambiguous allows, duplicate IDs, and any matching denial fail closed. RC4 exposes the corresponding `gate-spec-dir` Action input and generated adoption scaffolds use it by default.

A successfully inspected state with zero changed paths is reported as successful and `not_applicable`, even when all historical contracts are closed. This authorizes nothing: as soon as any path changes, the normal approved-contract requirement and fail-closed routing apply.

The additive `--allow-contract-only` policy classifies a non-empty change as governance only when every old and new path remains under the configured specification directory and workspace specs validate strictly. It reports `contract_only` without claiming selection by a base contract. Mixed changes, cross-boundary renames, invalid specs, and unsafe paths retain normal fail-closed routing. Keep this lane reviewer-owned with CODEOWNERS and required checks.

Directory validation discovers `ENGINEERING_SPEC.md`, `*.engineering-spec.md`, and `*.engineeringspec.md` recursively. Add repository-relative glob patterns to `.engineeringspecignore` to exclude generated content or intentionally invalid fixtures.

## Diff-scope gate

`gate` is a **diff-scope gate**: it compares a git diff (or explicit `--changed` paths) to declared targets and `change_policy` values. It does **not** prove constraints, run verifiers, or inspect file contents. Out-of-scope files, `read_only`/`observe` matches (deny-overrides), and policy mismatches fail with `ESG001`–`ESG003`. Unknown git statuses fail with `ESG004`. Optional `--require-status approved` fails drafts with `ESG005`. `interface_only` is a path-writable label (warning `ESG006`), not AST/API enforcement—pair it with an OpenAPI/schema adapter.

```sh
# Enforcing CI: load the approved contract from the base branch (prevents PR self-widening)
npx --yes @engineeringspec/cli@0.1.0-rc.8 gate docs/engineering-specs/ES-my-change.engineering-spec.md \
  --base origin/main --require-status approved --receipt gate-receipt.json

# Local / CI smoke without git history
npx --yes @engineeringspec/cli@0.1.0-rc.8 gate docs/engineering-specs/ES-my-change.engineering-spec.md --changed src/api.ts
```

Use one EngineeringSpec per consequential change, protect `docs/engineering-specs/**` with CODEOWNERS, and configure the gate job as a **required** status check so failures block merge. Full checklist: [Production diff-scope gate](docs/production-gate.md).

## GitHub Action

Pin the Action to a full commit SHA for production (mutable `@main` is only for quick trials):

```yaml
steps:
  - uses: actions/checkout@v4
    with:
      fetch-depth: 0
  - uses: majilesh/engineeringspec@39d5f66212a1ea883cca0a599709b9dcd59c064a
    with:
      path: docs/engineering-specs
      strict: true
      gate-spec-dir: docs/engineering-specs
      gate-allow-contract-only: true
      gate-base: origin/main
      gate-require-status: approved # enforcing mode
```

The action validates specs and, when `gate-spec-dir` is set, routes implementation diffs against approved candidates loaded from `gate-base`. It also writes the deterministic base-pinned review report to the GitHub job summary; it does not edit pull requests and needs no write permission. `gate-allow-contract-only` explicitly accepts only strictly valid EngineeringSpec-only governance diffs; it is incompatible with `gate-spec` and never authorizes mixed implementation changes. The compatible `gate-spec` input remains available for single-spec gates and receipts. It never executes declared verification runners. Use `fetch-depth: 0` so the base ref exists. If you use merge queues, add a `merge_group` trigger on the workflow that runs this Action.

After tagging, `majilesh/engineeringspec@v0.1.0-rc.8` is acceptable for less sensitive repos; SHA pins remain preferred. See [production-gate.md](docs/production-gate.md) for required checks and CODEOWNERS.

```sh
# CLI (exact RC7 version; npm dist-tag `next` points at the current release candidate)
npx --yes @engineeringspec/cli@0.1.0-rc.8 validate docs/engineering-specs
```

## Coding agents

Use [AGENTS.md](AGENTS.md) as the shared workflow for Codex and other compatible agents. [CLAUDE.md](CLAUDE.md) imports the same guidance for Claude Code, and the checked-in [Cursor rule](.cursor/rules/engineering-spec.mdc) applies it in Cursor. See [Agent integration](docs/agent-integration.md) for a reusable setup and prompt.

`check` is the agent pre-completion command: it evaluates committed, staged, unstaged, deleted, renamed, and non-ignored untracked paths and defaults to the approved base contract when `--base` is provided. `context` returns the smallest relevant target/constraint/contract/verification set for paths; `explain` gives a deterministic allow/deny reason. None of these commands execute declared runners.

Bootstrap an existing repository without overwriting its agent files by default:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.8 adopt . \
  --spec docs/engineering-specs/ES-my-change.engineering-spec.md \
  --merge --dry-run
```

`adopt` detects the default branch from `origin/HEAD` (falling back to `origin/main`); override it with `--base`. Review the dry-run, then rerun without `--dry-run`. Generated agent commands pin the current CLI version, context is loaded from the approved base, and generated enforcing CI requires an `approved` contract. Merge mode updates AGENTS.md and the Claude import without replacing existing content. `--upgrade` may additionally update one recognisable immutable Action pin; ambiguous structured files remain untouched.

The portable [EngineeringSpec skill](skills/engineering-spec/SKILL.md) is the primary integration for skill-aware agents. The generated AGENTS.md, Claude import, and Cursor rule cover file-instruction agents without putting vendor behavior in the format. A plugin or MCP server is not required for the core workflow; add thin adapters only when real usage shows discovery or transport friction.

Thin setup notes are available for [Codex](integrations/codex/README.md), [Claude Code](integrations/claude/README.md), [Cursor](integrations/cursor/README.md), [GitHub Copilot](integrations/copilot/README.md), and [generic agents](integrations/generic/README.md). All use the same CLI decision; none can approve or widen a contract. Run the [local fail-closed demo](examples/demo/README.md) with `npm run demo`.

Measure the effect rather than assuming it: [the agent-impact benchmark](benchmarks/README.md) compares paired tasks on success, scope violations, review corrections, duration, and tokens.

Private repositories are supported: the CLI and Action operate on the checked-out Git tree and do not upload specification or source content. Normal package installation and GitHub Actions still use their configured package/network access. See the [CLI reference](docs/cli-reference.md), [coding-agent integrations](docs/integrations.md), [architecture bridge](docs/architecture-bridge.md), [upgrade guide](docs/upgrading.md), [roles and responsibilities](docs/roles-and-responsibilities.md), [lifecycle](docs/lifecycle.md), [maintaining specs](docs/maintaining-specs.md), and [troubleshooting](docs/troubleshooting.md).

Specifications are untrusted input. Declared commands are inert data: validation never executes them. See [engineeringspec.org](https://engineeringspec.org), [SECURITY.md](SECURITY.md), [SPEC.md](SPEC.md), [maintainer-only roadmap](maintainer-only roadmap), and [CONTRIBUTING.md](CONTRIBUTING.md).

## Status

The parser, schema, semantic validator, normalizer, query API, ProductSpec profile, CLI, conformance fixtures, fail-closed **diff gate**, agent self-check loop, adoption scaffold, portable skill, deterministic catalogue, static Explorer, and read-only architecture map form the v0.1 release candidate. A read-only MCP adapter remains deliberately deferred until measured adoption friction warrants another transport.
