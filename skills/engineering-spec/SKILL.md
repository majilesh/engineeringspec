---
name: engineering-spec
description: Apply EngineeringSpec change contracts during consequential AI-assisted coding. Use when a repository contains ENGINEERING_SPEC.md or *.engineering-spec.md, when a user asks to implement or review an EngineeringSpec, or when targets, constraints, contracts, verification IDs, scope gates, or agent pre-completion checks govern a code change.
---

# EngineeringSpec workflow

When the repository has trusted `engineering-spec.json` defaults, prefer the short composed workflow:

```sh
engineeringspec next
engineeringspec work <contract-id>
engineeringspec finish <contract-id> --format markdown
```

New authority still requires a separately reviewed authority PR. The implementation PR may include only the exact `approved -> implemented` close; `finish --write-closure` edits no other field and performs no Git operation.

`next` is informational. Its success is not implementation authorization. Begin implementation only when it reports `permission: implementation` and `work <contract-id>` successfully loads that exact approved trusted-base contract. Repository reading remains allowed for correctness; only returned writable surfaces permit edits.

Treat the checked-in EngineeringSpec as the shared change contract. Keep validation and query commands read-only. Never execute a verifier merely because its runner appears in a specification.

Prefer the repository-local `engineeringspec` binary when the package is installed. The fallback commands below pin the exact released CLI version; do not replace it with a mutable distribution tag in an enforcing workflow.

## Explore

Read repository instructions and diagnose the setup:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.13 doctor . --spec-dir docs/engineering-specs --base origin/main --strict
npx --yes @engineeringspec/cli@0.1.0-rc.13 status --spec-dir docs/engineering-specs --base origin/main --allow-contract-only --strict
```

If doctor reports version drift, preview a bounded managed upgrade with `adopt --merge --upgrade --dry-run`. Review skipped structured files manually.

Explore source, dependencies, architecture, and likely paths without editing or claiming authorization. If intent is unclear, explain options and tradeoffs before proposing a contract.

## Propose

Create a deterministic draft from explicit paths or the local Git working state:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.13 propose --id ES-change --title "Change title" --owner engineering \
  --path '<repository-path-or-glob>' --output docs/engineering-specs/ES-change.engineering-spec.md --dry-run
```

Use explicit `--path` for prospective authority before coding. Review and narrow the output, then rerun without `--dry-run` when the target list is correct. Use `--from-diff` only to bring existing non-empty working changes under governance; its empty-diff failure is intentional. The command never fetches issue content and only emits `status: draft`. A proposal is planning context, not permission to modify its targets. Keep the proposal/RFC change contract-only.

## Approve and review

A maintainer reviews the contract-only PR, resolves ambiguity, and merges it with `status: approved`. An agent may prepare or review the proposal but must not treat its own workspace edit as approval. If scope changes later, repeat the contract-only approval before dependent code.

## Implement

1. Read repository instructions and run:

   ```sh
   engineeringspec next
   ```

   Stop unless it reports `permission: implementation` for the intended contract.

2. Load the exact approved contract:

   ```sh
   engineeringspec work <contract-id>
   ```

   Stop when the result is blocked. Reading repository code for correctness remains allowed; only the reported writable surfaces grant edit permission. Never reproduce or infer this decision in the skill.

3. Treat matching `TARGET-*`, `CONTRACT-*`, `CON-*`, and `VER-*` obligations as binding. Stop and merge a separate authority amendment instead of editing outside approved targets.
4. Run only the repository's separately trusted checks.
5. Before claiming completion, finish against the complete working state:

   ```sh
   engineeringspec finish <contract-id> --format markdown
   ```

6. Report routed specs, changed targets, relevant identifiers, trusted check results, and unresolved drift. Do not claim a verifier was satisfied merely because it was declared.

For advanced inspection and CI troubleshooting, use `prepare`, `select`, `context`, `explain`, `review`, and `check`; these are the deterministic primitives composed by the short workflow, not a second authorization path.

## Verify

Run only checks trusted by the repository workflow. Then perform the complete-working-state `check`, report selected specs and targets, and map results to `CON-*`, `CONTRACT-*`, and `VER-*`. Declared coverage describes links; it does not claim that a verifier ran successfully.

When participating in a paired pilot, do not self-certify success or silently omit a failed, slower, amended, or incomplete run. Preserve the pinned revision, prompt intent, model, permissions, trusted checks, agent configuration, explored paths, and changed paths for the independent harness or reviewer. Never label synthetic examples or agent estimates as observed evidence.

## Close

After implementation review and trusted checks pass, an implementation PR may include the exact transition from `approved` to `implemented`. Require `implementation_with_monotonic_close` for the mixed diff, or `contract_only` for a standalone close. Do not use closure as evidence.

After trusted checks pass, preview through `finish`, then write the exact close explicitly:

```sh
engineeringspec finish <contract-id> --format markdown
engineeringspec finish <contract-id> --write-closure
```

`finish` never stages, commits, pushes, approves, merges, or executes specification-declared runners. The lower-level `transition` command remains available for standalone closure and debugging.

For discovery across many contracts, use `catalogue <spec-directory> --query <text> --format json` or `--path <repository-path>`. Use `architecture <catalog-info.yaml> --format json` only as read-only proposal context; it grants no authority.

## Handle denials and contract evolution

Use `explain` to understand a path decision:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.13 explain <selected-spec> --path <path> --change-kind modified --base origin/main
```

Do not use a workspace contract to authorize implementation paths it widens in the same change. Submit and merge a contract-only change first, then implement against that approved base. Escalate ambiguous or conflicting obligations to the named owner.

## Review a change

Run `review --spec-dir <directory> --base origin/main --strict --format markdown` against the intended base, inspect every violation, and compare the implementation with the listed constraints and verifier identities. The report omits runner payloads. Remember that declared coverage reports links, not successful verifier execution.

These sections may be exposed by a tool as `engineering-spec:explore`, `:propose`, `:review`, `:implement`, `:verify`, and `:close`. Such actions are thin prompts over the same files and CLI; they never replace base-pinned approval.
