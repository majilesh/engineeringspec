# Maintaining EngineeringSpecs

## Keep the active set small

Approved contracts participate in routing. Close them after implementation, reject abandoned proposals, and supersede replaced contracts. Run `status` regularly to find unexpected active contracts.

## Prefer narrow targets

Use repository-relative paths that match the actual change surface. Broad globs increase ambiguity and review cost. A `read_only` or `observe` target denies matching changes even when another contract allows them.

## Preserve durable identities

Keep `SRC-*`, `TARGET-*`, `CONTRACT-*`, `CON-*`, and `VER-*` identifiers stable within a contract revision so PR evidence and later analysis remain traceable. Increment `spec_revision` for meaningful contract changes.

## Evolve in two phases

1. Change only the contract/RFC and obtain maintainer approval.
2. Merge it into the trusted base.
3. Rebase or update the dependent implementation.
4. Load context from the base and implement.
5. Close the lifecycle after trusted verification and review.

Repositories using the portable governance lane should enable `gate-allow-contract-only` only with directory routing. Protect the specification directory and enforcement workflow with CODEOWNERS or equivalent maintainer review. The lane classifies review content; it does not approve it.

## Review checklist

- Source intent is durable and understandable.
- Owners and lifecycle status are correct.
- Targets cover required paths without avoidable overlap.
- Constraints are testable or assigned to an explicit reviewer/policy.
- Contract compatibility is stated honestly.
- Verification identities map to obligations, without assuming runner execution.
- Rollout and rollback match the risk.
- Exceptions are scoped, approved, and time-bounded where appropriate.

## Private repositories

Keep specs beside the code when their content is sensitive. The reference CLI reads the local checkout and Git objects; it does not send files to EngineeringSpec services. Apply normal repository access controls, secret scanning, dependency policy, and Action pinning. Do not place credentials or secret values in specs, diagnostics, runner metadata, or evidence links.

## Evidence maintenance

Pin measurement to immutable base and head revisions and retain opaque participant, reviewer, task, and run identities. Treat `measure` receipts as unsigned observations, not approvals or proof of verification. Review any use of `--include-paths` for repository privacy. Do not publish a benchmark unless `--require-publishable` passes, and still disclose sample size, authority breadth, missing or uninterpretable metrics, negative outcomes, and the absence of causal inference.
