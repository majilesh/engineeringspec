# Agent-impact benchmark

This benchmark asks one narrow question: on the same repository task, what changes when the agent receives an approved EngineeringSpec contract and the neutral workflow?

Run each task in both conditions with the same repository revision, prompt intent, agent/model, permissions, trusted checks, agent configuration, time limit, and acceptance review:

- `baseline`: repository guidance and task prompt only.
- `engineeringspec`: the same inputs plus the approved contract and EngineeringSpec workflow.

Record one JSON object per run using [agent-impact.schema.json](agent-impact.schema.json). Existing minimal records remain readable, but every omitted observation is counted under `missingData`; a publishable pilot should populate the complete record.

## What to record

Along with success, scope violations, corrections, duration, and tokens, retain:

- `pairId`, repository revision, model, prompt intent, permissions, trusted checks, agent configuration, condition identity, positive time limit, opaque acceptance reviewer ID, and condition sequence.
- Contract authoring/review time, amendments, first-pass gate outcome, and review cycles.
- Unique repository paths explored, changed outside authority, and ultimately merged outside authority.
- The concrete approved writable surface and actual changed surface using the scope method below.
- `evidenceClass: observed` for real retained runs or `example` for synthetic documentation data.

Do not remove failures, slower runs, amendments, onboarding problems, or unexpected results. Specifications remain inert; only separately trusted harness or repository checks may execute.

## Concrete-path scope precision v1

The comparable unit is one unique normalized repository-relative path.

1. At the pinned revision, enumerate concrete files matched by writable targets (`modify`, `create`, `delete`, or `interface_only`).
2. Add each authorized newly created path once because it was absent from the base tree.
3. Count a rename as its old and new path in the actual changed surface.
4. Count the actual changed surface once per unique expanded path. Record paths outside authority separately as `unauthorizedPathsChanged`.
5. Reject the record if unauthorized paths exceed actual paths or authorized changed paths exceed approved writable paths. Otherwise finite-scope precision is `(actualChangedPaths - unauthorizedPathsChanged) / approvedWritablePaths`.

Classify `authorityBreadth` as `finite`, `open_create_namespace`, or `repository_wide`. Only finite authority has numeric precision. Open-create and repository-wide runs remain publishable when the evidence is otherwise complete, but precision stays null with an explicit limitation. Legacy `catchAllTarget: true` maps to repository-wide authority.

Generate deterministic counts from committed revisions with `engineeringspec measure <contract-id> --spec-dir <dir> --base <sha> --head <sha> --format json`. Receipts are unsigned, omit paths by default, grant no authority, and do not prove trusted checks passed. If a record contains both legacy scope fields and a receipt, disagreements fail validation.

## Summarize

```sh
engineeringspec benchmark benchmarks/results/*.json --format json
engineeringspec benchmark benchmarks/results/*.json --require-publishable --format json
```

The summary reports provenance, evidence quality, publishability, sample size, missing data, failed/slower/amended runs, operational effort, unauthorized paths, and scope precision. `--require-publishable` fails incomplete, example, mixed, or inconsistent evidence. Passing it means only that the declared evidence policy is satisfied; results remain descriptive and never establish causality. The bundled [example](example-results.json) is synthetic and must not be presented as observed impact.

Use the [pilot guide](pilot-guide.md) and [pilot kit](pilots/README.md) before recruiting external participants.
