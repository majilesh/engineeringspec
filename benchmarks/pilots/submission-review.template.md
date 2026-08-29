# Consent-safe submission review — OPAQUE_PAIR_ID

Complete this after attempted runs and before submitting or retaining artifacts in the repository. The participant must review the final files, not merely this checklist.

## Attempt and disposition

- Opaque participant/repository/task/pair IDs:
- Baseline attempted (yes/no); committed head or onboarding-blocked reason:
- EngineeringSpec attempted (yes/no); committed head or onboarding-blocked reason:
- Heads are distinct (yes/no/not applicable):
- Outcome disposition (`complete`, `failed`, `slower`, `amended`, `onboarding-blocked`, `protocol-deviating`, `excluded`, `inconclusive`, or multiple):
- Disposition reason, including missing data:
- Protocol deviations and environment differences:
- Recruitment refusal, withdrawal, or sample-shortfall accounting needed:

Do not delete a record because of its disposition. If a schema-valid pair cannot be produced, retain this consent-safe review and the attempted-run metadata without inventing the missing run.

## Artifact inventory

List every proposed file and its SHA-256 digest after sanitisation.

| File | SHA-256 digest | Evidence class | Sanitised | Participant reviewed |
| --- | --- | --- | --- | --- |
| `paired-runs.v1.json` |  | `observed` or `example` | yes/no | yes/no |
| `baseline-scope-receipt.v1.json` |  |  | yes/no | yes/no |
| `engineeringspec-scope-receipt.v1.json` |  |  | yes/no | yes/no |
| `trusted-checks.v1.md` |  |  | yes/no | yes/no |
| `acceptance-review.v1.md` |  |  | yes/no | yes/no |

Synthetic rehearsals must use `evidenceClass: example`; they are never external observations.

## Privacy and consent checks

Confirm that every submitted artifact excludes:

- [ ] Secrets, credentials, tokens, cookies, keys, and environment values.
- [ ] Personal data and direct participant identifiers.
- [ ] Proprietary source, patches, and source-derived excerpts.
- [ ] Raw private prompts.
- [ ] Unsanitised private paths, repository names, branch names, hosts, and URLs.
- [ ] Private identifier mappings.

- Default path-omitting `measure` receipts used (yes/no; explain any exception):
- Participant reviewed every final artifact after sanitisation (yes/no, date):
- Repository owner reviewed where required (yes/no/not distinct, date):
- Consent still active immediately before submission (yes/no):
- Requested removals completed before submission (yes/no/not requested):

Do not submit if any required answer is `no`.

## Reproducibility and validation

- Same immutable base recorded for both conditions (yes/no):
- Same prompt digest, risk tier, agent/model, harness, permissions, trusted checks, time limit, acceptance criteria, and reviewer (yes/no; list deviations):
- Actual trusted-check commands and exit outcomes retained (yes/no):
- Standalone receipts match embedded `scopeReceipt` objects (yes/no):
- `engineeringspec benchmark paired-runs.v1.json --format json` result:
- `engineeringspec benchmark paired-runs.v1.json --require-publishable --format json` result or explicit reason it was not expected to pass:
- Limitations affecting independent reproduction:

A passing benchmark policy does not establish correctness, trusted-check success, causality, productivity, safety, or adoption.

## Corrections and exclusions

- Original observation retained (yes/no):
- Exclusion decision, reviewer, timestamp, and reason (or `not excluded`):
- Amendment/version history file:
- Next version required (yes/no; proposed filename):

Corrections must be append-only or explicitly versioned. Preserve unfavourable, excluded, and inconclusive outcomes with their reasons.
