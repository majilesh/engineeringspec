# Getting started

EngineeringSpec gives product, architecture, engineering, coding agents, reviewers, and CI one versioned change contract. It works in public and private Git repositories and does not require a hosted service or vendor plugin.

## Choose an adoption path

### Try one change

Install or invoke the pinned CLI, create `docs/engineering-specs/`, and follow the [first-change tutorial](first-change-tutorial.md). Keep enforcement advisory until the team understands the two-PR lifecycle.

Preview the complete safe scaffold:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.13 adopt . --quickstart \
  --maintainer @your-org/platform --dry-run
```

This creates a **draft** first contract, CODEOWNERS, neutral agent handoffs, and immutable GitHub enforcement. Review the output and rerun without `--dry-run`; it never approves the draft or overwrites existing files by default.

### Adopt in an established repository

Preview neutral agent and GitHub Actions integration without overwriting existing files:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.13 adopt . \
  --spec docs/engineering-specs/ES-first-change.engineering-spec.md \
  --merge --dry-run
```

Review the preview, rerun without `--dry-run`, and diagnose the installation:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.13 doctor . \
  --spec-dir docs/engineering-specs --base origin/main --strict
```

`doctor` is read-only. It checks Git/base availability, workspace validation, base contract lifecycles, AGENTS.md guidance, approved-only CI configuration, and drift between the CLI, managed guidance, and immutable Action pin. It never executes commands declared inside a spec.

### Install merge-blocking enforcement

Follow [Production gate](production-gate.md). Protect the EngineeringSpec job as a required check and require maintainer ownership for contracts. Start with a small team or repository and retain an explicit exception process.

## Daily commands

```sh
# Understand the current lifecycle and routing state
npx --yes @engineeringspec/cli@0.1.0-rc.13 status \
  --spec-dir docs/engineering-specs --base origin/main --allow-contract-only --strict

# Load only the obligations relevant to an expected path
npx --yes @engineeringspec/cli@0.1.0-rc.13 context <approved-spec> \
  --path src/example.ts --base origin/main --format markdown

# Before editing, load the complete approved pre-code brief from the trusted base
npx --yes @engineeringspec/cli@0.1.0-rc.13 prepare ES-change \
  --spec-dir docs/engineering-specs --base origin/main --strict --format markdown

# Check the complete working state before review
npx --yes @engineeringspec/cli@0.1.0-rc.13 check \
  --spec-dir docs/engineering-specs --base origin/main --allow-contract-only --strict

# Produce the same deterministic explanation for humans or a CI job summary
npx --yes @engineeringspec/cli@0.1.0-rc.13 review \
  --spec-dir docs/engineering-specs --base origin/main --strict --format markdown

# Search lifecycle, ownership, obligations and path impact
npx --yes @engineeringspec/cli@0.1.0-rc.13 catalogue docs/engineering-specs \
  --path src/example.ts

# Preview a closure without editing; add --write only after review
npx --yes @engineeringspec/cli@0.1.0-rc.13 transition \
  docs/engineering-specs/ES-change.engineering-spec.md --to implemented
```

RC7 adopters should use `--allow-contract-only` with `status`, directory `select`, and directory `check`, and enable the matching Action input. This lets strictly validated spec-only proposals and closures pass without letting workspace contracts authorize code.

Use the repository-local binary when installed. Pin an exact package version and Action commit in enforcement; avoid mutable tags for trust-sensitive CI.

## What success looks like

- A newcomer can explain the six lifecycle stages.
- Every consequential changed path maps to one approved contract.
- Reviewers can identify the relevant constraints and verification obligations.
- Teams can search active and historical contracts by owner, path, component and obligation.
- Agents fail visibly when scope is missing, ambiguous, or denied.
- The team records whether scope violations and review corrections decrease over paired tasks.
