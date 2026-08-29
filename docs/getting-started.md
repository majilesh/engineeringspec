# Getting started

## What EngineeringSpec does

EngineeringSpec gives humans, coding agents, and CI one reviewed answer to what a repository change is authorized to modify. Authority comes from an approved contract on the trusted Git base; the resulting Git diff is evaluated independently against it.

## 1. Preview adoption

From the root of a Git repository, preview the quickstart scaffold:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.16 adopt . --quickstart \
  --maintainer @YOUR_GITHUB_USER_OR_TEAM --dry-run
```

The preview lists the files it would create: repository defaults, a draft first contract, maintainer ownership, neutral agent guidance, and GitHub enforcement. It does not approve a contract, overwrite existing files by default, or change the repository.

## 2. Apply adoption

Review the preview, replace the maintainer placeholder, and rerun without `--dry-run`:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.16 adopt . --quickstart \
  --maintainer @YOUR_GITHUB_USER_OR_TEAM
```

Choose the operating level deliberately:

- **TRY:** preview the scaffold, learn the lifecycle, and run a first governed change. EngineeringSpec can remain informative or advisory while the team evaluates it.
- **PRODUCTION:** protect the contract directory with CODEOWNERS or equivalent maintainer review, require the EngineeringSpec GitHub check, load authority from a trusted base, and pin the Action to an immutable reviewed SHA.

TRY does not have the same merge-enforcement strength as PRODUCTION. You can complete this walkthrough before making the generated check required.

## 3. Propose one small change

Create a bounded prospective proposal before implementation exists:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.16 propose \
  --id ES-first \
  --title "First governed change" \
  --path 'src/example/**' \
  --output docs/engineering-specs/ES-first.engineering-spec.md
```

Review the draft. Narrow paths where possible, name the source intent, and record constraints and verifier identities. A broad glob such as `**` creates broad authority if a maintainer approves it.

## 4. PR 1 — grant authority

Open a contract-only PR. A human reviews the owner, paths, constraints, and verification identities; changes the contract to `approved`; and merges it to the trusted main branch.

That trusted-base merge is the authority event. A workspace draft, an unmerged approval edit, or an agent recommendation grants no implementation authority. This boundary prevents one change from widening its own scope and spending the widened authority simultaneously.

## 5. Implement

Start a fresh implementation branch from the trusted main branch, then run only the normal pre-code commands:

```sh
engineeringspec next
engineeringspec work ES-first
```

`next` is informational. Stop unless it reports `permission: implementation`. `work ES-first` must then load the exact approved contract from the trusted base. Read more of the repository when needed for correctness, but write only inside the returned writable surfaces.

If another path is needed, stop. Propose and merge a separately reviewed authority amendment before editing that path.

For machine consumption in the unpublished RC17 compact-ticket candidate, add `--format json` to the repository-local `next` or `work`. `next` names the approved and pending contract IDs and reports the current diff classification separately from permission; `none` means no diff yet. `work` returns only pre-code authority, not a predicted workflow lane. Use `--verbose` when an existing consumer needs the previous full JSON reports. The runnable `npx` examples remain on published RC16 until RC17 receives separate publication approval.

## 6. Finish

Implement the change and run the repository's separately trusted checks. Then evaluate the complete working state:

```sh
engineeringspec finish ES-first --format markdown
```

Declared verifier runners are inert; EngineeringSpec does not execute them or claim that they passed. After the trusted checks and finish review succeed, write the exact close:

```sh
engineeringspec finish ES-first --write-closure
```

The implementation PR may contain the exact `approved -> implemented` lifecycle transition for the same contract. `finish` does not stage, commit, push, approve, or merge.

## 7. Done

```text
PR 1 = grant reviewed authority
PR 2 = spend authority + exact close
```

No routine third closure PR is needed. Any scope widening still requires its own reviewed authority merge before implementation.

An all-specification governance change is an exception: `finish` may report `contract_only_no_implementation_authority` despite valid permission before editing. This describes how the resulting diff is reviewed, not an authorization failure. Merge the reviewed governance change, then close its authorizing contract separately; do not force a receipt or reinterpret `finish`.

## Where to go next

- Add maintainer ownership and a required immutable-SHA check with the [Production gate](production-gate.md).
- Resolve setup or routing failures with [Troubleshooting](troubleshooting.md).
- Find all commands and flags in the [CLI reference](cli-reference.md).
- Connect coding tools without changing the authority model through [Agent integration](agent-integration.md).
- Explore lifecycle details and historical read-only tools in [Lifecycle](lifecycle.md) and the [CLI reference](cli-reference.md#replay).

EngineeringSpec is not an agent sandbox, filesystem containment layer, IDE or model router, generic command executor, or AST/API compatibility checker. `interface_only` remains path-level. Skills are optional guidance; the CLI's trusted-base decision is authoritative. Uncovered and ambiguous paths fail, and denial wins.

## For maintainers evaluating onboarding

The unproven Phase-0 product target is first useful advisory success within 15 minutes, excluding human review latency. Evaluate it with 5–10 new users or repositories using manual observation and local notes only—no telemetry and no repository source or specification upload.

Record time to understand the one-line value, time to the adoption dry-run, time to a successful scaffold, documents opened, commands attempted, CLI/setup failures, ability to explain grant versus spend, time to the first authority proposal, amendment rate, false-block or confusion points, and the first implementation-ready state after approval. These are proposed measurements, not observed results.
