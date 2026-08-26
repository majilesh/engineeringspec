# Agent integration

EngineeringSpec is the shared change contract. Agent-specific files only explain how a tool should discover and consume that contract.

## Shared lifecycle

Codex, Claude Code, Cursor, and human contributors should follow the same thin workflow over the repository files and CLI:

```sh
engineeringspec next
engineeringspec work <contract-id>
engineeringspec finish <contract-id> --format markdown
```

These commands read authorization settings from the trusted-base `engineering-spec.json`. Explicit options remain available, and CI should keep supplying its event base explicitly.

The repository-local CLI and the published package examples below use the exact identity `@engineeringspec/cli@0.1.0-rc.16`.

`next` is informational. Exit code 0 or successful analysis does not grant authority. Implementation may begin only when `permission` is `implementation` and `work <contract-id>` successfully loads that exact approved trusted-base contract. `work` permits repository reading for correctness but limits writes to the returned surfaces.

1. **Explore** repository context without granting authority.
2. **Propose** a draft contract with explicit targets and obligations.
3. **Approve** the contract in a maintainer-owned, contract-only PR.
4. **Implement** against the approved contract loaded from the trusted base.
5. **Verify** with separately trusted checks and the complete-working-state EngineeringSpec check.
6. **Close** the exact spent contract in the implementation PR after trusted checks; closure alone is not verification evidence.

Start an unfamiliar repository with `doctor`, and use `status` whenever the next lifecycle action is unclear:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.16 doctor . --spec-dir docs/engineering-specs --base origin/main --strict
npx --yes @engineeringspec/cli@0.1.0-rc.16 status --spec-dir docs/engineering-specs --base origin/main --allow-contract-only --strict
```

## Repository setup

Generate the starter files safely with:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.16 adopt . --spec docs/engineering-specs/ES-change.engineering-spec.md
```

Existing files are skipped unless `--force` is explicitly supplied. Review generated guidance before committing it.

Use `--merge --dry-run` first in established repositories. After applying the scaffold, rerun `doctor`; warnings identify missing agent guidance or merge-blocking CI without changing files.

For upgrades, use `--merge --upgrade --dry-run`. The upgrade path edits only recognisable managed guidance and an exact immutable Action pin; ambiguous structured configuration is skipped.

```text
AGENTS.md
CLAUDE.md
.cursor/rules/engineering-spec.mdc
docs/engineering-specs/*.engineering-spec.md
.github/workflows/ci.yml          # engineering-spec job uses ./action.yml
action.yml
```

Keep the full neutral workflow in `AGENTS.md`. Claude Code can import it from `CLAUDE.md` with `@AGENTS.md`; Cursor can reference it from a project rule. Do not duplicate the EngineeringSpec itself in agent configuration.

## Implementation prompt

Use this prompt with Codex, Claude Code, Cursor, or another repository-aware coding agent:

```text
Implement <spec-file> as an engineering contract.

Start with `engineeringspec next`. Do not treat successful analysis as
authorization. Continue only when it reports `permission: implementation` and
`engineeringspec work <contract-id>` successfully loads the exact approved
trusted-base contract. Repository reading remains allowed for correctness;
write only inside the returned surfaces. Treat CONTRACT-*, CON-*, and VER-*
obligations as binding. Before ending your turn, run trusted repository checks
and self-check with:

  npx --yes @engineeringspec/cli@0.1.0-rc.16 finish <contract-id> --format markdown

Fix gate violations (or update/escalate the contract) before claiming done.
This checks committed, staged, unstaged, deleted, renamed, and non-ignored
untracked paths. If targets need widening, merge a contract-only change first;
do not use the widening workspace contract to authorize its own implementation.
Verification commands declared in the spec are inert data; run only the normal
repository checks that are separately trusted and approved. Finish with an
evidence table mapping changed surfaces and results to the relevant identifiers.
```

`work` composes the same base-pinned preparation primitive and requires one exact approved contract. `prepare` remains available for advanced inspection and reports source intent, technical contracts, constraints, verifier identities, and unresolved questions without exposing runner payloads. Continue to pass `--base origin/main` to lower-level `context`, `explain`, and `check` calls when debugging path decisions.

The unreleased compact-ticket JSON defaults expose the action, named approved/proposed IDs, and blockers from `next`, and base identity, policy-bearing writable/protected paths, obligations, verifier identities, and stop conditions from `work`. Existing full JSON consumers must add `--verbose`; the full payload and exit semantics are preserved.

Keep permission and workflow classification separate. `next.currentChangeClassification` is an exact projection of the current diff (`none`, `contract_only`, `implementation`, or `implementation_with_monotonic_close`), never new authority or a future prediction. `work` has no lane or finish-mode field. A specification-only change may have been legitimately authorized before editing and still go through governance-only review afterward. Preserve that `finish` result and close the authorizing contract separately after the governance cleanup merges.

For routing blockers, run the ticket's `engineeringspec explain --spec-dir ... --base ... --path ... --change-kind ... --strict` command. It delegates to the full approved-base router; it does not choose a preferred contract to erase ambiguity. The ticket is not a Context Plane envelope: architecture, ownership, dependencies, standards, inferred impact, and external knowledge remain separately reviewable read-only context, outside this increment.

## Multiple active contracts

When a repository can have multiple active change contracts, use the built CLI's base-pinned router:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.16 select docs/engineering-specs --base origin/main --worktree --allow-contract-only --strict
npx --yes @engineeringspec/cli@0.1.0-rc.16 check --spec-dir docs/engineering-specs --base origin/main --allow-contract-only --strict
```

The router considers approved contracts by default and assigns every implementation path to exactly one of them. Treat `ESRT002` as missing scope, `ESRT003` as overlapping ownership, and `ESRT004` as a binding denial. Do not resolve ambiguity by loading a workspace spec or omitting competing candidates. With explicit `--allow-contract-only`, a strictly valid diff wholly contained under the configured specification directory is classified as governance without being selected by a base contract. Adding any other path or a cross-boundary rename restores normal approved-base routing for the complete change set.

When the complete working state has no changed paths, `select` and multi-spec `check` succeed with `not_applicable` coverage even if no contract is currently approved. This is a clean-state result, not authorization for future edits; rerun the check after every change.

Keep a contract `approved` on the trusted base while it authorizes its dependent implementation. The implementation PR may include only that exact contract's `approved -> implemented` close; `implementation_with_monotonic_close` rejects semantic mutation, widening, and unrelated closure. A standalone follow-up close remains valid but is not normally required. Historical draft, implemented, superseded, and rejected contracts are not eligible under the enforcing default. ProductSpec references are not dereferenced from the mutable workspace during base routing; their declared coverage is reported as unknown until a Git-tree profile resolver is available.

Use `catalogue` for deterministic cross-contract search and path impact. Use `architecture` only to import read-only component context for a proposal; neither output can authorize implementation or replace `select`/`check`.

For a retained paired study, generate scope counts only from committed revisions with `measure <contract-id> --spec-dir <dir> --base <sha> --head <sha> --format json`. V2 uses the complete approved base candidate set and projects the requested contract from repository routing. The receipt is unsigned, omits paths by default, never executes declared runners, and cannot grant authority or replace the final `check`. `benchmark --require-publishable` requires v2 provenance for scope claims but remains an evidence-policy gate, never a correctness or causality claim.

## Multi-agent workflow

For consequential changes, pin every participant to the same spec revision and canonical digest:

1. An implementation agent changes declared targets.
2. A separate review agent checks contracts, constraints, and target scope.
3. CI produces deterministic test, policy, schema, or analysis evidence.
4. A human approves exceptions and ambiguous obligations.

The reusable Agent Skill under `skills/engineering-spec/` teaches the same neutral CLI workflow without replacing the on-disk format.

Suggested presentation-layer actions are `engineering-spec:explore`, `:propose`, `:review`, `:implement`, `:verify`, and `:close`. They are workflow prompts, not new authorization mechanisms. An adapter must delegate to the same base-pinned CLI behavior and must not approve contracts, run declared runners, or hide routing failures.

Start with the skill and file-based instructions across ChatGPT/Codex, Claude Code, and Cursor. Build a vendor adapter or read-only MCP transport only when observed onboarding data shows that contract discovery or CLI access is the bottleneck; keep any such adapter a thin consumer of the same CLI and format.

For runtime orchestration, sandbox, identity, delegation, and trusted execution integration, follow the [EngineeringSpec and Agent Control Plane boundary](agent-control-plane.md). A control plane consumes and may restrict reviewed authority; it cannot create or widen it.

## Production gate

For SHA pins, CODEOWNERS, and merge-blocking required checks, follow [`production-gate.md`](production-gate.md).
