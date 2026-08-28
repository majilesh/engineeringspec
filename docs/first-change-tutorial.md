# First-change tutorial

This walkthrough adds a fictional dark-mode preference under `src/settings/**`. It teaches one boundary: grant authority first, then spend it.

Repository source is prepared as the unpublished RC17 candidate. The runnable package command below remains pinned to published RC16 until separate publication approval.

## 1. Explore

Ask the coding agent to read the styling system, preference storage, and tests. Exploration is read-only and grants no implementation authority.

## 2. Propose `ES-dark-mode`

Create a prospective contract with an explicit path before writing code:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.16 propose \
  --id ES-dark-mode \
  --title "Add dark mode" \
  --path 'src/settings/**' \
  --output docs/engineering-specs/ES-dark-mode.engineering-spec.md
```

Review and narrow the draft. Add durable source intent, constraints such as system-preference fallback and accessibility, and the identities of repository-owned checks. Do not add dark-mode code on this branch.

## 3. PR 1 — grant authority

Open a contract-only PR. A maintainer reviews ownership, scope, constraints, and verifier identities. Once agreed, the contract reaches `approved` and merges to the trusted main branch.

That merge grants authority. A workspace draft, an unmerged approval edit, successful analysis, or an agent recommendation does not.

## 4. Pull the trusted base

Create or update the implementation branch from the trusted main branch containing the approved contract. Do not reuse a pre-approval base.

## 5. Ask what is next

```sh
engineeringspec next
```

Success is informational. Stop unless the result identifies the intended contract and reports `permission: implementation`.

## 6. Load the approved work

```sh
engineeringspec work ES-dark-mode
```

`work` must load `ES-dark-mode` from the approved trusted base. Read broadly when necessary for correctness, but write only inside the returned writable surfaces.

If implementation needs another path, stop. Do not edit the contract to widen authority and spend that workspace edit in the same PR. Submit, review, and merge a contract-only authority amendment first; then reload work from the updated trusted base.

## 7. Implement

Make the dark-mode change only inside the approved surfaces. An uncovered or ambiguous path fails closed, and a matching denial wins.

## 8. Run repository-owned checks

Run the repository's separately trusted lint, test, typecheck, security, and accessibility checks. Commands declared inside a specification are inert data and are not executed merely because the specification names them.

## 9. Finish

Evaluate the complete working state and prepare review evidence:

```sh
engineeringspec finish ES-dark-mode --format markdown
```

The result reports routing and declared obligations; it does not claim an inert verifier ran.

After trusted checks pass, ask `finish` to write only the exact close:

```sh
engineeringspec finish ES-dark-mode --write-closure
```

## 10. PR 2 — spend authority and close exactly

Open the implementation PR with the code and the exact `approved -> implemented` transition. The final routing classification should be `implementation_with_monotonic_close`.

The close cannot change revision, targets, constraints, verifier identities, sources, prose, or any other semantic content. `finish` never stages, commits, pushes, approves, merges, or executes declared runners.

```text
PR 1: grant reviewed authority
PR 2: spend authority + exact monotonic close
done
```

No normal third closure PR is needed. A standalone lifecycle-only closure remains valid when the exact close cannot safely accompany implementation.

### Advanced: importing existing work

Use `--from-diff` instead only when an existing non-empty working change is being brought under governance. It is not the normal clean path, and it does not grant authority.
