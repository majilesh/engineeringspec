# RFC 0004: Intuitive agent workflow

- Status: accepted for implementation
- Owners: EngineeringSpec maintainers
- Scope: CLI adoption diagnostics, lifecycle visibility, portable agent guidance, and onboarding documentation

## Problem

EngineeringSpec already provides deterministic validation, base-pinned authorization, relevant context, and complete-working-state checks. The individual controls are useful, but a new team still has to assemble them into a safe lifecycle. The current documentation explains commands more clearly than it explains when a product owner, architect, maintainer, coding agent, reviewer, or CI system should act.

This creates three adoption risks:

1. teams may treat a draft or workspace contract as implementation authority;
2. agents may skip discovery, approval, or the final complete-working-state check; and
3. maintainers may struggle to diagnose an incomplete installation or understand the current contract lifecycle.

The next increment should make the existing trust model easier to follow. It must not turn EngineeringSpec into a project planner, autonomous executor, hosted evidence platform, or vendor-specific agent framework.

## Decision

EngineeringSpec will present one memorable lifecycle:

```text
explore -> propose -> approve -> implement -> verify -> close
```

- **Explore** is read-only discovery of repository context and possible change surfaces. It grants no authority.
- **Propose** creates or edits a draft contract describing intent, targets, constraints, and verification obligations.
- **Approve** is a maintainer-owned, contract-only review. Only a contract merged into the trusted base with `status: approved` can authorize dependent implementation.
- **Implement** uses base-pinned context and path explanations before editing, then remains inside the approved targets.
- **Verify** runs the repository's separately trusted checks and the EngineeringSpec complete-working-state check. Specification-declared runner payloads remain inert.
- **Close** records the reviewed lifecycle transition after implementation. Historical contracts stop participating in approved-only routing.

The reference CLI will add two read-only commands:

### `engineeringspec doctor`

`doctor` diagnoses whether a repository is ready to use the workflow. It will report, in deterministic text and JSON forms:

- whether the directory is a Git worktree;
- whether the requested base ref resolves;
- whether the specification directory exists and validates;
- counts by contract lifecycle status;
- whether neutral agent guidance and enforcing CI integration are present; and
- clear remediations for missing or invalid setup.

It must not write adoption files, modify Git state, contact providers, execute declared runners, or treat the mutable workspace as authority. A clean repository may be healthy with zero currently approved contracts.

### `engineeringspec status`

`status` explains the current EngineeringSpec workflow state for humans and agents. It will summarize:

- the immutable resolved base;
- candidate and lifecycle counts;
- the complete working-state path count;
- selected approved contracts and routed targets when changes exist;
- whether declared coverage is complete, partial, unknown, or not applicable; and
- the safest next action in the lifecycle.

For non-empty changes it must reuse the same approved-only, base-pinned routing decision as `select` and `check`. It must fail closed for uncovered, ambiguous, denied, duplicate, invalid, or warning-bearing strict candidates. For a clean state it may report `not_applicable`; this is not implementation authority.

## Portable agent actions

The packaged Agent Skill and generated neutral guidance will describe Explore, Propose, Review/Approve, Implement, Verify, and Close as thin actions over the same files and CLI. Tool-specific slash-command syntax may be documented as an optional presentation layer, but vendor behavior will not enter the format or core authorization semantics.

The actions must preserve these boundaries:

- agent exploration and proposal cannot approve their own contract;
- workspace contract edits cannot widen authorization for implementation in the same change;
- verification commands are chosen by the trusted repository workflow, not executed from untrusted spec payloads;
- lifecycle closure cannot be interpreted as verification evidence by itself; and
- generated instructions must work across Codex, Claude Code, Cursor, and other repository-aware agents without requiring a plugin.

## Documentation and adoption test

The implementation will add a guided first-change tutorial plus concise role, lifecycle, maintenance, and troubleshooting guidance. The tutorial will use a small fictional change and explicitly separate the contract-only approval from dependent implementation.

The docs will provide paths for:

- an individual developer trying the tool;
- a platform team installing merge-blocking enforcement;
- a product owner or architect contributing intent and constraints;
- a coding agent consuming approved context; and
- a maintainer closing, superseding, and troubleshooting contracts.

The existing `adopt` command remains the writer. `doctor` and `status` remain read-only. Usability should be evaluated with people unfamiliar with EngineeringSpec before introducing hosted UI, MCP transport, or broad vendor plugins.

## Compatibility and security

This increment does not change the EngineeringSpec 0.1 format, schemas, parser semantics, routing rules, or Action inputs. Existing CLI output and exit behavior remain compatible except for the addition of new commands.

All filesystem and Git inspection uses bounded, argument-array operations. Diagnostic output must not expose repository credentials, environment secrets, verification command payloads, or file contents unrelated to lifecycle diagnosis.

## Deferred work

The following remain valuable but are not part of this increment:

- searchable contract catalogue, impact graph, and read-only Explorer UI;
- ProductSpec Git-tree dereferencing;
- OpenAPI, JSON Schema, Backstage, C4/Structurizr, or ArchiMate adapters;
- read-only MCP transport;
- dangerous-command policy hooks, implementation receipts, and a trusted executor;
- hosted analytics, signed attestations, and autonomous lifecycle transitions.

Search and architecture adapters should follow only after the guided workflow is tested. Any architecture adapter must produce a traceable proposed contract for human review; architecture sources must never directly grant implementation authority.

## Rollout

1. Merge the matching contract-only PR.
2. Implement `doctor`, `status`, portable workflow guidance, and onboarding docs against the approved base contract.
3. Exercise the workflow in this repository and at least one private consumer repository.
4. Record onboarding friction and benchmark results before choosing the next adapter or UI investment.

