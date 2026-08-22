# Troubleshooting

## `prepare` is blocked

`prepare` intentionally accepts only one exact contract ID loaded from the resolved Git base. Check the reported base SHA and contract ID. If the contract is missing or not `approved`, merge the separate approval-only change and update the base before retrying. If it is ambiguous, remove the duplicate identity through a contract-only governance PR. Do not point `prepare` at a mutable workspace document or bypass it with inferred targets.

Start with:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.16 doctor . --spec-dir docs/engineering-specs --base origin/main --strict
npx --yes @engineeringspec/cli@0.1.0-rc.16 status --spec-dir docs/engineering-specs --base origin/main --allow-contract-only --strict
```

## Base ref does not resolve

Fetch the trusted default branch and pass its explicit ref, for example `origin/main` or `origin/trunk`. CI checkouts need sufficient history. Do not fall back to a workspace contract to make enforcement pass.

If the intent is historical verification, use explicit read-only replay with a full commit SHA. Do not pass the old SHA to `work`, `check`, `review`, or `finish`; those commands enforce current trusted-base identity. `replay` cannot write and grants no current authority.

## No eligible EngineeringSpec

For a non-empty change, approve and merge the applicable contract-only PR first. For a clean repository, zero eligible contracts is a normal `not_applicable` result.

## Uncovered path (`ESRT002`)

The approved base contains no writable target for the path. Confirm the path is actually needed. If so, merge a contract-only target amendment before implementation.

If the only changed path is inside the configured specification directory, this may be a proposal, amendment, or closure. Use the repository's reviewed governance policy and `--allow-contract-only`; do not add the specification file to its own implementation targets. If any non-specification path is also changed, `ESRT002` is expected and the changes must be split.

Current CLI versions add an informational diagnostic when specification and non-specification paths are mixed. The safe remediation is always: split the contract change, merge it, update the implementation branch from the trusted base, then continue.

## Ambiguous path (`ESRT003`)

More than one approved contract claims the same exact path. The diagnostic identifies each claimant, revision, contract path, and semantic digest. Narrow the change or authority in a governance PR, or independently approve an exact maintenance controller that pins and subtracts only the competing positive claim. Do not choose a workspace contract, add priority/preference, force a claimant, or disable strict mode.

## Invalid maintenance sequencing (`ESRT007`)

The trusted controller is stale, malformed, broadened, duplicated, chained, cyclic, competing, or inapplicable. Compare its referenced contract ID, revision, closure semantic digest, and exact paths with the same trusted-base commit. Correct and independently approve the controller before implementation. Workspace or head edits cannot activate or widen sequencing.

## Historical ProductSpec/reference unavailable (`ESPR001`)

Replay reads local ProductSpecs and repository-local references only from its immutable snapshot. Restore or select a commit containing the referenced blob and matching revision/digest. Current workspace content is intentionally ignored and cannot be used as fallback.

## Denied path (`ESRT004`)

A matching `read_only` or `observe` target, or an incompatible change policy, denies the path. Denial overrides allow. Escalate to the owner rather than weakening the check locally.

## Duplicate ID (`ESRT005`)

Eligible contracts share an ID. Assign durable unique IDs in a contract-only change.

## Strict warning failure

`--strict` intentionally treats load-time warnings as failures. Resolve overlapping/incompatible targets or other warnings; do not remove strict mode from enforcing CI merely to proceed.

## Doctor reports missing guidance or CI

Preview `adopt --merge --dry-run`, review the generated files, then apply them. Existing structured workflow and Cursor files are not overwritten by default and may require a manual merge.

## Doctor reports integration version drift

The installed CLI, managed guidance and immutable Action pin are independent identities. Run `adopt --merge --upgrade --dry-run`, review the result, then apply it. If a structured file is skipped, update it manually rather than forcing an overwrite.

## A declared verifier did not run

Expected behavior: declarations are inert data. Run only checks selected by the repository's trusted development or CI workflow, then report their results against the verifier identities.
