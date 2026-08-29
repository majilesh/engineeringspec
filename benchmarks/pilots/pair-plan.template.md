# Paired-task predeclaration — OPAQUE_PAIR_ID

Complete this record before either condition starts. Keep private content outside the submission and replace every placeholder with consent-safe metadata.

## Consent and identities

- Opaque participant ID:
- Opaque repository ID:
- Opaque task ID:
- Opaque pair ID:
- Opaque acceptance reviewer ID:
- Participant consent confirmed (yes/no, date, consent-record location outside repository):
- Repository-owner consent confirmed where distinct (yes/no/not distinct, date):
- Participant informed of pre-merge withdrawal option (yes/no):

Do not record names, email addresses, private repository names, or signatures here.

## Immutable inputs

- Base SHA (40 hexadecimal characters):
- Approved contract ID:
- Contract revision:
- Contract path:
- Contract semantic digest (`sha256:...`):
- Sanitised task intent:
- Exact task-prompt digest (`sha256:...`; raw private prompt excluded):
- Predeclared `taskRiskTier` (`low`, `medium`, or `high`):
- Risk-tier rationale based only on anticipated blast radius and scope ambiguity:

## Comparable execution controls

- Agent and version:
- Model and version:
- Harness and version:
- EngineeringSpec setup and version:
- Agent configuration identity:
- Permissions granted to both conditions:
- Trusted checks to run separately in both conditions:
- Positive time limit in seconds:
- Acceptance criteria:
- Review-blinding plan and expected value of `reviewBlinded`:
- Condition order (`baseline` then `engineeringspec`, or the reverse):
- Known environment differences before starting:

The two conditions must preserve every control above. Record later differences as deviations; do not silently amend this predeclaration.

## Condition identities

- Baseline `runId` and `conditionIdentity`:
- EngineeringSpec `runId` and `conditionIdentity`:
- Planned baseline branch/worktree:
- Planned EngineeringSpec branch/worktree:

Baseline receives repository guidance and the common task only. EngineeringSpec receives the same inputs plus the approved contract and normal EngineeringSpec workflow.

## Amendments after predeclaration

Append amendments; do not replace the original entry.

| Timestamp | Before either outcome was known? | Change | Reason | Conditions affected | Reviewer |
| --- | --- | --- | --- | --- | --- |
| None | — | — | — | — | — |
