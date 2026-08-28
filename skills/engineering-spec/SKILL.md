---
name: engineering-spec
description: Apply EngineeringSpec change contracts during consequential AI-assisted coding. Use when a repository contains ENGINEERING_SPEC.md or *.engineering-spec.md, when a user asks to implement or review an EngineeringSpec, or when targets, constraints, contracts, verification IDs, scope gates, or agent pre-completion checks govern a code change.
---

# EngineeringSpec workflow

The CLI is authoritative. This Skill is optional discovery and integration guidance; it does not grant authority and is not required for correctness.

`next --format json` and `work <contract-id> --format json` return compact permission tickets. Use `--verbose` to retain the full pre-ticket JSON reports. `next.currentChangeClassification` projects only the observed working state: `none`, `contract_only`, `implementation`, or `implementation_with_monotonic_close`. `none` means no current diff, not a prediction. Classification never creates authority. `work` remains a pre-code brief and has no lane or finish-mode prediction.

## Normal agent behavior

When EngineeringSpec is configured:

1. Run:

   ```sh
   engineeringspec next
   ```

2. Stop unless the result reports `permission: implementation` for the intended contract. `next` success alone is informational.
3. Load the exact approved trusted-base contract:

   ```sh
   engineeringspec work <contract-id>
   ```

4. Stop if `work` is blocked. Read broadly when needed for correctness, but write only inside the returned writable surfaces. Do not reproduce or infer route-selection logic in this Skill.
5. Run only repository-owned trusted checks. Specification-declared runners are inert data.
6. Evaluate the complete working state:

   ```sh
   engineeringspec finish <contract-id> --format markdown
   ```

7. Report the routed contract, changed targets, relevant obligations, actual trusted check results, and unresolved drift. Never infer, widen, approve, or manufacture authority.

New authority requires a separately reviewed contract-only PR merged to the trusted base. If another writable surface is needed, stop and merge an authority amendment before editing it. A workspace draft cannot grant authority.

After trusted checks pass, the implementation PR may include only the exact close for the same authorizing contract:

```sh
engineeringspec finish <contract-id> --write-closure
```

Require `implementation_with_monotonic_close` for that mixed diff. `finish` never stages, commits, pushes, approves, merges, or executes declared runners.

Prefer the repository-local RC17 candidate CLI. When a package invocation is necessary before RC17 publication, pin the published identity `@engineeringspec/cli@0.1.0-rc.16`; do not use a mutable distribution tag in an enforcing workflow.

## Proposing and approving authority

Explore source, dependencies, architecture, and likely paths without editing or claiming authorization. For a prospective change, create a deterministic draft from explicit paths:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.16 propose \
  --id ES-change --title "Change title" --owner engineering \
  --path '<repository-path-or-glob>' \
  --output docs/engineering-specs/ES-change.engineering-spec.md --dry-run
```

Review and narrow the preview, then rerun without `--dry-run`. Use `--from-diff` only to import an existing non-empty working change. A proposal is planning context, not permission to modify its targets.

A maintainer reviews and merges the contract with `status: approved`. An agent may prepare the proposal but must not treat its own workspace edit as approval. Grant-before-spend prevents self-widening.

## Diagnosing blocked work

Use the CLI rather than guessing:

- `doctor` diagnoses repository adoption and trusted-base setup.
- `status` reports lifecycle and complete-state routing.
- `explain <spec> --path <path> --base origin/main` explains a path decision.
- A compact `next` routing blocker supplies `explain --spec-dir <dir> --base <sha> --path <path> --change-kind <kind> --strict`; run that command to retain all approved-base deny and ambiguity claims, even when there is no candidate contract.
- `context` shows the obligations relevant to a path.
- `review`, `select`, and `check` expose the lower-level base-pinned decisions composed by `work` and `finish`.

Uncovered and ambiguous paths fail closed, and denial wins. Escalate conflicting obligations to the named owner. Do not use a workspace contract to resolve a conflict or authorize a path it widens.

## Historical and catalogue inspection

Use `catalogue <spec-directory> --query <text> --format json` or `--path <repository-path>` to search contracts. Use `architecture <catalog-info.yaml> --format json` only as read-only proposal context.

`replay` simulates historical review or finish readiness from an immutable Git snapshot. It is always `historical_read_only`, grants no current authority, permits no writes, and executes no runners. Never convert a replay result into implementation permission.

## Verification and evidence

Run only checks separately trusted by the repository workflow. Declared verifier identities are obligations; they do not prove that a check ran. Preserve negative, slower, amended, and incomplete results rather than self-certifying success.

The exact close is lifecycle state, not proof. A standalone lifecycle-only close may be classified `contract_only`; an implementation plus exact close must be `implementation_with_monotonic_close`. Any semantic contract edit requires a separately approved authority change.

An approved contract can authorize changes entirely within the specification directory. Its pre-edit permission is compatible with a later `contract_only` governance result from `finish`. Review that governance change normally and close the authorizing contract separately after merge; do not modify `finish` or fabricate a receipt to force the implementation lane.

These sections may be exposed as `engineering-spec:explore`, `:propose`, `:review`, `:implement`, `:verify`, and `:close`. Such actions are thin prompts over the same files and CLI. They never replace base-pinned approval.
