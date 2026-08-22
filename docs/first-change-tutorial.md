# First-change tutorial

This walkthrough adds a fictional dark-mode preference to `src/settings/**`. It demonstrates the current RC16 two-PR safety boundary; adapt the paths and trusted checks to your repository.

Use the repository-local RC16 CLI before publication; the exact `npx` package examples below become externally installable only after the separate RC16 publication ceremony.

## 1. Explore and propose

Ask the coding agent to inspect the styling system, preference storage, tests, and likely paths. Then run:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.16 next
npx --yes @engineeringspec/cli@0.1.0-rc.16 propose \
  --id ES-dark-mode \
  --title "Add dark mode" \
  --path 'src/settings/**' \
  --output docs/engineering-specs/ES-dark-mode.engineering-spec.md \
  --dry-run
```

`next` is informational. Exit code 0 and `analysisValid: true` mean only that the repository was analyzed successfully. They do not authorize implementation. The explicit `--path` supports a prospective proposal before code exists, and `--output` makes the generated filename deterministic. Review and narrow the target, then create the same draft without `--dry-run` when the scope is correct. Use `--from-diff` instead only when an existing non-empty working change is being brought under governance; an empty diff remains an error.

Edit `docs/engineering-specs/ES-dark-mode.engineering-spec.md` so it names durable source intent, explicit targets, constraints such as system-preference fallback and accessibility, and verifier identities. Do not add dark-mode code in this branch.

## 2. PR 1 — grant authority

Open a contract-only PR. A maintainer reviews ownership, scope, constraints, and verification identities. After agreement, change the lifecycle to `approved` and merge the contract.

This trusted-base merge is the authorization event. A workspace draft, an agent recommendation, an unmerged approval edit, or successful `next` analysis is not authority.

## 3. Load the approved contract

Update the implementation branch from the trusted base, then run:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.16 next
npx --yes @engineeringspec/cli@0.1.0-rc.16 work ES-dark-mode
```

Begin implementation only when `next` reports `permission: implementation` and `work ES-dark-mode` succeeds for the exact approved trusted-base contract. Repository reading remains allowed for correctness; writes are limited to the returned writable surfaces. If another surface is necessary, stop and merge a separate contract-only authority amendment before continuing.

## 4. Implement and run trusted checks

Implement only the declared targets. Run the repository's separately trusted test, lint, typecheck, security, and accessibility checks. Never execute a command merely because its argv appears inside the specification; specification runners are inert data.

Then review the complete working state:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.16 finish ES-dark-mode --format markdown
```

The PR description should identify selected targets and the trusted results relevant to each `CON-*`, `CONTRACT-*`, and `VER-*`. Declared verifier identities are obligations, not proof that a command ran.

## 5. PR 2 — spend authority and close exactly

After trusted checks pass, write the exact close:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.16 finish ES-dark-mode --write-closure
```

The implementation PR may include this exact `approved -> implemented` transition because it narrows the same contract whose trusted-base authority the implementation spends. The final classification must be `implementation_with_monotonic_close`.

The mixed PR fails closed if it also changes the contract's targets, constraints, verifier identities, sources, prose, extensions, revision, or any other semantic content. It also fails if it closes an unrelated contract or changes implementation paths outside approved authority. Widening authority always requires another previously merged contract-only PR.

`finish` never stages, commits, pushes, approves, merges, or executes specification-declared runners. Review and merge remain human/repository responsibilities.

A standalone lifecycle-only closure is still valid and is classified `contract_only`, but it is no longer normally required. The usual RC16 journey is therefore:

```text
PR 1: review and merge approved authority
PR 2: implement inside that authority + exact monotonic close
done
```
