---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 2
id: ES-agent-ready-adoption
title: Agent-neutral repository adoption workflow
status: proposed
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
base_revision: b79c3c7
---

# Agent-neutral repository adoption workflow

Make the reference repository directly useful in CI and consistently consumable by Codex, Claude Code, Cursor, and human contributors.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: community-adoption-plan-2026-08-06
  title: High-value implementation and community adoption plan
```

## Target surfaces

```engineering-targets
- id: TARGET-1
  component: recursive-validation
  paths:
    - src/discovery/**
    - src/validator/validatePath.ts
    - src/validator/validateFile.ts
    - src/diagnostics/github.ts
    - src/diagnostics/codes.ts
    - src/cli/program.ts
    - src/index.ts
    - test/**
    - vitest.config.ts
    - .engineeringspecignore
  change_policy: modify
- id: TARGET-2
  component: github-integration
  paths:
    - action.yml
    - .github/**
  change_policy: modify
- id: TARGET-3
  component: agent-guidance
  paths:
    - AGENTS.md
    - CLAUDE.md
    - .cursor/**
    - docs/**
  change_policy: modify
- id: TARGET-4
  component: public-identity
  paths:
    - site/**
    - schemas/**
    - package.json
    - README.md
    - SPEC.md
    - .gitignore
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-1
  level: must_not
  statement: Parsing and validation must not execute verification commands or specification content.
  applies_to: [TARGET-1, TARGET-2]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-2
  level: must
  statement: Repository validation must discover supported EngineeringSpec filenames deterministically and respect explicit ignore patterns.
  applies_to: [TARGET-1]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-3
  level: must
  statement: Codex, Claude Code, and Cursor guidance must share one agent-neutral workflow.
  applies_to: [TARGET-3]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-4
  level: must
  statement: Published versioned schema URLs must remain immutable after release.
  applies_to: [TARGET-4]
  enforcement: { kind: review, reviewer_role: maintainer }
```

## Verification

```engineering-verification
- id: VER-1
  proves: [CON-1, CON-2]
  kind: test
  runner:
    type: command
    argv: [npm, test]
    network: deny
  expected: { exit_code: 0 }
- id: VER-2
  proves: [CON-3, CON-4]
  kind: human_review
  runner:
    type: manual
  description: Confirm agent neutrality and immutable public schema routing.
```

## Rollout

```engineering-rollout
strategy: none
observability:
  - GitHub Action validation success
  - external repository adoption
```
