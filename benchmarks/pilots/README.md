# External-adopter participant pilot kit

This directory defines the consent-safe submission and retention layout for the [external-adopter paired-task pilot](../pilot-guide.md). It contains no participant observations. The pilot targets two to five external users or repositories and at least ten paired tasks where practical; neither target is evidence that recruitment or execution has occurred.

## Participant checklist

Before either run:

1. Read the complete [pilot guide](../pilot-guide.md).
2. Obtain voluntary participant consent and repository-owner consent where they are different people.
3. Copy [pair-plan.template.md](pair-plan.template.md) to a private working directory and complete it before seeing either outcome.
4. Confirm the immutable base contains the approved contract used for both conditions.
5. Pin the same prompt digest, `taskRiskTier`, agent/model, harness, permissions, trusted checks, time limit, acceptance criteria, reviewer, and condition order for the pair.
6. Use either a clean EngineeringSpec checkout or the exact public `@engineeringspec/cli@0.1.0-rc.17` installation.

After both attempted runs:

1. Preserve distinct committed heads and record every failure, amendment, restart, deviation, or missing observation.
2. Generate a v2 `measure` receipt for each committed head without `--include-paths` by default.
3. Create one schema-conforming benchmark record per condition and run `engineeringspec benchmark` on the pair.
4. Copy [submission-review.template.md](submission-review.template.md), inventory every proposed artifact, sanitise it, and let the participant review it.
5. Submit only after the participant confirms the reviewed artifacts are safe to retain.

## Private working layout

Keep raw material outside this repository. A suggested private layout is:

```text
private-pilot-work/
  OPAQUE_PARTICIPANT_ID/
    OPAQUE_PAIR_ID/
      pair-plan.md
      task-prompt.txt                 # private; never submit
      baseline-scope-receipt.json
      engineeringspec-scope-receipt.json
      paired-runs.json
      trusted-checks.md
      acceptance-review.md
      submission-review.md
```

The raw prompt, source checkout, patches containing proprietary source, logs containing private paths, private identifier mapping, credentials, and secrets remain private and must not enter a submission.

## Consent-safe repository layout

After consent, sanitisation, and participant review, maintainers may retain a submission under:

```text
benchmarks/pilots/submissions/
  OPAQUE_PARTICIPANT_ID/
    OPAQUE_PAIR_ID/
      pair-plan.md
      paired-runs.v1.json
      baseline-scope-receipt.v1.json
      engineeringspec-scope-receipt.v1.json
      trusted-checks.v1.md
      acceptance-review.v1.md
      submission-review.v1.md
      amendments.md
```

Do not create that tree for a participant until evidence has actually been collected and reviewed. `paired-runs.v1.json` contains exactly the baseline and EngineeringSpec benchmark records. Standalone receipts must match the objects embedded as `scopeReceipt`. Supporting Markdown records outcomes and provenance without including proprietary source or raw private prompts.

Use opaque IDs consistently. Filenames and Markdown must not expose participant names, private repository names, usernames, home directories, internal hosts, issue titles, or branch names derived from private content.

## Required retained metadata

Each submission must make it possible for an independent reviewer to:

- identify the opaque participant, repository, task, pair, runs, and reviewer;
- confirm voluntary consent and participant review without retaining signatures or personal data;
- reproduce the prompt digest without receiving the raw private prompt;
- confirm the predeclared risk tier and comparable protocol inputs;
- resolve the immutable base and distinct committed heads in an authorised review environment;
- see the exact trusted checks, exit outcomes, time limit, acceptance criteria, review outcome, and amendments;
- match each standalone measurement receipt to its embedded `scopeReceipt`;
- rerun `engineeringspec benchmark` on the complete retained record set;
- understand deviations, exclusions, missing data, limitations, withdrawals, and recruitment shortfalls.

If immutable private commits cannot be made available to the authorised evidence reviewer, record that limitation. Do not replace them with fabricated public SHAs or disclose private source to make a receipt externally reproducible.

## Outcomes that must remain

Never discard an observation because it is unfavourable. Retain and count:

- unsuccessful or acceptance-failing conditions;
- EngineeringSpec runs that are slower or require more tokens;
- contract amendments and extra review cycles;
- onboarding-blocked or incomplete pairs;
- protocol deviations and environmental differences;
- excluded and inconclusive outcomes;
- missing data, refusals, withdrawals, and sample shortfalls.

An incomplete or non-publishable run may not fit `paired-runs.v1.json`. Preserve its consent-safe predeclaration, attempted-run metadata, and explicit disposition in the review files. Never invent the missing condition or alter an outcome to pass `--require-publishable`.

Corrections are append-only or explicitly versioned. Keep `*.v1.*`, add `*.v2.*`, and explain the reason in `amendments.md`. For an exclusion, preserve the original observation and record who decided, when, and why. Consent withdrawal before merge means do not merge the artifacts; record only aggregate recruitment accounting that cannot identify the person or repository.

## Privacy boundary

Every retained or submitted file must exclude:

- secrets and credentials, including tokens, cookies, keys, and environment values;
- personal data or direct participant identifiers;
- proprietary source, patches, or source-derived excerpts;
- raw private prompts;
- unsanitised private paths, repository names, branch names, hosts, and URLs.

Prefer default path-omitting measurement receipts. If `--include-paths` was used during private analysis, create a fresh default receipt for submission; do not manually edit a signed-looking digest or claim the sanitised copy is the original receipt. The participant reviews the final artifact set and may request removal before merge.

## Evidence classes and reporting

`evidenceClass: example` is synthetic documentation or rehearsal data. `evidenceClass: observed` is reserved for a real, consented run. Never mix examples into observed counts.

Summaries describe only the retained sample. They do not establish causal, productivity, correctness, safety, adoption, conversion, or population-level effects. Report participant, repository, pair, and run counts; missing data; protocol deviations; excluded and inconclusive records; slower and amended runs; recruitment shortfalls; and limitations alongside any descriptive comparison.

The EngineeringSpec contract remains approved while recruitment or evidence collection is active. Preparing or submitting this kit does not close it.
