---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-precode-brief-evidence-pilot
title: Pre-code work brief and adoption evidence pilot
status: superseded
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
base_revision: "85f42b2"
---

# Pre-code work brief and adoption evidence pilot

Historical note: The pre-code brief, benchmark, measurement, evidence-integrity, and compact PermissionTicket functionality described here shipped through RC17 under later reviewed contracts. `ES-external-adopter-pilot-execution` replaces this mixed product-and-pilot proposal with narrow authority for the remaining participant-readiness and external-evidence work.

Stop expanding product breadth and test the central thesis. Add one thin pre-code work brief over existing approved-base semantics, then strengthen and run the paired benchmark—including scope precision—so real teams can evaluate whether EngineeringSpec enables safer bounded autonomy.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: _internal/roadmap.md
  title: EngineeringSpec roadmap
- id: SRC-2
  type: other
  ref: product-blueprint-review-2026-08
  title: Review of the agent change-control blueprint after merged PR 43
- id: SRC-3
  type: document
  ref: _internal/pilot-protocol.md
  title: Ten-task paired adoption pilot
- id: SRC-4
  type: document
  ref: _internal/case-studies/private-consumer-pilot.md
  title: private consumer dogfooding observations and unproven outcomes
- id: SRC-5
  type: document
  ref: _internal/launch-notes/positioning.md
  title: Bounded autonomy positioning
```

## Target surfaces

```engineering-targets
- id: TARGET-prepare
  component: approved-pre-code-work-brief
  paths:
    - src/cli/prepare.ts
    - src/query/changeBrief.ts
    - src/cli/program.ts
    - src/index.ts
    - conformance/prepare/**
    - conformance/expected-results/manifest.json
    - test/unit/prepare.test.ts
    - test/conformance/prepare.test.ts
    - test/integration/cli.test.ts
  change_policy: modify
- id: TARGET-measurement
  component: paired-agent-roi-and-scope-precision
  paths:
    - src/cli/benchmark.ts
    - benchmarks/**
    - test/unit/benchmark.test.ts
    - test/integration/cli.test.ts
  change_policy: modify
- id: TARGET-pilot
  component: external-adopter-pilot
  paths:
    - _internal/pilot-records/**
    - _internal/case-studies/**
    - _internal/launch-notes/**
    - _internal/pilot-notes.md
  change_policy: modify
- id: TARGET-agent-guidance
  component: portable-agent-preflight
  paths:
    - skills/engineering-spec/**
    - integrations/**
    - AGENTS.md
    - CLAUDE.md
    - .cursor/rules/**
    - docs/agent-integration.md
    - docs/integrations.md
  change_policy: modify
- id: TARGET-documentation
  component: evidence-first-roadmap-and-usage
  paths:
    - README.md
    - _internal/roadmap.md
    - CHANGELOG.md
    - docs/getting-started.md
    - docs/first-change-tutorial.md
    - docs/cli-reference.md
    - docs/maintaining-specs.md
    - docs/roles-and-responsibilities.md
    - docs/troubleshooting.md
    - site/**
    - scripts/generate-site.mjs
  change_policy: modify
- id: TARGET-rfc
  component: pre-code-brief-and-evidence-semantics
  paths:
    - rfcs/0007-precode-brief-evidence-pilot.md
  change_policy: modify
- id: TARGET-contract
  component: contract-lifecycle
  paths:
    - docs/engineering-specs/ES-precode-brief-evidence-pilot.engineering-spec.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-1
  level: must
  statement: The prepare command must be a thin deterministic presentation layer over existing parsing, normalization, applicability, and immutable approved-base loading rather than an independent interpretation of authorization.
  applies_to: [TARGET-prepare]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-2
  level: must
  statement: Prepare must require one explicitly identified contract, confirm that its base-loaded lifecycle is approved, and report contract identity and revision, base authority, writable surfaces, protected or read-only surfaces, applicable constraints, verifier identities, source intent and digests where available, and unresolved questions.
  applies_to: [TARGET-prepare, TARGET-agent-guidance]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-3
  level: must_not
  statement: Prepare must not select mutable workspace authority, infer or widen targets, execute or expose declared runner payloads, restrict the agent from reading code needed for correctness, hide unresolved obligations, modify files, approve a contract, or present draft, closed, missing, ambiguous, or clean state as implementation permission.
  applies_to: [TARGET-prepare, TARGET-agent-guidance]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-4
  level: must
  statement: Prepare output must remain concise and deterministic in text, Markdown, and JSON, distinguish what may be changed from what may be read, and give an actionable blocked result when base authority is not uniquely approved.
  applies_to: [TARGET-prepare]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-5
  level: must
  statement: Paired benchmark records must preserve task, repository revision, model, prompt intent, permissions, trusted checks, agent configuration, and condition identity while adding contract authoring and review time, amendment frequency, first-pass gate success, review cycles, exploration breadth, unauthorized paths changed, and unauthorized paths merged.
  applies_to: [TARGET-measurement, TARGET-pilot]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-6
  level: must
  statement: Measurement must include scope precision using an explicitly defined and comparable unit for the approved writable surface and actual changed surface, disclose how globs, added files and broad targets are counted, and prevent zero violations achieved through an uninformative catch-all target from being presented as strong bounded authority.
  applies_to: [TARGET-measurement, TARGET-pilot, TARGET-documentation]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-7
  level: must
  statement: Benchmark summaries must retain failed, slower and amended runs; distinguish observed results from examples and hypotheses; report sample size and missing data; and avoid causal, productivity, correctness, adoption or star-growth claims unsupported by retained paired inputs.
  applies_to: [TARGET-measurement, TARGET-pilot, TARGET-documentation]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-8
  level: must
  statement: The pilot protocol must start measurement immediately, use at least ten paired tasks where practical, seek evidence from two to five external users or repositories with consent, sanitize private data, record onboarding failures, and permit publication of negative or inconclusive outcomes.
  applies_to: [TARGET-pilot, TARGET-documentation]
  enforcement: { kind: review, reviewer_role: evidence-reviewer }
- id: CON-9
  level: must
  statement: Existing format 0.1 compatibility, diagnostics, deny-overrides, approved-base routing, complete-worktree collection, contract-only governance, proposal draft-only behavior, runner inertness, architecture authority isolation, review output safety, quickstart behavior, and current Action enforcement must remain compatible.
  applies_to: [TARGET-prepare, TARGET-measurement, TARGET-agent-guidance]
  enforcement: { kind: test, verifier_ref: VER-2 }
- id: CON-10
  level: must
  statement: Documentation must position EngineeringSpec as an open change-contract protocol and deterministic enforcement layer for bounded coding-agent autonomy, qualify the Terraform analogy, and keep explicit human approval before dependent implementation.
  applies_to: [TARGET-documentation, TARGET-agent-guidance, TARGET-rfc]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-11
  level: must
  statement: Governance plan or apply commands, contract inference, GitHub issue acquisition, core model calls, architecture-derived authority, dashboards, catalogue expansion, MCP, IDE extensions, broad vendor plugins, hosted control planes, and implementation generation must remain separately reviewable future work until benchmark and external-adopter evidence justify them.
  applies_to: [TARGET-rfc, TARGET-documentation]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-12
  level: must
  statement: The merged frictionless-adoption increment must be released and its approved contract closed independently before dependent implementation begins; this contract must not absorb or retroactively authorize that release lifecycle.
  applies_to: [TARGET-contract]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-13
  level: must
  statement: After implementation, trusted verification and evidence review pass, this contract must transition from approved to implemented in a separate lifecycle-only change.
  applies_to: [TARGET-contract]
  enforcement: { kind: review, reviewer_role: maintainer }
```

## Verification

```engineering-verification
- id: VER-1
  proves: [CON-1, CON-2, CON-3, CON-4, CON-5, CON-6, CON-7]
  kind: test
  runner:
    type: command
    argv: [npm, test]
    network: deny
  expected: { exit_code: 0 }
- id: VER-2
  proves: [CON-9]
  kind: test
  runner:
    type: command
    argv: [npm, run, test:conformance]
    network: deny
  expected: { exit_code: 0 }
- id: VER-3
  proves: [CON-8, CON-10, CON-11, CON-12, CON-13]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer and evidence review of external pilot design, measured claims, deferred breadth, independent release lifecycle, and final closure
```

## Rollout

```engineering-rollout
strategy: canary
steps:
  - Merge this proposal as a contract-only draft, then approve it in a separate reviewed contract-only change before dependent implementation.
  - Release the merged frictionless-adoption increment and close its contract independently before starting this contract's implementation.
  - Implement prepare only as a thin approved-base work brief over existing semantics.
  - Begin the paired benchmark and external-adopter recruitment in parallel with the small prepare implementation.
  - Publish observed scope precision, violations, corrections, time and token results with sample limitations, including negative or inconclusive findings.
  - Require evidence review before proposing governance automation, inference, new transports, dashboards, or other product breadth.
rollback:
  actions:
    - Remove the prepare entry point while retaining context, review, check and current Action enforcement.
    - Revert optional benchmark fields while retaining compatible existing paired records and raw pilot inputs.
    - Withdraw claims that cannot be reproduced from retained paired records.
  owner: EngineeringSpec maintainers
```
