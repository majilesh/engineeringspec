# Getting started

EngineeringSpec gives product, architecture, engineering, coding agents, reviewers, and CI one versioned change contract. It works in public and private Git repositories and does not require a hosted service or vendor plugin.

## Choose an adoption path

### Try one change

Install or invoke the pinned CLI, create `docs/engineering-specs/`, and follow the [first-change tutorial](first-change-tutorial.md). Keep enforcement advisory until the team understands the two-PR lifecycle.

### Adopt in an established repository

Preview neutral agent and GitHub Actions integration without overwriting existing files:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.5 adopt . \
  --spec docs/engineering-specs/ES-first-change.engineering-spec.md \
  --merge --dry-run
```

Review the preview, rerun without `--dry-run`, and diagnose the installation:

```sh
engineeringspec doctor . \
  --spec-dir docs/engineering-specs --base origin/main --strict
```

`doctor` is read-only. It checks Git/base availability, workspace validation, base contract lifecycles, AGENTS.md guidance, and approved-only CI configuration. It never executes commands declared inside a spec.

Until the next release candidate is published, build this repository and invoke new `doctor`/`status` commands as `node dist/cli.js`; RC5 does not contain them.

### Install merge-blocking enforcement

Follow [Production gate](production-gate.md). Protect the EngineeringSpec job as a required check and require maintainer ownership for contracts. Start with a small team or repository and retain an explicit exception process.

## Daily commands

```sh
# Understand the current lifecycle and routing state
engineeringspec status \
  --spec-dir docs/engineering-specs --base origin/main --strict

# Load only the obligations relevant to an expected path
npx --yes @engineeringspec/cli@0.1.0-rc.5 context <approved-spec> \
  --path src/example.ts --base origin/main --format markdown

# Check the complete working state before review
npx --yes @engineeringspec/cli@0.1.0-rc.5 check \
  --spec-dir docs/engineering-specs --base origin/main --strict
```

Use the repository-local binary when installed. Pin an exact package version and Action commit in enforcement; avoid mutable tags for trust-sensitive CI.

## What success looks like

- A newcomer can explain the six lifecycle stages.
- Every consequential changed path maps to one approved contract.
- Reviewers can identify the relevant constraints and verification obligations.
- Agents fail visibly when scope is missing, ambiguous, or denied.
- The team records whether scope violations and review corrections decrease over paired tasks.
