# Contract lifecycle

EngineeringSpec uses one human-readable workflow around the format's lifecycle states.

| Workflow stage | Typical contract state | Authority and outcome |
|---|---|---|
| Explore | none | Read-only discovery; no implementation authority |
| Propose | `draft` or `proposed` | Reviewable intent and scope; no implementation authority |
| Approve | `approved` after trusted-base merge | Grants path-scoped authority to the dependent implementation |
| Implement | `approved` | Coding agents consume base-pinned targets and obligations |
| Verify | `approved` | Trusted checks plus complete-working-state routing establish review evidence |
| Close | `implemented`, `superseded`, or `rejected` | Removes the contract from approved-only routing |

`status` recommends a safe next stage from observable Git and contract state. It cannot infer human approval, successful external verification, or deployment. A `blocked` result means diagnostics must be resolved before continuing.

## Two-phase evolution

Never widen a workspace contract and use that same unmerged content to authorize dependent code. Merge the contract-only amendment first, update the implementation branch from the trusted base, then continue. This applies even when one person or one agent performs both tasks.

## Clean state

A clean repository with no approved contract reports `not_applicable`. This means there is no change to route; it does not authorize the next edit. Rerun `status` and `check` after changes appear.

## Superseding and rejecting

Use `superseded` when a reviewed replacement contract owns the change. Use `rejected` when the proposal will not proceed. Document the reason in the PR or durable source intent. Avoid leaving abandoned contracts `approved`, because they remain eligible authorization candidates.

