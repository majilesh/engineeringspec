# Agent-impact benchmark

This benchmark asks one narrow question: on the same repository task, what changes when the agent receives an approved EngineeringSpec contract and the neutral workflow?

Run each task in both conditions with the same repository revision, prompt intent, agent/model, permissions, trusted checks, agent configuration, time limit, and acceptance review:

- `baseline`: repository guidance and task prompt only.
- `engineeringspec`: the same inputs plus the approved contract and EngineeringSpec workflow.

Record one JSON object per run using [agent-impact.schema.json](agent-impact.schema.json). Existing minimal records remain readable, but every omitted observation is counted under `missingData`; a publishable pilot should populate the complete record.

## What to record

Along with success, scope violations, corrections, duration, and tokens, retain:

- `pairId`, repository revision, model, prompt intent, permissions, trusted checks, agent configuration, and condition identity.
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
5. Scope precision is `(actualChangedPaths - unauthorizedPathsChanged) / approvedWritablePaths`, capped at 1.

Set `catchAllTarget: true` when a writable pattern is explicitly repository-wide or matches every concrete base path. Such runs remain in all other summaries, but precision is reported as `not_interpretable_catch_all`; zero violations under a catch-all is not evidence of strong bounded authority. Broad non-catch-all targets remain visible through a low precision score.

## Summarize

```sh
engineeringspec benchmark benchmarks/results/*.json --format json
```

The summary reports sample size, evidence class, missing data, failed/slower/amended runs, operational effort, unauthorized paths, and scope precision. Results are descriptive for the retained sample and never establish causality by themselves. The bundled [example](example-results.json) is synthetic and must not be presented as observed impact.

Use the [pilot guide](pilot-guide.md) and [pilot kit](pilots/README.md) before recruiting external participants.
