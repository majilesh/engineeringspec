---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 3
id: ES-intuitive-agent-workflow
title: Make the agent workflow intuitive and diagnosable
status: implemented
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
base_revision: "3466503"
---

# Make the agent workflow intuitive and diagnosable

Turn the existing agent-first controls into a guided, agent-neutral lifecycle with read-only adoption diagnostics, deterministic workflow status, portable agent actions, and role-oriented onboarding documentation.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: rfcs/0004-intuitive-agent-workflow.md
  title: Intuitive agent workflow RFC
```

## Target surfaces

```engineering-targets
- id: TARGET-cli
  component: workflow-cli
  paths:
    - src/cli/doctor.ts
    - src/cli/status.ts
    - src/cli/program.ts
    - src/index.ts
  change_policy: modify
- id: TARGET-tests
  component: workflow-verification
  paths:
    - test/unit/doctor.test.ts
    - test/unit/status.test.ts
    - test/integration/cli.test.ts
  change_policy: modify
- id: TARGET-guidance
  component: agent-and-team-guidance
  paths:
    - README.md
    - maintainer-only roadmap
    - CHANGELOG.md
    - docs/agent-integration.md
    - docs/getting-started.md
    - docs/first-change-tutorial.md
    - docs/lifecycle.md
    - docs/roles-and-responsibilities.md
    - docs/maintaining-specs.md
    - docs/troubleshooting.md
    - skills/engineering-spec/SKILL.md
    - AGENTS.md
    - CLAUDE.md
    - .cursor/rules/engineering-spec.mdc
  change_policy: modify
- id: TARGET-contract
  component: lifecycle-contract
  paths:
    - docs/engineering-specs/ES-intuitive-agent-workflow.engineering-spec.md
    - rfcs/0004-intuitive-agent-workflow.md
  change_policy: modify
- id: TARGET-ci
  component: repository-enforcement
  paths:
    - .github/workflows/ci.yml
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-1
  level: must
  statement: The documented workflow must use the stages explore, propose, approve, implement, verify, and close while making clear that only a merged approved base contract authorizes implementation.
  applies_to: [TARGET-guidance]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-2
  level: must
  statement: Doctor must deterministically diagnose Git worktree, base-ref, specification-directory, validation, lifecycle-count, neutral agent-guidance, and enforcing-CI readiness with actionable remediations in text and JSON output.
  applies_to: [TARGET-cli, TARGET-tests]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-3
  level: must
  statement: Status must summarize the resolved base, candidate lifecycle counts, complete working-state paths, selected approved contracts, routed targets, declared coverage, and a safe next lifecycle action.
  applies_to: [TARGET-cli, TARGET-tests]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-4
  level: must
  statement: For non-empty changes status must reuse approved-only base-pinned routing and fail closed for invalid, strict-warning, duplicate, uncovered, ambiguous, or denied candidates; clean state must be reported as not_applicable rather than authorized.
  applies_to: [TARGET-cli, TARGET-tests]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-5
  level: must_not
  statement: Doctor, status, and portable agent actions must not mutate the repository, execute declared runners, contact external providers, load mutable workspace contracts as authority, expose runner payloads, or autonomously approve or close contracts.
  applies_to: [TARGET-cli, TARGET-tests, TARGET-guidance]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-6
  level: must
  statement: Existing validation, gate, select, check, context, explain, adopt, benchmark, routing, diagnostics, and exit-code behavior must remain compatible.
  applies_to: [TARGET-cli, TARGET-tests]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-7
  level: must
  statement: The portable Agent Skill and repository guidance must express the same vendor-neutral lifecycle and use thin actions over the on-disk format and CLI rather than vendor-specific core behavior.
  applies_to: [TARGET-guidance]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-8
  level: must
  statement: Onboarding documentation must include a guided first change, role boundaries, lifecycle maintenance, troubleshooting, private-repository use, and the separately trusted verification rule.
  applies_to: [TARGET-guidance]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-9
  level: must_not
  statement: This increment must not change the EngineeringSpec format or schema, add a hosted UI or autonomous executor, or allow architecture sources to directly grant implementation authority.
  applies_to: [TARGET-cli, TARGET-tests, TARGET-guidance, TARGET-contract]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-10
  level: must
  statement: The implementation must include adversarial tests for missing refs and directories, invalid and warning-bearing contracts, non-Git directories, non-empty uncovered or ambiguous changes, ignored untracked files, and clean repositories with no approved contract.
  applies_to: [TARGET-tests]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-11
  level: must
  statement: Filesystem and Git inspection must be bounded and must not expose repository credentials, environment secrets, verification command payloads, or unrelated file contents.
  applies_to: [TARGET-cli, TARGET-tests]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-12
  level: must
  statement: Roadmap and release notes must retain benchmarks, consumer pilots, ProductSpec Git-tree loading, compatibility review, schema adapters, and measured read-only MCP as future work while placing search and architecture adapters after workflow usability evidence.
  applies_to: [TARGET-guidance]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-13
  level: must
  statement: After trusted checks pass, the implementation must transition this contract from approved to implemented without widening its target surfaces.
  applies_to: [TARGET-contract]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-14
  level: must
  statement: Pull-request enforcement must use approved-only base-pinned directory routing as its single authorization decision; compatible single-spec behavior may remain tested but must not be hard-coded to a historical contract for repository PR gating.
  applies_to: [TARGET-ci, TARGET-tests]
  enforcement: { kind: test, verifier_ref: VER-1 }
```

## Verification

```engineering-verification
- id: VER-1
  proves: [CON-2, CON-3, CON-4, CON-5, CON-6, CON-10, CON-11, CON-14]
  kind: test
  runner:
    type: command
    argv: [npm, test]
    network: deny
  expected: { exit_code: 0 }
- id: VER-2
  proves: [CON-1, CON-7, CON-8, CON-9, CON-12, CON-13]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer review of lifecycle clarity, role boundaries, trust boundaries, roadmap ordering, and contract closure
```

## Rollout

```engineering-rollout
strategy: canary
steps:
  - Merge this RFC and approved contract through the contract-only governance lane.
  - Implement the CLI and guidance against this contract loaded from the merged base.
  - Dogfood doctor, status, and the guided lifecycle in this repository and one private consumer repository.
  - Record onboarding friction and paired-task results before selecting a UI, MCP, or architecture adapter investment.
rollback:
  actions:
    - Remove the additive doctor and status commands while retaining the existing agent-first commands.
    - Revert generated guidance to the RC5 workflow without changing format or routing semantics.
  owner: EngineeringSpec maintainers
```
