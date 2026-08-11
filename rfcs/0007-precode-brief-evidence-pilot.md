# RFC 0007: Pre-code brief and adoption evidence pilot

- Status: Implemented in approved pilot contract
- Date: 2026-08-12
- Contract: `ES-precode-brief-evidence-pilot`

## Context

EngineeringSpec already enforced approved base contracts, but an implementation agent still had to assemble a pre-code view from several commands. The original benchmark also reported only success, violations, corrections, duration, and tokens. It did not preserve enough experimental identity, operational cost, or scope quality to evaluate bounded autonomy honestly.

## Decision

### Pre-code brief

`prepare` is a deterministic presentation layer over the existing parser, normalizer, base-tree reader, and lifecycle model. It requires an exact contract ID, specification directory, and Git base. Only one uniquely identified, valid, base-loaded `approved` contract returns implementation permission.

The brief distinguishes repository reading needed for correctness from declared writable surfaces. It reports contract/base identity, digest, targets, protected surfaces, constraints, technical contract identities, verifier identities, source intent, available digests, and `escalate` constraints as unresolved questions. It never loads workspace authority, infers targets, modifies files, approves contracts, executes runners, or exposes runner payloads.

### Paired evidence records

The original benchmark fields remain valid for compatibility. New optional fields preserve pair identity, condition identity, evidence class, repository revision, model, prompt intent, permissions, trusted checks, agent configuration, contract authoring/review time, amendments, first-pass gate outcome, review cycles, exploration breadth, unauthorized paths changed/merged, and scope measurement. Missing optional observations remain visible in summaries rather than being imputed or discarded.

When a `pairId` is present, it identifies exactly one baseline and one EngineeringSpec run. Otherwise the legacy task-and-agent key is used. Present comparability fields must match across conditions. Failed, slower, amended, incomplete, negative, and inconclusive runs remain in the sample.

### Concrete-path scope precision v1

The unit is one unique normalized repository-relative path. The approved writable surface contains concrete base-tree files matched by writable targets plus each authorized added path once. The actual changed surface expands a rename into old and new paths and counts every unique path once. Precision is:

```text
(actual changed paths - unauthorized changed paths) / approved writable paths
```

The value is capped at 1. A writable target that is explicitly repository-wide or matches every concrete base path is marked `catchAllTarget`. Catch-all runs remain in other metrics, but their precision is `not_interpretable_catch_all`; zero violations under catch-all authority cannot support a strong bounded-authority claim.

### Evidence classes and claims

Records are `observed`, `example`, or unclassified for backward compatibility. The summarizer reports evidence-class counts, sample size, missing data, and a non-causal interpretation. Example, mixed, or unclassified inputs cannot be presented as observed impact. Observed pairs remain descriptive for their retained sample and do not establish general causal productivity or correctness.

The external pilot begins at zero published evidence. Measurement and publication require consent; public data uses opaque identifiers and sanitization. The programme targets at least ten paired tasks and two to five external participants or repositories where practical, while retaining onboarding failures and allowing negative or inconclusive publication.

## Security and privacy

- Base authority remains immutable and fail-closed.
- Specification runners remain inert and secret-bearing payloads remain omitted.
- Raw private source, prompts, paths, customer data, secrets, and identifying revisions are not published.
- A private participant lookup table, if required, remains outside this repository.
- Synthetic examples are visibly classified and cannot silently become product evidence.

## Alternatives rejected

- **Infer a contract or targets from repository code:** duplicates authorization logic and permits self-widening.
- **Use target-glob counts as precision:** incomparable because broad globs can denote infinite future paths.
- **Drop incomplete or slower runs:** biases the outcome and hides adoption cost.
- **Treat zero gate violations as sufficient:** catch-all authority can produce zero violations without meaningful boundaries.
- **Build a dashboard or hosted evidence service now:** adds breadth before retained adopter evidence identifies the bottleneck.

## Deferred work

Governance plan/apply commands, contract inference, issue acquisition, model calls, architecture-derived authority, dashboards, catalogue expansion, MCP, IDE extensions, broad vendor plugins, hosted control planes, and implementation generation remain separately reviewable future work.
