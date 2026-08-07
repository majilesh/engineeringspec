---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-gate-diff-scope
title: Fail-closed diff gate against declared targets
status: proposed
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
---

# Fail-closed diff gate against declared targets

Add `engineeringspec gate` so CI can reject changes outside declared `TARGET-*` paths and change policies. Validation remains inert; the gate is a separate trust boundary over git diffs.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: phase-a-runtime-gate
  title: Phase A gate plan (diff vs targets, PatchFlow-inspired)
```

## Target surfaces

```engineering-targets
- id: TARGET-gate
  component: gate
  paths:
    - src/gate/**
    - test/unit/gate.test.ts
  change_policy: modify
- id: TARGET-cli
  component: cli-and-exports
  paths:
    - src/cli/program.ts
    - src/diagnostics/codes.ts
    - src/index.ts
    - test/integration/cli.test.ts
    - vitest.config.ts
  change_policy: modify
- id: TARGET-ci-docs
  component: adoption-surface
  paths:
    - action.yml
    - .github/workflows/ci.yml
    - README.md
    - maintainer-only roadmap
    - SPEC.md
    - docs/**
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-1
  level: must
  statement: Gate fails closed when a changed path matches no writable target.
  applies_to: [TARGET-gate]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-2
  level: must_not
  statement: Gate must not execute verification runners or mutate the repository.
  applies_to: [TARGET-gate, TARGET-cli]
  enforcement: { kind: test, verifier_ref: VER-1 }
- id: CON-3
  level: must
  statement: CI must demonstrate gate pass and fail using explicit --changed paths.
  applies_to: [TARGET-ci-docs]
  enforcement: { kind: test, verifier_ref: VER-1 }
```

## Verification

```engineering-verification
- id: VER-1
  proves: [CON-1, CON-2, CON-3]
  kind: test
  runner:
    type: command
    argv: [npm, test]
    network: deny
  expected: { exit_code: 0 }
```

## Rollout

```engineering-rollout
strategy: none
observability:
  - CI gate smoke (pass + intentional fail)
  - optional PR gate against this spec with --base origin/main
```
