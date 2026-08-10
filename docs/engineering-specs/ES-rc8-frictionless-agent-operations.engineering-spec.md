---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-rc8-frictionless-agent-operations
title: Frictionless agent operations, discovery, and architecture bridge
status: implemented
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
base_revision: "2bc3065"
---

# Frictionless agent operations, discovery, and architecture bridge

Turn the RC7 trust loop into an easier day-to-day product for coding agents and engineering teams. The change should remove adoption and lifecycle friction observed during private-repository dogfooding, add deterministic discovery and review surfaces, and establish a read-only bridge from architecture metadata to proposed engineering guardrails without weakening base-pinned authority.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: maintainer-only roadmap
  title: EngineeringSpec roadmap after RC7
- id: SRC-2
  type: other
  ref: consumer-dogfood-2026-08
  title: Sanitized private consumer dogfood findings covering version drift, mixed lifecycle changes, and CI remediation
- id: SRC-3
  type: document
  ref: rfcs/0001-agent-first-trust-loop.md
  title: Agent-first trust-loop RFC
- id: SRC-4
  type: document
  ref: rfcs/0005-portable-contract-governance-lane.md
  title: Portable contract-governance lane RFC
```

## Target surfaces

```engineering-targets
- id: TARGET-adoption-health
  component: adoption-and-version-health
  paths:
    - src/cli/adopt.ts
    - src/cli/doctor.ts
    - src/cli/version.ts
    - src/adoption/**
    - test/unit/doctor.test.ts
    - test/integration/cli.test.ts
  change_policy: modify
- id: TARGET-lifecycle
  component: lifecycle-assistance
  paths:
    - src/cli/program.ts
    - src/cli/status.ts
    - src/cli/transition.ts
    - test/unit/status.test.ts
    - test/unit/transition.test.ts
    - test/integration/cli.test.ts
  change_policy: modify
- id: TARGET-diagnostics
  component: actionable-routing-diagnostics
  paths:
    - src/diagnostics/**
    - src/routing/governance.ts
    - src/routing/route.ts
    - src/routing/types.ts
    - test/unit/diagnostic-codes.test.ts
    - test/unit/governance.test.ts
    - test/unit/routing.test.ts
    - test/integration/routing.test.ts
  change_policy: modify
- id: TARGET-catalogue
  component: deterministic-contract-catalogue
  paths:
    - src/catalogue/**
    - src/cli/catalogue.ts
    - src/query/**
    - src/index.ts
    - test/unit/catalogue.test.ts
    - test/integration/catalogue.test.ts
    - test/fixtures/catalogue/**
  change_policy: modify
- id: TARGET-architecture
  component: read-only-architecture-adapters
  paths:
    - src/architecture/**
    - src/cli/architecture.ts
    - schemas/architecture-map-0.1.schema.json
    - test/unit/architecture.test.ts
    - test/integration/architecture.test.ts
    - test/fixtures/architecture/**
  change_policy: modify
- id: TARGET-agent-integrations
  component: portable-agent-integrations
  paths:
    - skills/engineering-spec/**
    - integrations/**
    - src/cli/templates.ts
    - test/integration/cli.test.ts
  change_policy: modify
- id: TARGET-documentation
  component: documentation-and-static-explorer
  paths:
    - README.md
    - maintainer-only roadmap
    - CHANGELOG.md
    - docs/**
    - site/**
    - scripts/generate-site.mjs
    - rfcs/0006-frictionless-agent-operations.md
  change_policy: modify
- id: TARGET-package
  component: package-surface
  paths:
    - package.json
    - package-lock.json
    - tsconfig.build.json
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-1
  level: must
  statement: Doctor must deterministically detect drift among the running CLI version, managed agent guidance, and immutable GitHub Action pin using only bounded repository-local reads, and must provide exact remediation without network access or mutation.
  applies_to: [TARGET-adoption-health]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-2
  level: must
  statement: Adoption upgrade must support a dry-run and may update only recognizably managed EngineeringSpec content or exact immutable pins; ambiguous or user-owned structured content must fail closed or remain untouched.
  applies_to: [TARGET-adoption-health, TARGET-agent-integrations]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-3
  level: must
  statement: Lifecycle assistance must make proposed, approved, implemented, superseded, and rejected transitions understandable and must offer a deterministic status-only transition preview; filesystem writes require an explicit option, preserve all non-status bytes, validate before and after, and never commit, push, merge, or infer human approval.
  applies_to: [TARGET-lifecycle]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-4
  level: must
  statement: Mixed contract and implementation changes must retain implementation classification and approved-base enforcement while diagnostics identify why contract-only handling was unavailable and recommend splitting the change without suggesting a bypass.
  applies_to: [TARGET-diagnostics, TARGET-lifecycle]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-5
  level: must
  statement: Catalogue and search output must be deterministic, bounded, validation-aware, and available as stable JSON containing lifecycle, ownership, targets, constraints, contracts, verification identities, source references, and path-impact relationships without exposing verifier command payloads in agent-facing summaries.
  applies_to: [TARGET-catalogue]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-6
  level: must
  statement: The static Explorer must be generated from maintained documentation and deterministic catalogue data, work without a server or telemetry, provide accessible search and lifecycle/ownership/impact views, and escape all repository-controlled content before rendering.
  applies_to: [TARGET-catalogue, TARGET-documentation]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-7
  level: must
  statement: The first architecture adapter must consume a bounded Backstage-style component catalogue and emit a deterministic read-only architecture map of components, owners, dependencies, standards, and explicitly annotated path mappings with source provenance.
  applies_to: [TARGET-architecture]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-8
  level: must_not
  statement: Architecture metadata, imported mappings, catalogue results, UI state, skills, adapters, and plugins must never grant implementation authority, alter routing decisions, execute declared runners, or silently write EngineeringSpec contracts; they may only explain existing authority or propose reviewable contract-only changes.
  applies_to: [TARGET-architecture, TARGET-catalogue, TARGET-agent-integrations, TARGET-diagnostics]
  enforcement: { kind: review, reviewer_role: security-maintainer }
- id: CON-9
  level: must
  statement: Agent integrations must keep one concise portable Agent Skill as the primary workflow, generate neutral AGENTS.md guidance, document tested setup for Codex, Claude Code, Cursor, and ChatGPT-compatible repository workflows, and isolate any vendor adapter or plugin from the core format and authorization logic.
  applies_to: [TARGET-agent-integrations, TARGET-documentation]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-10
  level: must
  statement: Documentation must provide a role-based quick start, first-change tutorial, lifecycle and maintenance runbooks, upgrade guidance, complete CLI reference, architecture-bridge threat model, integration matrix, troubleshooting decision tree, and copy-paste examples that use immutable released identities where enforcement matters.
  applies_to: [TARGET-documentation, TARGET-agent-integrations]
  enforcement: { kind: review, reviewer_role: documentation-maintainer }
- id: CON-11
  level: must
  statement: All new query, doctor, catalogue, architecture, transition-preview, parsing, validation, and inspection paths must use bounded inputs and remain inert with respect to specification-declared runners and external commands.
  applies_to: [TARGET-adoption-health, TARGET-lifecycle, TARGET-catalogue, TARGET-architecture]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-12
  level: must
  statement: The implementation must preserve format 0.1 compatibility, existing CLI defaults, exact diagnostics already covered by conformance, empty-routing success, deny-overrides, base-pinned authorization, and the opt-in contract-only governance boundary.
  applies_to: [TARGET-adoption-health, TARGET-lifecycle, TARGET-diagnostics, TARGET-catalogue, TARGET-architecture, TARGET-agent-integrations, TARGET-package]
  enforcement: { kind: test, verifier_ref: VER-2 }
- id: CON-13
  level: must
  statement: RFC 0006 and the roadmap must separate shipped capability from hypotheses, define measurable adoption outcomes, and defer broad vendor plugins or bidirectional architecture synchronization until evidence demonstrates value.
  applies_to: [TARGET-documentation]
  enforcement: { kind: review, reviewer_role: maintainer }
```

## Verification

```engineering-verification
- id: VER-1
  proves: [CON-1, CON-2, CON-3, CON-4, CON-5, CON-6, CON-7, CON-11]
  kind: test
  runner:
    type: command
    argv: [npm, test]
    network: deny
  expected: { exit_code: 0 }
- id: VER-2
  proves: [CON-12]
  kind: test
  runner:
    type: command
    argv: [npm, run, test:conformance]
    network: deny
  expected: { exit_code: 0 }
- id: VER-3
  proves: [CON-8, CON-9, CON-13]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer and security review of authority isolation, agent neutrality, adapter boundaries, and roadmap claims
- id: VER-4
  proves: [CON-10]
  kind: human_review
  runner:
    type: manual
    reference: Documentation review by a first-time adopter, coding-agent user, maintainer, and platform reviewer
```

## Rollout

```engineering-rollout
strategy: canary
steps:
  - Merge this contract-only change before implementation begins.
  - Implement adoption health, lifecycle assistance, and actionable diagnostics first and dogfood them in private consumer.
  - Add deterministic catalogue JSON and the static Explorer before enabling the read-only architecture adapter.
  - Forward-test the portable Agent Skill on a clean repository and an existing adopted repository.
  - Publish an RC8 only after full repository and conformance checks, package inspection, documentation review, and private-consumer smoke tests pass.
rollback:
  actions:
    - Keep consumers on immutable RC7 CLI and Action pins.
    - Disable or remove static Explorer and architecture-adapter entry points without changing format 0.1 or routing behaviour.
    - Revert writable lifecycle or adoption-upgrade commands independently while retaining read-only diagnostics.
  owner: EngineeringSpec maintainers
```
