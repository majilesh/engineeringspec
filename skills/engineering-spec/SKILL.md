---
name: engineering-spec
description: Apply EngineeringSpec change contracts during consequential AI-assisted coding. Use when a repository contains ENGINEERING_SPEC.md or *.engineering-spec.md, when a user asks to implement or review an EngineeringSpec, or when targets, constraints, contracts, verification IDs, scope gates, or agent pre-completion checks govern a code change.
---

# EngineeringSpec workflow

Treat the checked-in EngineeringSpec as the shared change contract. Keep validation and query commands read-only. Never execute a verifier merely because its runner appears in a specification.

Prefer the repository-local `engineeringspec` binary when the package is installed. The fallback commands below pin the exact released CLI version; do not replace it with a mutable distribution tag in an enforcing workflow.

## Explore

Read repository instructions and diagnose the setup:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.9 doctor . --spec-dir docs/engineering-specs --base origin/main --strict
npx --yes @engineeringspec/cli@0.1.0-rc.9 status --spec-dir docs/engineering-specs --base origin/main --allow-contract-only --strict
```

If doctor reports version drift, preview a bounded managed upgrade with `adopt --merge --upgrade --dry-run`. Review skipped structured files manually.

Explore source, dependencies, architecture, and likely paths without editing or claiming authorization. If intent is unclear, explain options and tradeoffs before proposing a contract.

## Propose

Create a deterministic draft from explicit paths or the local Git working state:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.9 propose --id ES-change --title "Change title" --owner engineering --from-diff --base origin/main --dry-run
```

Review the output, then rerun without `--dry-run` when the target list is correct. The command never fetches issue content and only emits `status: draft`. A proposal is planning context, not permission to modify its targets. Keep the proposal/RFC change contract-only.

## Approve and review

A maintainer reviews the contract-only PR, resolves ambiguity, and merges it with `status: approved`. An agent may prepare or review the proposal but must not treat its own workspace edit as approval. If scope changes later, repeat the contract-only approval before dependent code.

## Implement

1. Read repository instructions and locate the applicable approved EngineeringSpec.
2. Build the CLI when working in the EngineeringSpec repository itself.
3. Validate the contract:

   ```sh
   npx --yes @engineeringspec/cli@0.1.0-rc.9 validate <spec-directory> --strict
   ```

4. With a repository-local build that supports it, load the exact approved contract as a pre-code brief:

   ```sh
   engineeringspec prepare <contract-id> --spec-dir <spec-directory> --base origin/main --strict --format markdown
   ```

   Stop when the result is blocked. Reading repository code for correctness remains allowed; only the reported writable surfaces grant edit permission. Never reproduce or infer this decision in the skill.

5. Route the complete working state to one approved base contract per path:

   ```sh
   npx --yes @engineeringspec/cli@0.1.0-rc.9 select <spec-directory> --base origin/main --worktree --allow-contract-only --strict
   ```

6. Before editing each expected path, load its relevant context from the selected spec:

   ```sh
   npx --yes @engineeringspec/cli@0.1.0-rc.9 context <selected-spec> --path <path> --base origin/main --format markdown
   ```

7. Treat matching `TARGET-*`, `CONTRACT-*`, `CON-*`, and `VER-*` obligations as binding. Stop and explain mismatches instead of editing outside the approved targets.
8. Run only the repository's separately trusted checks.
9. Before claiming completion, check the entire working state against approved base contracts:

   ```sh
   npx --yes @engineeringspec/cli@0.1.0-rc.9 check --spec-dir <spec-directory> --base origin/main --allow-contract-only --strict
   ```

10. Report routed specs, changed targets, satisfied identifiers, trusted check results, and unresolved drift.

## Verify

Run only checks trusted by the repository workflow. Then perform the complete-working-state `check`, report selected specs and targets, and map results to `CON-*`, `CONTRACT-*`, and `VER-*`. Declared coverage describes links; it does not claim that a verifier ran successfully.

When participating in a paired pilot, do not self-certify success or silently omit a failed, slower, amended, or incomplete run. Preserve the pinned revision, prompt intent, model, permissions, trusted checks, agent configuration, explored paths, and changed paths for the independent harness or reviewer. Never label synthetic examples or agent estimates as observed evidence.

## Close

After implementation review and trusted checks pass, prepare the lifecycle-only transition from `approved` to `implemented` (or another reviewed terminal state). Run directory `check --allow-contract-only` and require the distinct `contract_only` classification. Do not use closure as evidence, and do not close while the approved contract is still needed to authorize dependent implementation changes.

Preview the status-only edit, then write it explicitly after review:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.9 transition <spec> --to implemented
npx --yes @engineeringspec/cli@0.1.0-rc.9 transition <spec> --to implemented --write
```

For discovery across many contracts, use `catalogue <spec-directory> --query <text> --format json` or `--path <repository-path>`. Use `architecture <catalog-info.yaml> --format json` only as read-only proposal context; it grants no authority.

## Handle denials and contract evolution

Use `explain` to understand a path decision:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.9 explain <selected-spec> --path <path> --change-kind modified --base origin/main
```

Do not use a workspace contract to authorize implementation paths it widens in the same change. Submit and merge a contract-only change first, then implement against that approved base. Escalate ambiguous or conflicting obligations to the named owner.

## Review a change

Run `review --spec-dir <directory> --base origin/main --strict --format markdown` against the intended base, inspect every violation, and compare the implementation with the listed constraints and verifier identities. The report omits runner payloads. Remember that declared coverage reports links, not successful verifier execution.

These sections may be exposed by a tool as `engineering-spec:explore`, `:propose`, `:review`, `:implement`, `:verify`, and `:close`. Such actions are thin prompts over the same files and CLI; they never replace base-pinned approval.
