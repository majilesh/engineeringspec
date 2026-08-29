# Contract lifecycle

EngineeringSpec uses one human-readable workflow around the format's lifecycle states.

For new authority, the default review boundary is two pull requests: merge one reviewed authority PR whose contract is `approved`, then merge one implementation PR that may also transition that exact contract to `implemented`. The second PR passes only when the base and head documents are semantically identical except for `metadata.status` and an optional valid `metadata.updatedAt`.

With trusted repository configuration on the base, use `engineeringspec next`, `engineeringspec work <contract-id>`, and `engineeringspec finish <contract-id>`. Explicit lower-level commands and flags remain supported for debugging and CI. `next` is informational: successful analysis is not implementation authority. Start implementation only when it reports `permission: implementation` and `work` successfully loads the exact approved trusted-base contract.

Repository source is prepared as the unpublished `@engineeringspec/cli@0.1.0-rc.17` candidate. Runnable package examples remain pinned to published RC16 until separate publication approval.

| Workflow stage | Typical contract state | Authority and outcome |
|---|---|---|
| Explore | none | Read-only discovery; no implementation authority |
| Propose | `draft` or `proposed` | Reviewable intent and scope; no implementation authority |
| Approve | `approved` after trusted-base merge | Grants path-scoped authority to the dependent implementation |
| Implement | `approved` | Coding agents consume base-pinned targets and obligations |
| Verify | `approved` | Trusted checks plus complete-working-state routing establish review evidence |
| Close | `implemented`, `superseded`, or `rejected` | Removes the contract from approved-only routing |

`status` recommends a safe next stage from observable Git and contract state. It cannot infer human approval, successful external verification, or deployment. A `blocked` result means diagnostics must be resolved before continuing.

For repositories that enable the portable governance policy, pass `--allow-contract-only` to directory-oriented `status`, `select`, and `check`. A non-empty diff wholly contained under the configured specification directory is then reported as `contract_only` after strict workspace validation. It is review content, not implementation authority or verification evidence.

## Two-phase evolution

Never widen a workspace contract and use that same unmerged content to authorize dependent code. Merge the contract-only amendment first, update the implementation branch from the trusted base, then continue. This applies even when one person or one agent performs both tasks.

Trusted maintenance sequencing preserves that boundary for overlapping approved work. A maintenance controller containing exact `engineering-authority-controls` must first be reviewed and merged as `approved`. On the next trusted base it may subtract only the pinned feature contract's positive claim for exact paths also writable by the controller. The implementation PR may close that controller exactly to `implemented`; once merged, the controller naturally leaves approved-only routing and the feature contract participates normally again. There is no suspended lifecycle state, lease, mutable activation, or workspace self-approval.

Historical replay is outside the lifecycle. It simulates an old review or finish-readiness decision from immutable commits, reports zero current authority, and performs no transition or closure write.

## Clean state

A clean repository with no approved contract reports `not_applicable`. This means there is no change to route; it does not authorize the next edit. Rerun `status` and `check` after changes appear.

## Superseding and rejecting

Use `superseded` when a reviewed replacement contract owns the change. Use `rejected` when the proposal will not proceed. Document the reason in the PR or durable source intent. Avoid leaving abandoned contracts `approved`, because they remain eligible authorization candidates.

## Closing

After repository-owned checks pass, the implementation PR may change only the exact authorizing contract lifecycle to `implemented`:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.16 finish ES-change --format markdown
npx --yes @engineeringspec/cli@0.1.0-rc.16 finish ES-change --write-closure
```

With code in the same diff, the result must say `change classification: implementation_with_monotonic_close`; a standalone closure remains `contract_only`. Any semantic edit, authority widening, or unrelated contract close fails. Require normal repository checks and maintainer review before merging. Approved-base routing still applies to every implementation path.

`finish` performs no Git operation and never executes specification runners. The lower-level transition primitive remains available for a standalone or debugging workflow:

```sh
engineeringspec transition docs/engineering-specs/change.engineering-spec.md --to implemented
engineeringspec transition docs/engineering-specs/change.engineering-spec.md --to implemented --write
```

The command validates before and after, preserves every non-status byte, and performs no Git operation. Human review and merge remain required.
