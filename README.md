# EngineeringSpec

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
npm install
npm run build
npx engineeringspec init --template feature --id ES-my-change
npx engineeringspec validate ENGINEERING_SPEC.md
npx engineeringspec normalize ENGINEERING_SPEC.md --digest
npx engineeringspec inspect ENGINEERING_SPEC.md --path src/example.ts
npx engineeringspec coverage ENGINEERING_SPEC.md --fail-on uncovered
```

Specifications are untrusted input. Declared commands are inert data: validation never executes them. See [SECURITY.md](SECURITY.md), [SPEC.md](SPEC.md), [maintainer-only roadmap](maintainer-only roadmap), and [CONTRIBUTING.md](CONTRIBUTING.md).

## Status

The parser, schema, semantic validator, normalizer, query API, ProductSpec profile, CLI, and conformance fixtures form the v0.1 release candidate. A read-only MCP adapter remains deliberately deferred until the file format is stable.
