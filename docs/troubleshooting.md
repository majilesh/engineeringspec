# Troubleshooting

Start with:

```sh
engineeringspec doctor . --spec-dir docs/engineering-specs --base origin/main --strict
engineeringspec status --spec-dir docs/engineering-specs --base origin/main --strict
```

## Base ref does not resolve

Fetch the trusted default branch and pass its explicit ref, for example `origin/main` or `origin/trunk`. CI checkouts need sufficient history. Do not fall back to a workspace contract to make enforcement pass.

## No eligible EngineeringSpec

For a non-empty change, approve and merge the applicable contract-only PR first. For a clean repository, zero eligible contracts is a normal `not_applicable` result.

## Uncovered path (`ESRT002`)

The approved base contains no writable target for the path. Confirm the path is actually needed. If so, merge a contract-only target amendment before implementation.

## Ambiguous path (`ESRT003`)

More than one approved contract claims the same change. Narrow targets or close stale contracts in a governance change. Do not choose a workspace contract or suppress competing candidates.

## Denied path (`ESRT004`)

A matching `read_only` or `observe` target, or an incompatible change policy, denies the path. Denial overrides allow. Escalate to the owner rather than weakening the check locally.

## Duplicate ID (`ESRT005`)

Eligible contracts share an ID. Assign durable unique IDs in a contract-only change.

## Strict warning failure

`--strict` intentionally treats load-time warnings as failures. Resolve overlapping/incompatible targets or other warnings; do not remove strict mode from enforcing CI merely to proceed.

## Doctor reports missing guidance or CI

Preview `adopt --merge --dry-run`, review the generated files, then apply them. Existing structured workflow and Cursor files are not overwritten by default and may require a manual merge.

## A declared verifier did not run

Expected behavior: declarations are inert data. Run only checks selected by the repository's trusted development or CI workflow, then report their results against the verifier identities.

