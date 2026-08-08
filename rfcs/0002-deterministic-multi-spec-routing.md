# RFC: Deterministic multi-spec routing

## Summary

Add a fail-closed router that discovers approved EngineeringSpecs from one immutable Git base, assigns every changed path to exactly one allowing contract, and rejects uncovered, denied, or ambiguous changes. Expose the router through a read-only `select` command, multi-spec `check`, and the GitHub Action without weakening the existing single-spec workflow.

## Motivation

The current gate accepts one static specification path. That is safe for a single active change contract, but it does not scale to repositories with multiple teams or concurrent approved changes: adopters must hand-edit CI to choose a spec, and an agent can be given the wrong contract. Selection is authorization, so convenience heuristics or workspace discovery would create a new trust-boundary hole.

## Terminology

- **candidate directory**: a repository-relative directory whose supported EngineeringSpec files are enumerated from a resolved base commit.
- **eligible contract**: a candidate that validates under the requested strictness and has an allowed lifecycle status; enforcing mode defaults to `approved`.
- **claim**: at least one target in an eligible contract matches a changed path and its change kind.
- **route**: the unique eligible contract and matching target set assigned to a changed path.
- **ambiguity**: more than one eligible contract allows the same changed path.

## Normative proposal

1. Add `engineeringspec select <directory> --base <ref>` with the existing committed, worktree, staged, and explicit-path diff sources. A base ref is mandatory even with `--changed`.
2. Resolve the base SHA once. Candidate enumeration and every candidate document load must use that same Git tree. The router must never fall back to workspace files.
3. Discover supported EngineeringSpec filenames recursively and deterministically. Validate every discovered candidate before status filtering; invalid candidates fail the operation rather than disappearing from authorization.
4. Enforcing selection considers only `approved` contracts by default. Explicit status configuration may support non-enforcing analysis, but generated CI must require `approved`.
5. Every changed path must be claimed by exactly one allowing eligible contract. Zero claims fails with `ESRT002`; multiple allowing claims fail with `ESRT003`.
6. A deny decision from any matching target in any eligible contract overrides every allow and fails with `ESRT004`. Denied paths must never be reported as ambiguous or selected.
7. No eligible approved contracts fails with `ESRT001`. Duplicate eligible specification IDs fail with `ESRT005`.
8. Results must be stable: sort candidate paths, specification IDs, changed paths, target IDs, and diagnostics by defined ordinal/code-point ordering. JSON output includes the resolved base SHA, candidate path and digest, spec ID, changed-file digest, per-path decision, matching target IDs, and diagnostics.
9. Extend `check` with a mutually exclusive `--spec-dir <directory>` mode that uses the same router over the complete working state, reports aggregate declared coverage, and remains inert.
10. Extend the Action with `gate-spec-dir`, mutually exclusive with `gate-spec`. Generated adoption CI uses the directory mode, the approved PR/merge-queue base, strict validation, and approved-only eligibility.
11. Existing single-spec `gate`, `check <file>`, receipts, exit codes, and output remain compatible. Multi-spec selection does not execute verifier runners or specification content.

## Compatibility

This is an additive reference-tooling feature. Existing single-spec commands and Action inputs keep their behavior. Repositories may continue using a static `gate-spec`; `adopt` switches to directory routing only after the routing implementation lands. The EngineeringSpec document format and schema do not change.

Lifecycle discipline is required: an implementation contract is `approved` while it authorizes its dependent change and should move to `implemented` afterward. Historical contracts therefore do not remain eligible forever. Concurrent approved contracts with overlapping writable targets must be narrowed or separated before routing can succeed.

## Security considerations

The base commit is resolved once to prevent time-of-check/time-of-use drift. Git tree enumeration uses argument arrays, null-delimited output, bounded buffers, repository-relative path validation, and fail-closed parsing. Candidate validation happens before filtering so malformed approved-area content cannot be silently ignored. Workspace additions, edits, renames, and deletions cannot create, remove, or widen candidate authorization in the same change. Cross-document deny-wins prevents a broad allowing contract from overriding a narrower protected surface.

Specification runners remain inert data. `select`, multi-spec `check`, validation, discovery, and context construction must not spawn declared commands or mutate the repository.

## Alternatives

- Selecting the nearest spec by directory was rejected because repository layout is not an authorization rule.
- Reading a spec path from the PR body was rejected as the sole mechanism because mutable review metadata can omit competing denials.
- Treating all allowing overlaps as valid was rejected because the agent would receive conflicting ownership and obligations.
- Filtering by status before validation was rejected because malformed candidates could disappear silently.
- Loading candidate lists from the workspace was rejected because a PR could remove or replace its governing contract.

## Conformance changes

- Add fixtures for zero eligible specs, uncovered paths, unique routing, ambiguity, cross-spec deny-wins, duplicate IDs, invalid candidates, and strict-warning failure.
- Add Git-backed integration cases proving workspace edits cannot add, remove, or widen base candidates.
- Add worktree cases for staged, unstaged, deleted, renamed, ignored, and non-ignored untracked paths.
- Add deterministic-order and inert-runner regressions for text and JSON output.
- Register `ESRT001` through `ESRT005` and retain the one-code/one-condition uniqueness invariant.

## Reference implementation impact

Add a routing module shared by `select`, multi-spec `check`, and the Action. Extend Git-tree discovery/load helpers rather than duplicating shell parsing. Update `adopt`, agent guidance, the portable skill, production documentation, and benchmarks to use or record routed selection. Keep the core format vendor-neutral and the routing surface read-only.
