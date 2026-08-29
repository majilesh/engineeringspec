# External-adopter paired-task pilot guide

This guide prepares and runs a consented, reproducible comparison of two agent runs on the same repository task. It uses only the `measure` and `benchmark` behavior already published in `@engineeringspec/cli@0.1.0-rc.17`.

The pilot targets two to five external users or repositories and at least ten paired tasks where practical. Those are recruitment targets, not completed observations. Record refusals, withdrawals, onboarding failures, and any shortfall; never invent or replace external participation with maintainer-only dogfood.

No pilot result by itself establishes causality, productivity, correctness, safety, adoption, conversion, or general-population impact. Reports must be descriptive of the retained sample, disclose sample size and missing data, and include negative and inconclusive findings.

## Before recruitment

Choose an external participant and repository only after confirming all of the following:

- Participation is voluntary. Obtain consent from the participant and, if different, the repository owner.
- The task can be represented without retaining proprietary source or a raw private prompt.
- The participant can review every retained or submitted artifact before submission.
- The repository has an immutable Git base containing the same approved EngineeringSpec contract used to measure both condition heads.
- The same agent and model versions, harness, permissions, trusted checks, time limit, acceptance criteria, and opaque acceptance-reviewer identity can be used for both runs.

Do not retain or submit secrets, credentials, personal data, proprietary source, raw private prompts, or unsanitised private paths. Do not use `measure --include-paths` for a private repository unless the participant has reviewed every disclosed path and explicitly approved its retention. The default receipt omits paths and is preferred.

Use opaque participant, repository, reviewer, task, pair, and run identifiers. Keep the private mapping outside this repository. A participant may withdraw consent before evidence is merged; record the withdrawal in the private recruitment log and do not merge their artifacts. Once consent-safe evidence has been merged, corrections must be append-only or explicitly versioned rather than silently rewriting the original observation.

## Install one trusted CLI

Use one of these two supported setups and record which one you used.

### Clean checkout

From a clean checkout of EngineeringSpec:

```sh
npm ci
npm run build
node dist/cli.js --version
```

Use `node /absolute/path/to/engineeringspec/dist/cli.js` in place of `engineeringspec` in the commands below. Do not rely on the participant repository containing EngineeringSpec's source.

### Exact public RC17 package

Install the exact public package in a clean tools directory outside the participant repository:

```sh
mkdir engineeringspec-pilot-tools
cd engineeringspec-pilot-tools
npm init -y
npm install --save-exact @engineeringspec/cli@0.1.0-rc.17
./node_modules/.bin/engineeringspec --version
```

The reported version must be `0.1.0-rc.17`. Use the absolute path to that installed binary when running commands in the participant repository. Do not substitute an unpinned package or a development build without recording the protocol deviation.

## Predeclare a pair

Copy [`pilots/pair-plan.template.md`](pilots/pair-plan.template.md) before either condition begins. Give it an opaque pair ID and record:

- the full 40-character immutable base SHA;
- the approved contract ID, revision, path, and semantic digest from that base;
- a sanitised task intent and SHA-256 digest of the exact task prompt;
- `taskRiskTier` as `low`, `medium`, or `high`;
- agent, model, harness, EngineeringSpec, and configuration versions;
- identical permissions, trusted checks, positive time limit, acceptance criteria, and opaque reviewer ID;
- condition order and any known environment differences.

Assign `taskRiskTier` before either run, using anticipated blast radius and scope ambiguity rather than the eventual result. A useful predeclaration is:

- `low`: narrow, well-localised change with limited blast radius and little scope ambiguity;
- `medium`: several interacting surfaces or material ambiguity, but bounded impact;
- `high`: broad blast radius, security/data/release sensitivity, or substantial scope ambiguity.

The tier is evidence metadata only. It does not grant authority or change routing.

Store the exact prompt in a private working location, then record only a sanitised intent and its digest. On macOS:

```sh
shasum -a 256 task-prompt.txt
```

On systems with GNU coreutils:

```sh
sha256sum task-prompt.txt
```

Prefix the hexadecimal result with `sha256:` in each benchmark record. Never submit `task-prompt.txt` when it contains private content.

## Create comparable condition worktrees

Resolve and record the immutable base first:

```sh
git rev-parse BASE_REF^{commit}
```

Create two independent branches or worktrees at that exact SHA. For example:

```sh
git worktree add -b pilot/PAIR_ID-baseline ../PAIR_ID-baseline BASE_SHA
git worktree add -b pilot/PAIR_ID-engineeringspec ../PAIR_ID-engineeringspec BASE_SHA
```

Run the conditions in the predeclared order:

- `baseline`: provide repository guidance and the common task only. Do not provide `prepare`, `context`, the approved contract, or EngineeringSpec constraints during implementation.
- `engineeringspec`: provide the same inputs plus the approved contract and normal EngineeringSpec workflow.

Do not change the agent/model, harness, permissions, trusted checks, time limit, acceptance criteria, reviewer, prompt, or base between conditions. Record environmental differences, restarts, amendments, assistance, and every protocol departure rather than repairing the comparison silently.

End each condition with its own committed head. Commit the produced work even if it fails acceptance. If a condition legitimately produces no file change, create a condition-specific empty commit so the attempted run remains traceable:

```sh
git commit --allow-empty -m "pilot: retain PAIR_ID CONDITION outcome"
git rev-parse HEAD
```

The baseline and EngineeringSpec head SHAs must be distinct. Do not cherry-pick one condition into the other, reuse a head, or measure a dirty worktree.

## Review and record each run

Run the same predeclared trusted checks separately in both worktrees. Specification-declared runners are inert data; their presence does not execute them or prove they passed. Record actual commands, exit status, duration, acceptance outcome, review corrections, and missing observations.

Create exactly one benchmark JSON object for each condition using [`agent-impact.schema.json`](agent-impact.schema.json). The two objects must share the same `pairId`, `taskId`, `taskRiskTier`, base in `repositoryRevision`, task-prompt digest, agent/model and versions, harness, permissions, trusted checks, configuration, time limit, and reviewer ID. Use distinct `runId`, `conditionIdentity`, `headRevision`, `startedAt`, and condition sequence values `1` and `2`.

Use `evidenceClass: observed` only for a consented run that actually occurred. Bundled examples and filled-in rehearsals remain `evidenceClass: example` and must never be counted as external evidence.

Retain failures and zero values honestly. `success: false`, a slower EngineeringSpec run, amendments, onboarding failure, a protocol deviation, an excluded result, or an inconclusive review is not a reason to delete the record. If a run cannot form a schema-valid pair, retain its consent-safe metadata and disposition in the submission review rather than fabricating its missing condition.

## Generate immutable scope receipts

After each head is committed, run `measure` from the participant repository. Use the same approved contract and base for both heads:

```sh
engineeringspec measure CONTRACT_ID --spec-dir docs/engineering-specs --base BASE_SHA --head BASELINE_HEAD --output baseline-scope-receipt.json --format json
engineeringspec measure CONTRACT_ID --spec-dir docs/engineering-specs --base BASE_SHA --head ENGINEERINGSPEC_HEAD --output engineeringspec-scope-receipt.json --format json
```

When using a clean checkout build or the isolated public install, replace `engineeringspec` with that binary's absolute path. The command reads committed revisions, does not execute checks or declared runners, grants no authority, and omits paths unless `--include-paths` is explicitly requested.

Review each receipt. Its `baseSha` must equal `repositoryRevision`, and its `headSha` must equal that condition's `headRevision`. Embed the complete receipt object as `scopeReceipt` in the corresponding benchmark record and retain the standalone receipt as provenance. Do not edit counts or digests by hand.

## Validate and summarise

Place the two benchmark objects in one JSON array or in files selected together. First run the readable summary:

```sh
engineeringspec benchmark paired-runs.json --format json
```

For evidence intended to satisfy the existing publication policy, also run:

```sh
engineeringspec benchmark paired-runs.json --require-publishable --format json
```

`--require-publishable` validates completeness, observed classification, pair comparability, and current receipt policy. Passing it does not prove correctness, trusted-check success, causality, or a favourable outcome. A failing policy check does not authorize deletion: preserve the record, the failure, and the reason.

## Retain and submit safely

Use the structure in the [participant pilot kit](pilots/README.md). Before submission, the participant must complete [`pilots/submission-review.template.md`](pilots/submission-review.template.md), review every artifact, and confirm that no prohibited content remains.

Retain all consent-safe outcomes, including failed, slower, amended, onboarding-blocked, protocol-deviating, excluded, and inconclusive runs. Preserve the original observation and an explicit reason for any exclusion. Make corrections by adding a new version or amendment; do not overwrite an outcome because it is unfavourable.

Do not publish conclusions until the retained set has undergone separate evidence and privacy review. Any later report must state the number of participants, repositories, paired tasks, missing data, withdrawals or shortfalls, limitations, and negative or inconclusive findings, and must distinguish synthetic examples from observed evidence.
