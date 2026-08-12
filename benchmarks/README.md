# Agent-impact benchmark

This benchmark asks one narrow question: on the same repository task, what changes when the agent receives an approved EngineeringSpec contract and the neutral workflow?

Run each task in both conditions from the same immutable base with the same task-prompt digest, agent/model and versions, harness, permissions, trusted checks, time limit, and acceptance review:

- `baseline`: repository guidance and the common task only; no `prepare`, `context`, or EngineeringSpec constraint during implementation.
- `engineeringspec`: the same inputs plus the approved contract and EngineeringSpec workflow.

Measure both committed heads afterward against the same approved contract, base revision, and repository-routing rubric. Condition heads must remain distinct and review should be blinded where practical.

Record one JSON object per run using [agent-impact.schema.json](agent-impact.schema.json). Existing minimal records remain readable, but every omitted observation is counted under `missingData`; a publishable pilot should populate the complete record.

## What to record

Along with success, scope violations, corrections, duration, and tokens, retain:

- `pairId`, base and head revisions, task-prompt digest, model, agent/harness/EngineeringSpec versions, permissions, trusted checks, agent configuration, condition identity, start timestamp, truthful review-blinding status, positive time limit, opaque acceptance reviewer ID, and condition sequence.
- Contract authoring/review time, amendments, first-pass gate outcome, and review cycles.
- Unique repository paths explored, changed outside authority, and ultimately merged outside authority.
- The concrete approved writable surface and actual changed surface using the scope method below.
- `evidenceClass: observed` for real retained runs or `example` for synthetic documentation data.

Do not remove failures, slower runs, amendments, onboarding problems, or unexpected results. Specifications remain inert; only separately trusted harness or repository checks may execute.

## Repository-routing scope evidence v2

The comparable unit is one unique normalized repository-relative path.

1. Load and strictly validate every approved contract from the immutable base candidate directory.
2. Route the complete committed base-to-head diff once, expanding renames to old/delete and new/add paths.
3. Project that repository decision onto the one requested contract while retaining paths selected for other contracts, denied, ambiguous, or uncovered.
4. Derive finite writable authority from authority granted: unexercised exact create paths count; absent exact `modify` and `interface_only` paths count; existing create-only and absent delete-only paths do not.
5. Bind the result with canonical candidate-set, routing-decision, and privacy-safe path-set digests.

Only finite, non-empty authority without other-contract, denied, ambiguous, or uncovered outcomes has numeric single-contract precision. Complete negative outcomes remain publishable observations, but precision is null with an explicit reason. Open-create and repository-wide authority likewise retain the run while making precision unavailable.

Generate deterministic counts from committed revisions with `engineeringspec measure <contract-id> --spec-dir <dir> --base <sha> --head <sha> --format json`. V2 receipts are unsigned, omit paths by default, grant no authority, and prove neither correctness nor trusted-check success. V1/manual evidence remains readable and summarizable but is not publishable under the RC12 quantitative policy. If legacy fields and a receipt coexist, disagreements fail validation.

## Summarize

```sh
engineeringspec benchmark benchmarks/results/*.json --format json
engineeringspec benchmark benchmarks/results/*.json --require-publishable --format json
```

The summary reports provenance, evidence quality, publishability, sample size, missing data, failed/slower/amended runs, operational effort, unauthorized paths, and scope precision. `--require-publishable` fails incomplete, example, mixed, or inconsistent evidence. Passing it means only that the declared evidence policy is satisfied; results remain descriptive and never establish causality. The bundled [example](example-results.json) is synthetic and must not be presented as observed impact.

Use the [pilot guide](pilot-guide.md) and [pilot kit](pilots/README.md) before recruiting external participants.
