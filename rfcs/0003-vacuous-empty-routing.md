# RFC: Routing lifecycle edge cases

## Summary

Treat a successfully inspected working state with zero changed paths as a successful, not-applicable routing result even when the resolved base contains no lifecycle-eligible EngineeringSpec. Preserve `ESRT001` for every non-empty implementation change set that has no eligible contract, and add a narrow repository CI lane for contract-only changes so the next authorization contract can be reviewed without an already-active contract.

## Motivation

Multi-spec routing currently reports `ESRT001` whenever no candidate has an eligible lifecycle status. That is correct when a changed path needs authorization, but it also rejects a clean repository after all historical contracts have transitioned to `implemented`. The result makes the recommended agent self-check fail when there is nothing to authorize.

Authorization is a predicate over changes. An empty change set satisfies the scope obligation vacuously: no path is allowed, denied, selected, or left uncovered. Returning success in that case does not grant authority for a later change because routing recomputes the complete working state on every invocation.

The same lifecycle exposes a repository-governance bootstrap problem. After the final active contract closes, a PR whose only purpose is to add the next RFC and approved contract cannot be authorized by the base directory router. Treating that PR like implementation creates a permanent need for protected-branch overrides. A narrowly classified contract-only lane can solve this without allowing code, workflow, schema, package, or general documentation changes to self-authorize.

## Normative proposal

1. Candidate discovery, immutable base resolution, document loading, and validation run exactly as they do today, including in an empty working state.
2. After successful candidate loading and changed-path collection, a zero-length changed set returns success with no routes and no routing diagnostics, even when zero candidates have a required lifecycle status.
3. The result retains the resolved base SHA, all candidate summaries and digests, the required statuses, an empty changed digest, and deterministic candidate ordering.
4. Human-readable output reports zero changed and zero selected paths. Multi-spec `check` reports declared coverage as `not_applicable`.
5. If one or more changed paths exist and zero candidates are eligible, routing continues to fail with `ESRT001` before path selection.
6. Eligible duplicate specification IDs continue to fail with `ESRT005`, including for an empty change set. Other candidate validation failures also remain fatal.
7. `select`, multi-spec `check`, and `gate-spec-dir` share this behavior. Single-spec commands are unchanged.
8. No routing, validation, discovery, or inspection path executes specification-declared runners or mutates the repository.

## Contract-only repository CI

9. Repository CI may classify a pull-request or merge-group diff as contract-only only when every changed path is under `docs/engineering-specs/` or `rfcs/`.
10. Contract-only classification uses the base-to-head Git diff. An empty path list, parse failure, or any path outside those two directories must not enter the bypass lane.
11. A contract-only change skips implementation diff authorization, because its purpose is to establish future authorization. Strict EngineeringSpec validation, normal build/lint/typecheck/tests/conformance, and maintainer review remain required.
12. `docs/engineering-specs/`, `rfcs/`, the classification workflow, and CODEOWNERS remain maintainer-owned. A mixed contract-and-implementation PR always uses normal approved-base routing and fails closed when no eligible contract exists.
13. This repository-specific bootstrap lane does not change the portable router or generated adopter workflow. Adopters may implement an equivalent reviewed policy appropriate to their own governance model.

## Security considerations

This exception is based only on the trusted diff collector's complete result, not a user assertion that the workspace is clean. The next invocation observes committed, staged, unstaged, deleted, renamed, and non-ignored untracked paths. As soon as any path exists, the approved-contract requirement and `ESRT001` fail-closed behavior apply normally.

Invalid candidates are still rejected before the empty-input decision, preventing malformed base content from being hidden by a clean diff. Duplicate eligible IDs remain a configuration error so deterministic identity guarantees do not depend on whether a diff happens to be empty.

The contract-only lane is path-constrained rather than content-authorizing: it cannot carry source, tests, Actions, schemas, package metadata, or general documentation. Contract contents are still strictly validated and require maintainer review. Implementation remains a separate PR evaluated against the newly merged base contract.

## Compatibility

The router change narrows one failure condition without changing the EngineeringSpec document format or schema. Consumers that use a clean `select` or multi-spec `check` as an agent completion guard will receive success instead of `ESRT001`. Non-empty router behavior and all diagnostic codes remain compatible. The contract-only lane affects this repository's CI policy only.

## Conformance changes

- Add a vector proving zero changed paths and zero eligible contracts succeeds with no routes or diagnostics.
- Retain a vector proving a non-empty change set and zero eligible contracts fails with `ESRT001`.
- Add or retain coverage proving duplicate eligible IDs fail on an empty change set.
- Add CLI integration coverage for clean `select` and multi-spec `check` against a base containing only historical contracts.
- Retain complete-worktree and inert-runner regressions.
- Add a CI regression proving only RFC/spec-only diffs enter the contract lane and mixed diffs remain gated.

## Lifecycle bootstrap

At the time this RFC is proposed, the repository intentionally has no `approved` contracts: the RC4 release contract transitioned to `implemented`. The contract-only PR containing this RFC and its new authorization contract therefore cannot satisfy the existing approved-only directory gate. Maintainers must review and merge that strictly declarative PR using the repository's protected-branch override. The dependent implementation PR then loads the new approved contract from its merged base and installs the permanent contract-only lane, so later lifecycle transitions do not require this bootstrap override.
