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
4. Load the exact approved contract from the base and implement only inside its writable surfaces.
5. After trusted verification, include the exact `approved -> implemented` close in the implementation PR. Use a standalone closure only when needed.

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

Pin measurement to immutable base and head revisions and retain opaque participant, reviewer, task, and run identities. V2 measurement loads the complete approved candidate set, so contract overlap, denials, and uncovered paths remain evidence rather than being hidden by single-contract gating. Treat receipts as unsigned observations, not approvals or proof of verification. Review `--include-paths` for privacy. Do not publish quantitative scope claims unless `--require-publishable` passes, and still disclose sample size, authority breadth, metric-ineligibility reasons, negative outcomes, and the absence of causal inference.

## Release identity and immutable Action pins

An Action release cannot pin the commit that is still being created. Use two separately reviewed release commits:

1. Create and fully verify an RC runtime/version anchor with the final package version, aligned lockfile, runtime, and documentation identity.
2. After that immutable SHA exists, create the final release commit that sets `CURRENT_ACTION_SHA`, examples, and tests to the anchor SHA.
3. Fully verify again, then tag, publish npm, and create the GitHub release from the final reviewed state.

RC14 Commit A keeps `ed2f0acaaa220baa574e97a200535373eca5aa0b` because it already contains the required RC14 routing semantics. Commit B replaces it with Commit A's full immutable SHA before publication.

Release verification should use a full-history checkout and inspect the pinned object itself without adding network access to ordinary unit tests. At minimum, confirm the commit exists and that its routing source contains mixed monotonic-close classification, unsafe mixed-close rejection, and unrelated-close rejection:

```sh
git cat-file -e '<action-sha>^{commit}'
git show '<action-sha>:src/routing/governance.ts'
git show '<action-sha>:src/routing/select.ts'
```

The release reviewer should record the inspected SHA and capability result. Checking only the current checkout does not prove the pinned commit has those capabilities.
