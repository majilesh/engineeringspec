---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 2
id: ES-compact-agent-ticket
title: Compact agent permission ticket
status: approved
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
---

# Compact agent permission ticket

Make `next` and `work` produce a small, named permission ticket that coding agents can obey without parsing maintainer routing dumps. Keep trusted-base permission separate from the current working-diff classification, preserve fail-closed routing and inert specification runners, and retain existing full JSON behind an explicit verbose flag.

This contract grants no implementation authority while `draft` or `proposed`. RFC 0012 is created only after this contract is approved on the trusted base.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: rfcs/0011-maximum-safety-minimum-ceremony.md
  title: RC14 promised a stable agent JSON envelope that next still over-emits
- id: SRC-2
  type: other
  ref: agent-loop-friction-2026-08-18
  title: Coding-agent review of next/work ceremony, skipped CLI invocation, and blocked recovery
- id: SRC-3
  type: document
  ref: docs/engineering-specs/ES-rc14-maximum-safety-minimum-ceremony.engineering-spec.md
  title: Implemented next/work/finish composition
- id: SRC-4
  type: document
  ref: AGENTS.md
  title: Current contributor workflow still uses node dist/cli.js while the skill uses engineeringspec
- id: SRC-5
  type: other
  ref: stale-proposed-cleanup-dogfood-2026-08
  title: Trusted-base implementation permission and a later contract-only workflow classification are compatible independent results
```

## Target surfaces

```engineering-targets
- id: TARGET-rfc
  component: compact-ticket-rfc
  paths:
    - rfcs/0012-compact-agent-ticket.md
  change_policy: create
- id: TARGET-next
  component: next-permission-ticket
  paths:
    - src/cli/next.ts
    - src/cli/status.ts
    - src/cli/program.ts
  change_policy: modify
- id: TARGET-work
  component: work-permission-ticket
  paths:
    - src/cli/work.ts
    - src/cli/prepare.ts
  change_policy: modify
- id: TARGET-tests
  component: compact-ticket-regressions
  paths:
    - test/integration/rc14.test.ts
  change_policy: modify
- id: TARGET-tests-new
  component: compact-ticket-new-unit-tests
  paths:
    - test/unit/next.test.ts
    - test/unit/work.test.ts
  change_policy: create
- id: TARGET-guidance
  component: one-invocation-agent-guidance
  paths:
    - AGENTS.md
    - CLAUDE.md
    - .cursor/rules/engineering-spec.mdc
    - skills/engineering-spec/SKILL.md
    - docs/cli-reference.md
    - docs/agent-integration.md
    - docs/getting-started.md
    - CHANGELOG.md
  change_policy: modify
- id: TARGET-contract
  component: compact-ticket-lifecycle
  paths:
    - docs/engineering-specs/ES-compact-agent-ticket.engineering-spec.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-TRUST
  level: must
  statement: Authorization remains the exact approved trusted-base contract. Compact tickets, verbose flags, and guidance edits must not create a second authorization path, infer targets from prompts, execute specification-declared runners, or let a workspace or head contract authorize its own implementation.
  applies_to: [TARGET-rfc, TARGET-next, TARGET-work, TARGET-tests, TARGET-tests-new, TARGET-guidance]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-NEXT-TICKET
  level: must
  statement: next text and default JSON must expose a compact ticket containing permission, workflowState, currentChangeClassification, command, approvedIds, proposedIds, and blockers. currentChangeClassification must be the exact existing status governance classification for the observed complete working state and must be one of none, contract_only, implementation, or implementation_with_monotonic_close. Text must name identifiers rather than only counts.
  applies_to: [TARGET-next, TARGET-tests, TARGET-tests-new]
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-NEXT-VERBOSE
  level: must
  statement: Default next JSON must omit ineligible implemented-candidate routing dumps. Explicit --verbose must preserve the current full status/routing field names, nesting, values, and exit behavior so existing maintainer consumers can opt into the pre-ticket payload without semantic migration.
  applies_to: [TARGET-next, TARGET-tests, TARGET-tests-new]
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-WORK-TICKET
  level: must
  statement: Default work JSON must include a compact ticket with result, permission, contract id, base SHA, writable paths, protected paths, constraints as id/level/statement, verifier identities as id/proves, and stopWhen. The existing brief remains available; agents must not be required to parse nested routing candidates to implement. work must not predict a final workflow classification or finish mode before the resulting complete diff exists.
  applies_to: [TARGET-work, TARGET-tests, TARGET-tests-new]
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-BLOCKED
  level: must
  statement: When next or work is blocked by an uncovered, denied, or ambiguous path, command must be an executable engineeringspec explain invocation including --path and --change-kind for at least one blocking path, not a generic resolve-diagnostics sentence.
  applies_to: [TARGET-next, TARGET-work, TARGET-tests, TARGET-tests-new]
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-DELEGATE
  level: must
  statement: next and work must continue to compose status and prepare. Compact tickets are projections of those primitives and must not reimplement routing, candidate loading, or approval.
  applies_to: [TARGET-next, TARGET-work]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-PERMISSION-CLASSIFICATION
  level: must
  statement: permission is only the existing reviewed trusted-base authority decision. currentChangeClassification describes only the observed working diff and must never grant, widen, revoke, or reinterpret permission. none means no current changed paths, not a prediction of the final lane. contract_only is a governance review lane and is semantically compatible with earlier implementation permission. finish remains the post-diff source for receipt and closure behavior and must not be changed by this increment.
  applies_to: [TARGET-next, TARGET-work, TARGET-tests, TARGET-tests-new, TARGET-guidance]
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-GOVERNANCE-DOGFOOD
  level: must
  statement: Regression coverage must include an approved trusted-base contract whose writable implementation is entirely EngineeringSpec documents. Before editing, next must retain permission implementation while currentChangeClassification is none and work must load the exact approved authority. After the authorized all-spec diff exists, next/status must project contract_only without treating it as authority or authorization failure, and finish must retain its existing contract_only_no_implementation_authority governance result rather than fabricate an implementation receipt.
  applies_to: [TARGET-next, TARGET-work, TARGET-tests, TARGET-tests-new]
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-GUIDANCE
  level: must
  statement: AGENTS.md, the portable skill, and the Cursor rule must use one invocation spelling for the daily workflow. The Cursor rule must tell agents that if the turn might write files they run next first and stop unless permission is implementation.
  applies_to: [TARGET-guidance]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-NONGOALS
  level: must_not
  statement: This increment must not add MCP, ACP, a Context Plane, Context Providers, a Context Graph, hosted services, inferred impact, external knowledge, Cursor-specific authorization, allow-path aliases, prompt-inferred propose targets, telemetry, or a new format version.
  applies_to: [TARGET-rfc, TARGET-next, TARGET-work, TARGET-guidance]
  enforcement: { kind: review, reviewer_role: maintainer }
```

## Verification

```engineering-verification
- id: VER-CONFORMANCE
  proves: [CON-NEXT-TICKET, CON-NEXT-VERBOSE, CON-WORK-TICKET, CON-BLOCKED, CON-PERMISSION-CLASSIFICATION, CON-GOVERNANCE-DOGFOOD]
  kind: test
  runner:
    type: reference
    reference: npm test and npm run test:conformance after implementation; specification runners remain inert
- id: VER-QUALITY
  proves: [CON-DELEGATE, CON-GUIDANCE]
  kind: static_analysis
  runner:
    type: reference
    reference: npm run lint, npm run typecheck, and maintainer review of next/work composition
- id: VER-REVIEW
  proves: [CON-TRUST, CON-PERMISSION-CLASSIFICATION, CON-NONGOALS]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer review that compact tickets are projections, RFC 0012 matches this contract, and listed non-goals stay out of the implementation PR
```

## Rollout

```engineering-rollout
strategy: manual
steps:
  - Review this draft without implementing code or writing RFC 0012.
  - Review the stale-proposed cleanup dogfood regression and the permission-versus-current-change-classification terminology.
  - Merge this contract-only change as approved.
  - Implement RFC 0012 and the compact ticket projection, then close this contract with the exact approved-to-implemented transition.
rollback:
  actions:
    - Keep current full next/work JSON as --verbose or restore it as default if compact projection is withdrawn.
    - Leave authorization, routing, and finish unchanged.
  owner: EngineeringSpec maintainers
```

## Non-goals

MCP, ACP, Agent Control Plane orchestration, `allow <path>` aliases, propose-from-prompt inference, discontinuing unrelated historical contracts, and a format 0.2 change remain outside this contract.

The future Context Plane remains a separate read-only `ContextEnvelope`; it may contain architecture principles, ownership, dependencies, standards, graph results, inferred impact, or external knowledge. None of those fields belong in this increment's authoritative `PermissionTicket`.
