# RFC: Agent-first trust loop

## Summary

Add a worktree-aware diff source, composite read-only agent checks, stable diagnostic-code uniqueness, and a two-phase contract-evolution rule to the reference tooling.

## Motivation

`gate --base <ref>` compares committed revisions and therefore cannot see staged, unstaged, or untracked files during an agent turn. In addition, switching to a workspace contract when that contract changes allows one pull request to widen its own authorization. Agents need one deterministic pre-completion check over the exact working state without weakening the approved base contract.

## Terminology

- **working state**: committed changes since the selected base plus staged, unstaged, deleted, renamed, and non-ignored untracked files.
- **contract-only change**: a change that updates an EngineeringSpec but does not rely on newly widened targets for other files in the same review unit.
- **declared coverage**: proof and enforcement links declared by the document, independent of verifier execution.

## Normative proposal

1. Stable diagnostic codes identify exactly one condition. Invalid UTF-8 uses `ESP010`; normalized-key collisions retain `ESP009`.
2. Reference tooling adds `--worktree` and `--staged` diff sources. `--worktree` includes non-ignored untracked files as additions.
3. The default base contract remains authoritative in enforcing mode. Repository CI must not automatically replace it with the workspace contract merely because the contract changed.
4. Reference tooling adds read-only `check`, `context`, and `explain` workflows. They may parse, validate, query, and gate, but must never execute declared runners. Agent context omits runner payloads, and query commands load the approved contract by default when a base ref is supplied.
5. `check --worktree` is the recommended agent self-check and must fail closed on spec ambiguity, invalid contracts, warnings under strict mode, or scope violations.

## Compatibility

Existing committed-diff and explicit `--changed` behavior remains available. `ESP009` continues to mean key collision as published by draft 0.1. Invalid UTF-8 moves to the previously unused `ESP010` before stable 0.1.

## Security considerations

Worktree collection uses argument-array Git execution, null-delimited parsing, bounded buffers, and repository-relative paths. Untracked files respect Git ignore rules. Validation and all new agent workflows remain inert. Contract evolution uses two reviews: authorize the contract first, then implement against that approved base.

## Alternatives

- Requiring agents to enumerate `--changed` paths was rejected because omissions fail open.
- Automatically trusting a workspace contract was rejected because it permits self-widening.
- Executing verification runners from `check` was rejected because specifications are untrusted input.

## Conformance changes

- Add an encoded invalid-UTF-8 fixture expecting `ESP010`.
- Retain the key-collision fixture expecting `ESP009`.
- Add diagnostic-registry uniqueness tests.
- Add worktree and staged diff integration tests, including untracked and deleted paths.
- Add strict base-loaded warning and contract-evolution regression tests.

## Reference implementation impact

The CLI gains working-state collection plus `check`, `context`, and `explain`. Agent guidance and the reusable skill use `check --worktree`. CI stops switching to workspace authorization automatically.
