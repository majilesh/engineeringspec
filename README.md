# EngineeringSpec

[![CI](https://github.com/majilesh/engineeringspec/actions/workflows/ci.yml/badge.svg)](https://github.com/majilesh/engineeringspec/actions/workflows/ci.yml)
[![Specification](https://img.shields.io/badge/spec-0.1%20draft-3974d8)](https://engineeringspec.org/spec/0.1/)

EngineeringSpec is the open change-control layer for AI coding agents, powered by an open, agent-neutral format for versioned engineering change contracts. It connects source intent to affected technical surfaces, authoritative contracts, enforceable constraints, verification obligations, rollout controls, and implementation evidence.

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
  path: docs/product/ticket-triage.product-spec.md
  revision: 3
  item_ids: [AC-1, EVAL-1]
```

Local source paths are repository-relative. The CLI discovers the current Git root automatically; use `validate --repository-root <path>` when validating from outside that worktree. Library callers must pass `repositoryRoot` when profile resolution is enabled. Resolved files, including symlink targets, must remain inside that root.

## Quick start

After adoption, `engineering-spec.json` supplies repository defaults from the resolved trusted base. Daily use becomes:

```sh
engineeringspec next
engineeringspec work ES-my-change
# edit only the reported writable surfaces; run repository-owned checks
engineeringspec finish ES-my-change --format markdown
engineeringspec finish ES-my-change --write-closure --output ../engineering-spec-receipt.json
```

`next` is informational: success is not authorization. An agent may implement only when `permission` is `implementation` and `work ES-my-change` successfully loads that exact approved trusted-base contract. Repository reading remains available for correctness, while writes remain limited to the returned surfaces. `finish` checks the change, emits bound evidence and PR metadata, and writes no closure unless `--write-closure` is explicit. It never stages, commits, pushes, approves, merges, or executes a runner declared inside a specification. Evidence output must be outside the evaluated Git worktree so writing the receipt cannot mutate the state whose digest was just evaluated.

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.14 adopt . --quickstart --maintainer @your-org/platform --dry-run
npx --yes @engineeringspec/cli@0.1.0-rc.14 propose --id ES-my-change --title "My change" \
  --path 'src/example/**' --output docs/engineering-specs/ES-my-change.engineering-spec.md --dry-run
npx --yes @engineeringspec/cli@0.1.0-rc.14 review --spec-dir docs/engineering-specs --base origin/main --strict --format markdown
npx --yes @engineeringspec/cli@0.1.0-rc.14 prepare ES-my-change --spec-dir docs/engineering-specs --base origin/main --strict --format markdown
npx --yes @engineeringspec/cli@0.1.0-rc.14 init --template feature --id ES-my-change
npx --yes @engineeringspec/cli@0.1.0-rc.14 validate ENGINEERING_SPEC.md
npx --yes @engineeringspec/cli@0.1.0-rc.14 validate docs/engineering-specs
npx --yes @engineeringspec/cli@0.1.0-rc.14 normalize ENGINEERING_SPEC.md --digest
npx --yes @engineeringspec/cli@0.1.0-rc.14 inspect ENGINEERING_SPEC.md --path src/example.ts
npx --yes @engineeringspec/cli@0.1.0-rc.14 coverage ENGINEERING_SPEC.md --fail-on uncovered
npx --yes @engineeringspec/cli@0.1.0-rc.14 gate ENGINEERING_SPEC.md --base origin/main --receipt gate-receipt.json
npx --yes @engineeringspec/cli@0.1.0-rc.14 check ENGINEERING_SPEC.md --base origin/main --strict
npx --yes @engineeringspec/cli@0.1.0-rc.14 context ENGINEERING_SPEC.md --path src/example.ts --base origin/main --format markdown
npx --yes @engineeringspec/cli@0.1.0-rc.14 explain ENGINEERING_SPEC.md --path src/example.ts --base origin/main
npx --yes @engineeringspec/cli@0.1.0-rc.14 catalogue docs/engineering-specs --query session --format json
```

Diagnose setup and inspect the current lifecycle with the current release candidate:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.14 doctor . --spec-dir docs/engineering-specs --base origin/main --strict
npx --yes @engineeringspec/cli@0.1.0-rc.14 status --spec-dir docs/engineering-specs --base origin/main --allow-contract-only --strict
```

For a first adoption, follow [Getting started](docs/getting-started.md) and the [first-change tutorial](docs/first-change-tutorial.md). The memorable workflow is:

```text
explore -> propose -> approve -> implement -> verify -> close
```

New authority normally uses two pull requests: one reviewed authority PR that lands `approved`, followed by one implementation PR that may include the exact `approved -> implemented` close.

Exploration and proposal grant no authority. Merge the contract-only approval first; dependent code changes then route against that approved base. Before editing, `prepare` loads one explicitly named approved contract from the immutable base and presents its writable surfaces, read boundary, technical contracts, obligations, verifier identities, source intent, digests, and unresolved questions. It does not infer scope, expose runner payloads, or edit files. `interface_only` remains path-level access, and final authorization for actual paths remains subject to multi-contract routing. `doctor` diagnoses the repository setup, while `status` reports lifecycle counts, complete working-state routing, declared coverage, and the safest next stage.

The multi-spec router can be exercised from a built checkout:

```sh
node dist/cli.js select docs/engineering-specs --base origin/main --worktree --allow-contract-only --strict
node dist/cli.js check --spec-dir docs/engineering-specs --base origin/main --allow-contract-only --strict
```

Directory routing enumerates candidates from one resolved base tree, validates them before filtering, considers `approved` contracts by default, and requires every changed path to have exactly one allowing contract. Uncovered paths, ambiguous allows, duplicate IDs, and any matching denial fail closed. RC4 exposes the corresponding `gate-spec-dir` Action input and generated adoption scaffolds use it by default.

A successfully inspected state with zero changed paths is reported as successful and `not_applicable`, even when all historical contracts are closed. This authorizes nothing: as soon as any path changes, the normal approved-contract requirement and fail-closed routing apply.

The additive `--allow-contract-only` policy classifies a non-empty change as governance only when every old and new path remains under the configured specification directory and workspace specs validate strictly. It reports `contract_only` without claiming selection by a base contract. A mixed implementation may include only an exact `approved -> implemented` close of its base-authorizing contract; the head document cannot widen or contribute authority. Other mixed changes, cross-boundary renames, invalid specs, and unsafe paths fail closed. Keep the authority lane reviewer-owned with CODEOWNERS and required checks.

Directory validation discovers `ENGINEERING_SPEC.md`, `*.engineering-spec.md`, and `*.engineeringspec.md` recursively. Add repository-relative glob patterns to `.engineeringspecignore` to exclude generated content or intentionally invalid fixtures.

## Diff-scope gate

`gate` is a **diff-scope gate**: it compares a git diff (or explicit `--changed` paths) to declared targets and `change_policy` values. It does **not** prove constraints, run verifiers, or inspect file contents. Out-of-scope files, `read_only`/`observe` matches (deny-overrides), and policy mismatches fail with `ESG001`–`ESG003`. Unknown git statuses fail with `ESG004`. Optional `--require-status approved` fails drafts with `ESG005`. `interface_only` is a path-writable label (informational `ESG006`), not AST/API enforcement—pair it with a separately trusted OpenAPI/schema adapter.

```sh
# Enforcing CI: load the approved contract from the base branch (prevents PR self-widening)
npx --yes @engineeringspec/cli@0.1.0-rc.14 gate docs/engineering-specs/ES-my-change.engineering-spec.md \
  --base origin/main --require-status approved --receipt gate-receipt.json

# Local / CI smoke without git history
npx --yes @engineeringspec/cli@0.1.0-rc.14 gate docs/engineering-specs/ES-my-change.engineering-spec.md --changed src/api.ts
```

Use one EngineeringSpec per consequential change, protect `docs/engineering-specs/**` with CODEOWNERS, and configure the gate job as a **required** status check so failures block merge. Full checklist: [Production diff-scope gate](docs/production-gate.md).

## GitHub Action

Pin the Action to a full commit SHA for production (mutable `@main` is only for quick trials):

```yaml
steps:
  - uses: actions/checkout@v4
    with:
      fetch-depth: 0
  - uses: majilesh/engineeringspec@1b9fe313353584862456d607c495f4e660e3fdf3
    with:
      path: docs/engineering-specs
      strict: true
      gate-spec-dir: docs/engineering-specs
      gate-allow-contract-only: true
      gate-base: origin/main
      gate-require-status: approved # enforcing mode
```

The action validates specs and, when `gate-spec-dir` is set, routes implementation diffs against approved candidates loaded from `gate-base`. It also writes the deterministic base-pinned review report to the GitHub job summary; it does not edit pull requests and needs no write permission. `gate-allow-contract-only` explicitly accepts only strictly valid EngineeringSpec-only governance diffs; it is incompatible with `gate-spec` and never authorizes mixed implementation changes. The compatible `gate-spec` input remains available for single-spec gates and receipts. It never executes declared verification runners. Use `fetch-depth: 0` so the base ref exists. If you use merge queues, add a `merge_group` trigger on the workflow that runs this Action.

After tagging, `majilesh/engineeringspec@v0.1.0-rc.14` is acceptable for less sensitive repos; SHA pins remain preferred. See [production-gate.md](docs/production-gate.md) for required checks and CODEOWNERS.

```sh
# CLI (exact release-candidate version; npm dist-tag `next` points at the current release candidate)
npx --yes @engineeringspec/cli@0.1.0-rc.14 validate docs/engineering-specs
```

## Coding agents

Use [AGENTS.md](AGENTS.md) as the shared workflow for Codex and other compatible agents. [CLAUDE.md](CLAUDE.md) imports the same guidance for Claude Code, and the checked-in [Cursor rule](.cursor/rules/engineering-spec.mdc) applies it in Cursor. See [Agent integration](docs/agent-integration.md) for a reusable setup and prompt.

The normal pre-code command is `work <contract-id>`: it composes the exact base-pinned preparation brief and fails closed unless that contract is uniquely approved. The normal completion command is `finish <contract-id>`, which composes complete-state checking, review, receipt, and optional exact closure. `prepare`, `check`, `context`, `explain`, and the other deterministic primitives remain available for CI, debugging, and advanced inspection. None execute declared runners.

Bootstrap an existing repository without overwriting its agent files by default:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.14 adopt . \
  --spec docs/engineering-specs/ES-my-change.engineering-spec.md \
  --merge --dry-run
```

`adopt` detects the default branch from `origin/HEAD` (falling back to `origin/main`); override it with `--base`. Review the dry-run, then rerun without `--dry-run`. Generated agent commands pin the current CLI version, context is loaded from the approved base, and generated enforcing CI requires an `approved` contract. Merge mode updates AGENTS.md and the Claude import without replacing existing content. `--upgrade` may additionally update one recognisable immutable Action pin; ambiguous structured files remain untouched.

The portable [EngineeringSpec skill](skills/engineering-spec/SKILL.md) is the primary integration for skill-aware agents. The generated AGENTS.md, Claude import, and Cursor rule cover file-instruction agents without putting vendor behavior in the format. A plugin or MCP server is not required for the core workflow; add thin adapters only when real usage shows discovery or transport friction.

Thin setup notes are available for [Codex](integrations/codex/README.md), [Claude Code](integrations/claude/README.md), [Cursor](integrations/cursor/README.md), [GitHub Copilot](integrations/copilot/README.md), and [generic agents](integrations/generic/README.md). All use the same CLI decision; none can approve or widen a contract. Run the [local fail-closed demo](examples/demo/README.md) with `npm run demo`.

Measure the effect rather than assuming it: [the agent-impact benchmark](benchmarks/README.md) retains paired success, failures, routing outcomes, eligible scope precision, review effort, amendments, exploration breadth, duration, and tokens. `measure` generates an unsigned v2 receipt from the same repository-wide approved-base routing decision used by enforcement; negative outcomes remain visible, while paths stay private by default. The receipt grants no authority and proves neither correctness nor trusted-check success. Synthetic examples are never presented as observed impact.

Private repositories are supported: the CLI and Action operate on the checked-out Git tree and do not upload specification or source content. Normal package installation and GitHub Actions still use their configured package/network access. See the [CLI reference](docs/cli-reference.md), [coding-agent integrations](docs/integrations.md), [architecture bridge](docs/architecture-bridge.md), [Agent Control Plane boundary](docs/agent-control-plane.md), [upgrade guide](docs/upgrading.md), [roles and responsibilities](docs/roles-and-responsibilities.md), [lifecycle](docs/lifecycle.md), [maintaining specs](docs/maintaining-specs.md), and [troubleshooting](docs/troubleshooting.md).

Specifications are untrusted input. Declared commands are inert data: validation never executes them. See [engineeringspec.org](https://engineeringspec.org), [SECURITY.md](SECURITY.md), [SPEC.md](SPEC.md), and [CONTRIBUTING.md](CONTRIBUTING.md).

## Status

The parser, schema, semantic validator, normalizer, query API, ProductSpec profile, CLI, conformance fixtures, fail-closed **diff gate**, agent self-check loop, adoption scaffold, portable skill, deterministic catalogue, static Explorer, and read-only architecture map form the v0.1 release candidate. A read-only MCP adapter remains deliberately deferred until measured adoption friction warrants another transport.
