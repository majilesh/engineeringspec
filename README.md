# EngineeringSpec

[![CI](https://github.com/majilesh/engineeringspec/actions/workflows/ci.yml/badge.svg)](https://github.com/majilesh/engineeringspec/actions/workflows/ci.yml)
[![Specification](https://img.shields.io/badge/spec-0.1%20draft-3974d8)](https://engineeringspec.org/spec/0.1/)

**Change authority for AI coding agents.** Review what an agent may change before it writes code. Verify the final Git diff against that authority.

EngineeringSpec uses a reviewed contract on the trusted Git base to grant bounded repository change authority. The authority is merged before an agent spends it, so a workspace draft cannot widen its own scope and implement against that wider scope in the same change.

```text
adopt -> propose bounded authority -> human review + merge
      -> next -> work <contract-id> -> code
      -> finish <contract-id> -> implementation PR + exact close
```

Preview adoption with the published RC16 CLI:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.16 adopt . --quickstart \
  --maintainer @YOUR_GITHUB_USER_OR_TEAM --dry-run
```

After adoption, the normal daily loop is deliberately short:

```sh
engineeringspec next
engineeringspec work ES-my-change
# edit only the returned writable surfaces; run repository-owned checks
engineeringspec finish ES-my-change --format markdown
```

Start with [Getting started](docs/getting-started.md) or the [first-change tutorial](docs/first-change-tutorial.md). When evaluation is complete, configure the [production diff-scope gate](docs/production-gate.md). Advanced commands and exact behavior live in the [CLI reference](docs/cli-reference.md) and [draft specification](SPEC.md).

## Grant before spend

The normal workflow uses two pull requests:

1. A contract-only PR is reviewed, reaches `approved`, and merges to the trusted base. That merge grants authority.
2. An implementation PR changes only approved surfaces and may include the exact `approved -> implemented` close. That PR spends and closes the authority.

`next` is informational. Implementation is permitted only when it reports `permission: implementation` and `work <contract-id>` loads that exact approved trusted-base contract. Repository reading may be broader for correctness; writing remains limited to the returned surfaces. If scope must widen, stop and merge a separately reviewed authority amendment first.

`finish` evaluates the complete Git working state, emits review/evidence data, and can write only the exact close when `--write-closure` is explicit. It never stages, commits, pushes, approves, merges, or executes a runner declared inside a specification.

When a bound receipt is needed, write it outside the evaluated worktree so the evidence file cannot mutate the state it describes:

```sh
engineeringspec finish ES-my-change --write-closure --output ../engineering-spec-receipt.json
```

Git records what changed. Agent platforms may record what the agent did. EngineeringSpec records what the change was authorized to do and evaluates whether the resulting Git diff stayed inside it.

## TRY and PRODUCTION

**TRY** previews the scaffold, teaches the lifecycle, and runs a first governed change. EngineeringSpec may remain informative or advisory while the team evaluates it.

**PRODUCTION** adds maintainer ownership over the contract directory, a required EngineeringSpec GitHub check, a trusted base, and an immutable Action pin. Advisory use does not provide the same merge enforcement.

For production, pin the Action to the reviewed immutable commit:

```yaml
steps:
  - uses: actions/checkout@v4
    with:
      fetch-depth: 0
  - uses: majilesh/engineeringspec@ddf813e4e69d9b2f9a9eb3f0f241747746021cf3
    with:
      path: docs/engineering-specs
      strict: true
      gate-spec-dir: docs/engineering-specs
      gate-allow-contract-only: true
      gate-base: origin/main
      gate-require-status: approved
```

The Action loads authority from the configured base, routes every changed path, and fails when a path is uncovered, ambiguous, or denied. Deny wins. A workspace proposal cannot contribute authority. Protect the job as a required check and protect `docs/engineering-specs/**` with CODEOWNERS. See [Production diff-scope gate](docs/production-gate.md).

## Minimal contract

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

ProductSpec is optional. Enable its profile in frontmatter and reference durable product IDs without copying their content. Local source paths are repository-relative; resolved files and symlink targets must remain inside the repository root.

## What EngineeringSpec is—and is not

EngineeringSpec governs repository change authority using approved trusted-base contracts and independently evaluates the Git diff against that authority. It is an open, agent-neutral format and reference implementation, not an agent sandbox, filesystem containment system, IDE or model router, generic command executor, or AST/API compatibility checker. `interface_only` is path-level authority, not semantic enforcement. Declared runners are inert data; run only repository-owned trusted checks.

Broad targets such as `**` create broad authority if a maintainer approves them. Skills and agent adapters are optional discovery aids; the checked-in contract and CLI decision remain authoritative. EngineeringSpec complements rather than replaces tests, OpenAPI, JSON Schema, OPA, SARIF, SLSA, and other engineering controls. It does not guarantee correct code.

## Advanced workflows

The short workflow composes deterministic lower-level primitives for validation, diagnosis, CI, and integration. Their complete options are documented in the [CLI reference](docs/cli-reference.md):

- `doctor` and `status` diagnose adoption and lifecycle state.
- `prepare`, `review`, `select`, and `check` expose base-pinned routing and complete-state checks.
- `context` and `explain` inspect obligations and individual path decisions.
- `catalogue` searches contracts; `architecture` supplies read-only proposal context.
- `replay` evaluates a historical snapshot without granting current authority.
- `benchmark --ceremony` evaluates deterministic ceremony scenarios without executing runners.

Historical replay always reports `authorityMode: historical_read_only`, `currentAuthorityGranted: false`, and does not permit writes. Trusted maintenance sequencing can only subtract pinned positive claims from contracts at the same trusted-base commit; it cannot remove denials, manufacture authority, or use mutable workspace content.

Directory routing validates all candidate contracts from one resolved base and requires every changed path to have exactly one allowing contract. The contract-only governance lane accepts only strictly valid specification-directory changes. A mixed implementation may include only the exact close of its base-authorizing contract; other semantic contract edits fail closed.

## Agent integration and references

The portable [EngineeringSpec skill](skills/engineering-spec/SKILL.md), [AGENTS.md](AGENTS.md), [Claude import](CLAUDE.md), and [Cursor rule](.cursor/rules/engineering-spec.mdc) all defer to the same CLI decision. A plugin or MCP server is not required. See [Agent integration](docs/agent-integration.md), [coding-agent integrations](docs/integrations.md), and the notes for [Codex](integrations/codex/README.md), [Claude Code](integrations/claude/README.md), [Cursor](integrations/cursor/README.md), [GitHub Copilot](integrations/copilot/README.md), and [generic agents](integrations/generic/README.md).

Run the [local fail-closed demo](examples/demo/README.md) with `npm run demo`. Further references include [lifecycle](docs/lifecycle.md), [maintaining specs](docs/maintaining-specs.md), [roles and responsibilities](docs/roles-and-responsibilities.md), [architecture bridge](docs/architecture-bridge.md), [troubleshooting](docs/troubleshooting.md), [SECURITY.md](SECURITY.md), and the [v0.1 draft specification](SPEC.md).

Private repositories are supported: the CLI and Action operate on the checked-out Git tree and do not upload repository source or specification content. Normal installation and GitHub Actions still use their configured package and network access.

## Status

`@engineeringspec/cli@0.1.0-rc.16` and `v0.1.0-rc.16` are published release-candidate identities. The repository remains a draft open specification and reference implementation. A read-only MCP adapter remains deliberately deferred until measured adoption friction warrants another transport.
