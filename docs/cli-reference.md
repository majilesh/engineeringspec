# CLI reference

Use a repository-local installation when available. In enforcement and durable guidance, pin an exact released version rather than a mutable distribution tag.

## Daily developer and coding-agent workflow

| Command | Purpose | Writes by default |
|---|---|---:|
| `adopt` | Scaffold neutral agent guidance, trusted defaults, and base-pinned GitHub enforcement | Yes, unless `--dry-run` |
| `next` | Analyze lifecycle and report the safest next action and current permission | No |
| `work <contract-id>` | Load the exact approved trusted-base contract and its writable surfaces | No |
| `finish <contract-id>` | Compose complete-state check, review, bound receipt, and PR metadata | No; closure requires `--write-closure` |
| `doctor` | Diagnose Git, base, contracts, CI, guidance, CLI, and Action alignment | No |
| `replay <contract-id>` | Simulate historical review or finish readiness from immutable commits | No; never grants current authority |

The normal path is:

```sh
engineeringspec next
engineeringspec work ES-change
# edit only returned writable surfaces; run separately trusted repository checks
engineeringspec finish ES-change --format markdown
engineeringspec finish ES-change --write-closure
```

`next` is informational. Exit code 0, `valid: true`, or `analysisValid: true` does not authorize implementation. Begin only when `permission` is `implementation` and `work ES-change` successfully loads that exact approved trusted-base contract. The additive `workflowState` field mirrors the reported lifecycle stage without changing existing exit behavior.

`work` permits repository reading needed for correctness, but only its returned surfaces are writable. `finish` never stages, commits, pushes, approves, merges, or executes a runner declared inside a specification. If writing a receipt, choose a path outside the evaluated worktree:

```sh
engineeringspec finish ES-change \
  --write-closure \
  --output ../engineering-spec-receipt.json
```

Writing evidence inside the worktree would mutate the working state whose digest `finish` just evaluated, so it is rejected.

## Authority authoring and lifecycle maintenance

| Command | Purpose | Writes by default |
|---|---|---:|
| `init` | Create a starter EngineeringSpec document | Yes unless output is stdout-only |
| `propose` | Generate a deterministic draft from explicit paths or local Git state | Yes, unless `--dry-run` |
| `transition` | Preview a validated lifecycle status-only transition | No; requires `--write` |
| `normalize` | Emit deterministic normalized JSON and optional semantic digest | No, unless `--output` |

`propose` emits only `status: draft`, performs no network request, and grants no implementation authority. New or widened authority must be reviewed and merged separately before dependent implementation. `transition --write` changes only lifecycle status after validating before and after; it performs no Git operation.

## Advanced inspection and troubleshooting

| Command | Purpose |
|---|---|
| `prepare` | Lower-level exact approved-base pre-code brief composed by `work` |
| `context` | Return bounded agent context for a path without runner payloads |
| `explain` | Explain why a path and change kind are allowed or denied |
| `status` | Summarize lifecycle, complete working state, routing, and next stage |
| `review` | Explain routing, obligations, coverage, and verifier identities |
| `catalogue` | Search lifecycle, ownership, obligations, and path impact deterministically |
| `inspect` | Query one normalized document by target, constraint, contract, verifier, or path |
| `coverage` | Report declared traceability coverage without running evidence |
| `architecture` | Import a read-only architecture map from Backstage component YAML |

Examples:

```sh
engineeringspec catalogue docs/engineering-specs --query payments --format json
engineeringspec catalogue docs/engineering-specs --path src/payments/card.ts
engineeringspec architecture catalog-info.yaml --format json
engineeringspec prepare ES-payments-change --spec-dir docs/engineering-specs \
  --base origin/main --strict --format markdown
engineeringspec explain docs/engineering-specs/ES-payments-change.engineering-spec.md \
  --path src/payments/card.ts --base origin/main
```

Architecture and catalogue output never grant authority. `interface_only` in a preparation brief is path-level write access, not semantic interface enforcement; pair it with separately trusted API or schema verification.

Historical evaluation is explicit:

```sh
engineeringspec replay ES-change --at <full-authority-commit> \
  --operation review --head-at <full-candidate-commit> --format json
engineeringspec replay ES-change --at <full-authority-commit> \
  --operation finish-readiness --changes-file changes.json --format json
```

`--head-at` and `--changes-file` are mutually exclusive. The fixture accepts only bounded path/kind records. Replay has no staged, worktree, force, preference, runner, or write option. Its result always says `historical_read_only` and `currentAuthorityGranted: false`.

## CI and enforcement primitives

| Command | Purpose |
|---|---|
| `select` | Route the complete Git state to exactly one approved base contract per path |
| `check` | Perform the agent-oriented complete-working-state self-check |
| `gate` | Gate a diff against one contract |
| `validate` | Parse, schema-check, and semantically validate a file or directory |

For directory routing, `--allow-contract-only` accepts only a non-empty diff composed entirely of strictly valid EngineeringSpec documents under the configured directory. Mixed implementation changes use approved-base authorization. An exact close of the contract actually spent by implementation may pass as `implementation_with_monotonic_close`; semantic changes, authority widening, and unrelated closures fail closed.

`validate` resolves local ProductSpec paths from the current Git worktree. Pass `--repository-root <path>` when invoking it elsewhere. Library callers must provide `repositoryRoot`; strict external validation fails closed when the root or referenced file is unavailable or resolves outside it. `--no-profile-resolution` keeps validation offline without dereferencing profile sources.

## Measurement and research

| Command | Purpose |
|---|---|
| `measure` | Generate an unsigned v2 scope receipt from repository-wide approved-base routing |
| `benchmark` | Summarize retained paired agent runs and evidence limitations |

```sh
engineeringspec measure ES-payments-change --spec-dir docs/engineering-specs \
  --base <base-sha> --head <head-sha> --strict --format json
engineeringspec benchmark benchmarks/results/*.json --require-publishable --format json
engineeringspec benchmark --ceremony --format json
```

Measurement grants no authority, executes no verifier, and proves neither correctness nor trusted-check execution. It omits individual paths unless disclosure is explicit. Benchmark output preserves failed, slower, amended, open-authority, negative-routing, and incomplete results.

## Safety invariants

- Parsing, validation, doctor, status, next, catalogue, architecture, inspect, prepare, work, measure, context, and explain do not execute specification-declared runners.
- Workspace or head configuration cannot change authority resolved from the immutable base.
- A change cannot grant or widen its own authority and spend that authority in the same pull request.
- JSON intended for agents omits specification runner command payloads.
- High-level commands compose the same deterministic primitives used by CI; they do not implement a second authorization decision.
- A clean or successfully analyzed state authorizes nothing by itself.
- Historical replay never grants current authority; a movable or mismatched base supplied to an ordinary authority command does not implicitly select replay mode.
- Maintenance sequencing is trusted-base-only and subtractive: exact stale-safe pins may remove positive claims, while denies and remaining ambiguity still fail closed.

Preview a managed integration upgrade before applying it:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.16 adopt . \
  --spec docs/engineering-specs/change.engineering-spec.md \
  --merge --upgrade --dry-run
```

`--upgrade` changes only recognisable managed guidance and a single immutable EngineeringSpec Action pin. Ambiguous structured files remain untouched.
