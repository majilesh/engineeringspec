# CLI reference

Use a repository-local installation when available. In enforcement and durable guidance, pin an exact released version rather than a mutable tag.

## Start and maintain

| Command | Purpose | Writes by default |
|---|---|---:|
| `doctor` | Diagnose Git, base ref, contracts, CI, guidance, CLI and Action version alignment | No |
| `status` | Summarize lifecycle, complete working state, routing and the safest next stage | No |
| `adopt` | Scaffold neutral agent guidance and base-pinned GitHub enforcement | Yes, unless `--dry-run` |
| `propose` | Generate a deterministic draft from explicit paths or the local Git state | Yes, unless `--dry-run` |
| `transition` | Preview a validated lifecycle status-only transition | No; requires `--write` |

Preview a managed upgrade before applying it:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.8 adopt . \
  --spec docs/engineering-specs/change.engineering-spec.md \
  --merge --upgrade --dry-run
```

`--upgrade` changes only recognisable managed guidance and a single immutable EngineeringSpec Action pin. Ambiguous structured files remain untouched.

## Explore and query

| Command | Purpose |
|---|---|
| `validate` | Parse, schema-check and semantically validate a file or directory |
| `inspect` | Query one normalized document by target, constraint, contract, verifier or path |
| `coverage` | Report declared traceability coverage; it does not run evidence |
| `catalogue` | Build deterministic search, lifecycle, ownership and path-impact JSON |
| `architecture` | Import a read-only architecture map from Backstage component YAML |
| `context` | Return bounded agent context for one path without runner commands |
| `explain` | Explain why a path and change kind are allowed or denied |
| `review` | Explain complete-state routing, obligations, coverage, and verifier identities from the approved base |

Examples:

```sh
engineeringspec catalogue docs/engineering-specs --query payments --format json
engineeringspec catalogue docs/engineering-specs --path src/payments/card.ts
engineeringspec catalogue docs/engineering-specs --format html > explorer.html
engineeringspec architecture catalog-info.yaml --format json
```

## Enforce and self-check

| Command | Purpose |
|---|---|
| `select` | Route the complete Git state to exactly one approved base contract per path |
| `check` | Agent-oriented complete-working-state self-check |
| `gate` | Gate a diff against one contract |

For directory routing, `--allow-contract-only` is opt-in. It accepts only a non-empty diff composed entirely of validated EngineeringSpec documents under the configured directory. Mixed changes remain implementation changes and use approved-base authorization.

## Safety invariants

- Parsing, validation, doctor, status, catalogue, architecture, inspect, context and explain do not execute declared runners.
- `propose` emits only `status: draft`, performs no network request, and grants no implementation authority.
- `review` is read-only, base-pinned, and omits verifier runner payloads in every format.
- Architecture and catalogue output never grants authority.
- `transition --write` changes only the frontmatter status after validating before and after; it performs no Git operation.
- JSON intended for agents omits verifier command payloads.
