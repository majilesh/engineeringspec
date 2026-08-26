# RFC 0012: Compact agent permission tickets

- Status: Proposed implementation of approved contract
- Contract: `ES-compact-agent-ticket`, revision 2

## Scope and invariant

This increment changes the agent-facing projection of existing deterministic reports, not authority. `next` continues to compose `status`; `work` continues to compose `prepare`. Only the exact approved contract loaded from the reviewed trusted base grants implementation permission. Workspace/head specifications, prompts, classification, and success exit codes cannot grant or widen it. Specification runners remain inert.

## Next ticket

The default `next --format json` object contains:

| Field | Existing source |
| --- | --- |
| `permission` | Existing `NextReport.permission`, unchanged |
| `workflowState` | Existing lifecycle stage |
| `currentChangeClassification` | Exact `status.routing.governance.classification` |
| `command` | Existing next action, or a diagnostic command for a blocked route |
| `approvedIds` | Sorted unique eligible trusted-base candidate IDs |
| `proposedIds` | Sorted unique trusted-base draft/proposed candidate IDs |
| `blockers` | Error diagnostics and blocking warnings, retaining code/message/path |

The classification enum is unchanged: `none`, `contract_only`, `implementation`, `implementation_with_monotonic_close`. `none` means no currently observed changed paths. No final lane is predicted. Classification describes the observed change, including invalid changes, and cannot upgrade permission. Text names the IDs and classification instead of requiring routing-dump parsing.

## Work ticket

`work <id> --format json` projects `prepare` into `result`, `permission`, `contractId`, `baseSha`, optional available `specRevision`/`semanticDigest`, `writablePaths`, `protectedPaths`, `constraints`, `verifiers`, `technicalContracts`, and `stopWhen`. Path entries retain the target ID, path pattern, change policy, and any interface-only caveat; a flat list without policies would lose authority restrictions. Constraints retain id/level/statement, and verifier identities retain id/proves without runner payloads. Technical contracts remain visible because they are obligations, not optional organizational context.

Blocked preparations retain their reason/action and expose no new writable authority. Stop conditions require escalation for out-of-scope writes, protected paths, policy conflicts, invalid complete-state routing, unsatisfied obligations, and changed trusted base; declared unresolved questions remain visible. This output does not promise execution or successful verification.

There is no `lane`, `expectedLane`, future diff classification, or `finishMode`. `work` does not start inspecting the current diff or implement a second routing decision. A ready pre-code brief does not clear a routing blocker reported by another command.

## Blocked routing diagnostics

For uncovered, denied, or ambiguous routes, the compact `next.command` supplies `engineeringspec explain --spec-dir <directory> --base <resolved-sha> --path <blocking-path> --change-kind <kind> --strict`. Data arguments are POSIX-shell quoted. Renames use the existing router's expanded added/deleted route identity.

The additive directory form in `explain` is a thin adapter to existing `selectSpecs` with one explicit path/kind and the full approved-base candidate set. It is mutually exclusive with the existing file argument, requires a base, and rejects workspace authority. This handles ambiguity and the zero-candidate case without preferring a contract or inventing a placeholder file. Existing single-file explain behavior remains available. The diagnostic result concerns the requested path, not completion of the entire working state.

## Dogfood case

For an approved contract authorizing only specification files:

1. A clean pre-edit `next` reports implementation permission and classification `none`; `work` loads the exact base authority.
2. A complete-state check without the governance option may authorize every changed path as implementation.
3. The portable governance inspection used by `next`/`finish` may classify the same all-spec-directory diff as `contract_only`.
4. `finish` retains its existing `contract_only_no_implementation_authority` result without fabricating an implementation receipt. The change is reviewed as governance, then the authorizing contract may close separately.

These are independent authority and observed-diff facts. Neither the router nor `finish` is changed to force agreement between different workflow modes.

## Compatibility and conformance

Default JSON is an intentional CLI output migration. Existing consumers of the full reports add `--verbose`; field names, nesting, values, and exit codes remain compatible. Library report builders remain unchanged. `work` text/Markdown still returns the preparation brief; `next` text adds compact identities/classification and the actionable diagnostic command. No document-format or schema version changes.

CLI conformance vectors live within the approved test surfaces: `test/unit/next.test.ts`, `test/unit/work.test.ts`, and `test/integration/rc14.test.ts`. They cover all four classifications, exact verbose payload/exit compatibility, policy-bearing paths, inert runners, no predictions, hostile shell arguments, no-candidate/uncovered/denied/ambiguous explanations, workspace/head self-approval rejection, and the all-spec dogfood sequence. Existing format conformance tests remain unchanged and must pass.

## Non-goals

No Context Plane, ContextEnvelope, Context Provider SPI, Context Graph, architecture/ownership/dependency/standards context, inferred impact, external knowledge retrieval, MCP, ACP, hosted service, telemetry, or format 0.2 is introduced. A future read-only contextual knowledge envelope remains independent of the permission projection. No release or publication is part of this increment.
