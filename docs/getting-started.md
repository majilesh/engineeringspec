# Getting started

EngineeringSpec gives product, architecture, engineering, coding agents, reviewers, and CI one versioned change contract. It works in public and private Git repositories and does not require a hosted service or vendor plugin.

## Choose an adoption path

### Try one change

Install or invoke the pinned CLI, create `docs/engineering-specs/`, and follow the [first-change tutorial](first-change-tutorial.md). Keep enforcement advisory until the team understands the two-PR lifecycle.

Adoption also creates `engineering-spec.json`. Once it is on the trusted base, normal work does not repeat the specification directory, base, or strictness flags:

```sh
engineeringspec next
engineeringspec work ES-change
engineeringspec finish ES-change --format markdown
```

The authority PR must merge before implementation. The implementation PR can include the exact monotonic close, so a separate closure PR is unnecessary.

`next` is informational. Its success never grants permission. Begin implementation only when it reports `permission: implementation` and `work ES-change` successfully loads that exact approved contract from the trusted base.

Preview the complete safe scaffold:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.14 adopt . --quickstart \
  --maintainer @your-org/platform --dry-run
```

This creates a **draft** first contract, CODEOWNERS, neutral agent handoffs, and immutable GitHub enforcement. Review the output and rerun without `--dry-run`; it never approves the draft or overwrites existing files by default.

### Adopt in an established repository

Preview neutral agent and GitHub Actions integration without overwriting existing files:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.14 adopt . \
  --spec docs/engineering-specs/ES-first-change.engineering-spec.md \
  --merge --dry-run
```

Review the preview, rerun without `--dry-run`, and diagnose the installation:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.14 doctor . \
  --spec-dir docs/engineering-specs --base origin/main --strict
```

`doctor` is read-only. It checks Git/base availability, workspace validation, base contract lifecycles, AGENTS.md guidance, approved-only CI configuration, and drift between the CLI, managed guidance, and immutable Action pin. It never executes commands declared inside a spec.

### Install merge-blocking enforcement

Follow [Production gate](production-gate.md). Protect the EngineeringSpec job as a required check and require maintainer ownership for contracts. Start with a small team or repository and retain an explicit exception process.

## Daily commands

```sh
# Informational: discover the next action and current permission
npx --yes @engineeringspec/cli@0.1.0-rc.14 next

# Load the exact approved trusted-base contract before editing
npx --yes @engineeringspec/cli@0.1.0-rc.14 work ES-change

# Edit only returned writable surfaces and run repository-owned checks

# Check, review, and create bound PR metadata without changing Git
npx --yes @engineeringspec/cli@0.1.0-rc.14 finish ES-change --format markdown

# After trusted checks, optionally write the exact monotonic close
npx --yes @engineeringspec/cli@0.1.0-rc.14 finish ES-change --write-closure
```

`work` permits repository reading needed for correctness but limits writing to its reported surfaces. `finish` never stages, commits, pushes, approves, merges, or executes specification runners. If scope must widen, merge the authority amendment first and rerun `work` against the updated trusted base.

For debugging and CI, the lower-level `doctor`, `status`, `prepare`, `context`, `review`, `select`, `check`, `transition`, and validation commands remain available. RC7 and later adopters should use `--allow-contract-only` with directory governance checks and enable the matching Action input. This lets strictly validated spec-only proposals and standalone closures pass without letting workspace contracts authorize code.

Use the repository-local binary when installed. Pin an exact package version and Action commit in enforcement; avoid mutable tags for trust-sensitive CI.

## What success looks like

- A newcomer can explain the six lifecycle stages.
- Every consequential changed path maps to one approved contract.
- Reviewers can identify the relevant constraints and verification obligations.
- Teams can search active and historical contracts by owner, path, component and obligation.
- Agents fail visibly when scope is missing, ambiguous, or denied.
- The team records whether scope violations and review corrections decrease over paired tasks.
