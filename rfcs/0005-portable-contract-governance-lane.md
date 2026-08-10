# RFC: Portable contract-governance lane

- Status: proposed
- Scope: consumer CLI checks, GitHub Action enforcement, generated adoption guidance, and lifecycle status

## Problem

EngineeringSpec requires implementation to be authorized by a contract loaded from the trusted base. That prevents a pull request from widening its own authority. Contract creation, amendment, and lifecycle closure are intentionally different: they establish or retire future authority and must never authorize implementation in the same review unit.

The reference repository has a path-constrained governance lane for these changes, but RC6 does not expose an equivalent portable policy to adopters. Consequently, a consumer following the documented `close` stage receives `ESRT002` when changing only an EngineeringSpec from `approved` to `implemented`. Generated CI has the same mismatch. Teams must hand-edit workflow policy or bypass a required check, which makes the safe lifecycle harder to follow than the unsafe workaround.

## Decision

Add an explicit, opt-in contract-governance mode to directory-oriented `select`, `check`, and `status`, and to the GitHub Action. Generated adoption scaffolds enable it for their configured specification directory.

A change is contract-only only when:

1. the collected change set is non-empty;
2. every old and new path, including both sides of renames and copies, is contained under the normalized repository-relative specification directory;
3. the workspace specification directory validates successfully under the requested strictness; and
4. no implementation, workflow, RFC, general documentation, or other repository path is present.

Contract-only mode skips implementation routing because no implementation path is being authorized. It returns a distinct machine-readable classification rather than pretending that a base contract selected the change. Base candidates still load and validate fail closed, and workspace contracts validate as untrusted review content. Declared verification runners remain inert.

Without the explicit option, existing approved-only routing and `ESRT002` behavior remain unchanged. If even one path falls outside the specification directory, the complete change set goes through normal base-pinned routing. A mixed contract-and-code pull request therefore cannot use the governance lane to self-authorize.

`status` reports the governance classification and recommends `close` for a lifecycle-only transition out of `approved`; otherwise it recommends contract review. It does not infer completion from Git history and does not mutate, approve, reject, supersede, or close a contract.

## GitHub Action and adoption

The Action receives an explicit boolean input for contract-only governance. When enabled with `gate-spec-dir`, it uses the same CLI classification and strict validation instead of duplicating shell path logic. It is invalid with the single-spec gate.

Generated adoption guidance and workflows enable the option. Existing consumers remain compatible and may opt in by updating their immutable Action pin and workflow input. Documentation must state that CODEOWNERS, required review, protected branches, and normal repository checks remain responsible for approving governance changes.

## Security properties

- Workspace contract content never authorizes implementation in the same change.
- Classification uses repository-relative normalized paths and rejects absolute paths, parent traversal, malformed Git records, and cross-boundary renames.
- Empty repositories do not gain authority from the option.
- Mixed changes retain normal fail-closed routing.
- Invalid or warning-bearing workspace contracts fail under strict mode.
- The feature is read-only and never executes declared runners or external commands from specification data.

## Compatibility and conformance

This is an additive CLI and Action policy, not a change to EngineeringSpec document format `0.1`. Existing commands retain their behavior unless the option is supplied. Conformance vectors cover specification-only changes, mixed changes, empty changes, nested paths, prefix-confusion paths, and renames crossing the governance boundary.

## Rollout

1. Merge the matching approved contract without implementation changes.
2. Implement and test the shared classifier, CLI surfaces, Action input, adoption template, and documentation.
3. Publish a new release candidate from a separately reviewed release contract.
4. Upgrade the private consumer consumer and complete its pending Revenue Inbox contract closure without bypassing CI.
