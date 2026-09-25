# RFC 0014: Routing v2 and adoption modes

- **Status:** Accepted (2026-09-25)
- **Authorizing contract:** `ES-routing-v2-adoption-modes` (approved on the trusted base in #139)
- **Supersedes authority of:** `ES-external-adopter-pilot-execution`
- **Motivating evidence:** maintainer engineering review (2026-09-25), independently reproduced; findings are summarized in §Motivation

## Summary

Directory routing currently requires every changed path to be claimed by exactly one eligible `approved` contract. That invariant is locally sound but globally unadoptable:

- Every README edit, dependency bump or hotfix needs a prior contract PR.
- Any two overlapping approved contracts make every PR touching the overlap ambiguous.
- Parallel agents collide on shared files.
- A freshly adopted repository fails the check it installs (`ESRT001`, `ESRT006`).

This RFC keeps the security core and changes what it applies to. The core it keeps:

- base-pinned authority;
- deny overrides allow;
- inert runners;
- canonicalization;
- the restricted glob dialect;
- agent neutrality.

It introduces:

1. **Adoption modes:** `advisory`, `standard`, `controlled`.
2. **Repository policy:** `governedPaths`, `exemptPaths`, `protectedPaths`, `grantBeforeSpendPaths`, loaded only from the trusted base.
3. **Explicit contract selection.** It may only *narrow* the positive claims considered, to one base-approved contract, and never suppresses a deny.
4. **Standing versus single-change authority**, with mandatory expiry for standing authority.
5. **Receipt-based closure.** It can only remove eligibility, never add it.
6. **A lightweight (`lite`) contract profile.**
7. **Optional change budgets** (files and changed lines).
8. **Secure adoption wiring:** generated CODEOWNERS and ruleset guidance.
9. **A vendor-neutral edit guard**, with thin Claude Code, Codex and Cursor adapters.
10. **Supporting engineering changes:** executable ceremony benchmarks, routing/authority coverage requirements, Action startup optimization, and base-built self-gating for this repository.

## Motivation

The review reproduced each of the following:

| Observation | Cause |
|---|---|
| A README typo fails `ESRT002` after adoption | Every changed path must be claimed; there is no exempt or ungoverned class. |
| `ES-a` (`src/**`) and `ES-b` (`src/api/**`) both approved; a change to `src/api/a.ts` fails `ESRT003` | Routing is by path only; there is no binding between a PR and the contract it spends. |
| A Dependabot-style lockfile change fails `ESRT002` | No repository-level policy. |
| The fresh `adopt --quickstart` PR fails `ESRT001` + `ESRT006` | No zero-contract mode; the generated workflow always enforces. |
| The maintenance controller cannot remedy a standing baseline | SPEC §Semantic objects forbids globs in controllers and pins digests, so every overlapping file must be listed and re-approved whenever the baseline changes. |
| The PR workflow can be edited to skip the gate | Generated CODEOWNERS protects only the spec directory, and code-owner review is optional in GitHub rulesets. |
| This repository's CI evaluates routing changes with the PR's own code | `.github/workflows/ci.yml` uses `uses: ./`. |

A control that is not adopted provides no safety. Strictness that forces teams to grant `**` or bypass the check lowers real safety. This RFC moves strictness to where it pays:

- protected paths;
- background/unattended agents;
- explicitly selected change authority.

## Terminology

- **Adoption mode:** the repository-level enforcement posture.
- **Governed path:** a path whose changes require positive authority in `standard` and `controlled` modes. Default: `["**"]`.
- **Exempt path:** a governed path explicitly excluded from positive-authority requirements. Denies and protection still apply.
- **Protected path:** a path that always requires positive authority from a selected (or sole) base-approved *change* contract in the `full` profile, in every enforcing mode. It can never be exempt.
- **Grant-before-spend path:** a path that, in `controlled` mode, requires a single-change contract rather than standing authority.
- **Selector:** an untrusted request naming one contract ID whose positive claims are considered.
- **Standing authority:** a long-lived approved contract (`authority_kind: standing`) with mandatory `expires_at`. It is never closed by a receipt.
- **Change authority:** the existing per-change contract (`authority_kind: change`, the default). It is spent once.
- **Receipt:** an inert, digest-bound record that a change contract was spent.
- **Decision:** the per-path routing result (`selected`, `standing`, `exempt`, `ungoverned`, `uncovered`, `ambiguous`, `denied`, `protected_unauthorized`, `over_budget`).
- **Outcome:** whether a decision blocks, given the mode.

## Normative proposal

### 1. Repository configuration 0.2

`engineering-spec.json` gains an optional `mode` and `policy`. It continues to be read **only from the trusted base**. Workspace drift remains ignored for authority and reported as a warning.

```json
{
  "$schema": "https://engineeringspec.org/schemas/repository-config-0.2.schema.json",
  "specDirectory": "docs/engineering-specs",
  "strict": true,
  "trustedBase": "origin/main",
  "mode": "standard",
  "policy": {
    "governedPaths": ["**"],
    "exemptPaths": ["docs/**", "*.md"],
    "protectedPaths": [".github/workflows/**", ".github/CODEOWNERS", "engineering-spec.json", "migrations/**"],
    "grantBeforeSpendPaths": ["src/auth/**", "src/billing/**"],
    "budgets": { "maxFiles": 60, "maxChangedLines": 2000 }
  },
  "selection": { "label": "engineeringspec:", "branch": "es/" },
  "trustedVerifiers": {}
}
```

Rules:

- All policy globs use the restricted EngineeringSpec glob dialect (`ESPTH002` applies).
- `specDirectory`, `engineering-spec.json` and CODEOWNERS locations are implicitly protected in `standard` and `controlled` modes. Specification-directory changes continue through the contract-only governance lane.
- A path matching both `exemptPaths` and `protectedPaths` is **protected**. Configuration validation MUST warn.
- **Backward compatibility:** a configuration without `mode` MUST behave exactly as today ("legacy"): governed `**`, no exemptions, no protected class, no selector, exactly-one-claimant routing.
- `adopt` MUST write `mode: advisory` for new installations.

### 2. Per-path decision algorithm

Given the resolved immutable base SHA, eligible candidates loaded from the base tree, an optional validated selector, and the changed set (renames expanded to delete + add as today), each path is evaluated in this fixed order:

1. **Deny.**
   - If any eligible base-approved contract (change or standing, selected or not) has a matching `read_only`/`observe` target, or a policy that forbids the change kind, the decision is `denied`.
   - A selector MUST NOT suppress this.
2. **Protected.**
   - If the path matches `protectedPaths`, it MUST be positively allowed by the selected change contract.
   - When no selector is present, it must be allowed by exactly one change contract, and that contract must use the `full` profile.
   - Otherwise the decision is `protected_unauthorized`.
   - Standing authority never satisfies a protected path.
3. **Exempt.** If the path matches `exemptPaths`, the decision is `exempt`.
4. **Ungoverned.** If the path matches no `governedPaths`, the decision is `ungoverned`.
5. **Grant-before-spend** (every mode; see clarification C7). If the path matches `grantBeforeSpendPaths`, it requires a change-contract allow, with the same rules as step 6. Standing authority is ignored.
6. **Governed, with a selector.**
   - Only the selected contract's positive claims are considered. Allowed means `selected`; otherwise `uncovered`.
   - Other contracts' allows are ignored, so no ambiguity arises. Their denies were already applied in step 1.
7. **Governed, without a selector.**
   - Exactly one allowing change contract: `selected`.
   - Several allowing change contracts: `ambiguous` (`ESRT003`, unchanged).
   - No change contract but exactly one allowing unexpired standing contract: `standing`.
   - Several allowing standing contracts: `ambiguous`.
   - None at all: `uncovered`.
8. **Budget.** After per-path decisions, if the selected contract's `change_budget` or the repository default budget is exceeded, add `over_budget` for the change as a whole.

Tiering of change authority over standing authority (step 7) is **not** glob-specificity precedence. Both claims are base-approved positive authority. Tiering decides only *attribution*, meaning which obligations and receipts apply, never whether a denied or unauthorized path becomes allowed.

**Outcomes by mode:**

| Decision | advisory | standard | controlled | legacy (no `mode`) |
|---|---|---|---|---|
| `selected`, `exempt`, `ungoverned` | pass | pass | pass | `selected` only |
| `standing` | pass | pass | fail (C7) | n/a |
| `uncovered` (governed) | report | fail | fail | fail |
| `ambiguous` | report | fail | fail | fail |
| `denied` | report | fail | fail | fail |
| `protected_unauthorized` | report | fail | fail | n/a |
| `over_budget` | report | fail | fail | n/a |
| no eligible contracts + non-empty change | pass; report "no authority" | only exempt/ungoverned pass | only exempt/ungoverned pass | `ESRT001` |

- Advisory output MUST label itself `enforcement: advisory (not enforced)`.
- The *decisions* are identical across modes. Only the outcome differs. Conformance fixtures assert decisions and outcomes separately.

### 3. Explicit contract selection

**Selector sources**, in order: CLI `--contract <id>`, Action input `contract`, a PR label with the configured prefix, a branch name with the configured prefix (`es/<ID>/…`).

Rules:

- Selector values are **untrusted data**.
- Each value MUST match the EngineeringSpec ID pattern.
- More than one distinct value across sources is an error: selector conflict.
- The selected ID MUST resolve to exactly one eligible candidate in the trusted-base tree. Otherwise the result is an error: selector unresolved. Routing MUST NOT fall back to unselected behavior.

A selector MUST NOT:

1. widen the selected contract's targets;
2. suppress a deny from any approved contract;
3. select workspace-only, head-only, draft, proposed, spent or expired authority;
4. satisfy a protected or grant-before-spend path with standing authority;
5. change the mode or policy.

### 4. Standing versus change authority

New optional frontmatter: `authority_kind: change | standing`. The default is `change`.

A standing contract:

- MUST declare `expires_at`. The repository may cap the maximum lifetime.
- MUST NOT positively claim protected or grant-before-spend paths. Doing so is a routing error, and the contract is ineligible.
- Is ineligible after `expires_at`, evaluated against the base commit's committer timestamp, **not** wall-clock time. This keeps results deterministic.
- Is never closed by a receipt. It ends through `superseded`, `rejected`, or expiry.

A change contract keeps today's lifecycle.

### 5. Receipt-based closure

A **closure receipt** is inert JSON binding:

- contract ID;
- `spec_revision`;
- closure semantic digest;
- trusted base SHA;
- routed change digest;
- CLI version.

A change contract with a valid closure receipt in the trusted-base tree is **spent** and ineligible. The existing exact `approved → implemented` transition remains valid and equivalent.

**Security property.** Receipts can only *remove* eligibility. A forged, stale or mismatched receipt either is rejected (receipt invalid, and the contract stays eligible) or closes authority early. Both fail safe. A receipt MUST NOT create, widen, reactivate or re-date authority.

**Open decision (§Unresolved):** where receipts live and when they are written. The current contract-only lane (`src/routing/governance.ts`) rejects spec-directory paths that are not validated `*.engineering-spec.md` files, so receipts need a defined location and governance classification. Options:

- (a) `<specDirectory>/receipts/<id>.receipt.json` added in the implementation PR, as a new `implementation_with_receipt` classification;
- (b) a post-merge bot commit through the contract-only lane;
- (c) external storage. Rejected for eligibility decisions, because eligibility must be derivable from the base tree.

### 6. Lite contract profile

`profiles: [{ name: lite, version: "0.1" }]`:

- **Required:** frontmatter and `engineering-targets`.
- **Optional:** source refs, constraints, contracts, verification. When present they are validated as today.
- A lite contract is eligible in every mode. It MUST NOT satisfy a protected path, which requires the `full` (default) profile.
- `propose --lite` MUST generate a valid lite contract of at most roughly 15 lines.

### 7. Change budgets

- Optional contract frontmatter `change_budget: { max_files, max_changed_lines }`, and a repository default `policy.budgets`.
- Counts come from the same resolved base/head range as routing (`git diff --numstat -z`).
- Binary files count toward `max_files` only.
- Rename-only changes count as one file and zero lines.
- The contract budget, when present, overrides the repository default.

### 8. Secure adoption wiring

`adopt` MUST generate CODEOWNERS entries for:

- the spec directory;
- `/.github/workflows/`;
- `/.github/CODEOWNERS`;
- `/engineering-spec.json`.

`doctor` MUST warn when any are missing.

`docs/production-gate.md` MUST specify these ruleset settings:

- the required status check;
- require review from Code Owners;
- dismiss stale approvals on new commits;
- require approval of the most recent reviewable push.

It MUST also state the residual risk: a PR can modify its own `pull_request` workflow while keeping the check name. It MUST recommend an organization-level required workflow, or an externally hosted required check, where that risk is unacceptable.

`adopt` MUST stop generating `.github/prompts/engineering-spec.prompt.md`. That file is a reusable IDE prompt, not coding-agent instructions. `AGENTS.md`, optionally with `.github/copilot-instructions.md`, is the supported surface.

### 9. Vendor-neutral edit guard

`engineeringspec guard` is a read-only command.

**Input:**
- `--contract <id>` (or selector resolution);
- one or more `--path` values with `--change-kind`;
- or a normalized JSON event on stdin.

**Output:** `allow` or `deny` with the decision code, using the same base-pinned authority, policy and algorithm as §2.

It MUST NOT:
- execute runners;
- write files;
- make network requests.

**Adapters** live under `integrations/{claude,codex,cursor}/`:
- They translate each vendor's pre-tool hook payload into a guard event.
- They block direct edit/patch tools on `deny`.
- For shell commands, where write detection is unreliable, they run complete-state `check` at the end of the turn or session, via stop/after hooks.

Adapters are **guardrails, not enforcement boundaries**. Merge-time CI remains authoritative. Vendor hook formats MUST be re-verified against current vendor documentation at implementation time. No vendor behavior enters the core format.

### 10. Engineering requirements (reference implementation)

- **Executable ceremony benchmark.**
  - Scenarios declare inputs and expected decisions and outcomes only.
  - The harness creates temporary Git repositories, runs the real CLI, and derives actual outcomes, command counts, mutations and diagnostics from execution.
  - An authored `actualOutcome` field MUST be rejected.
- **Coverage.** Thresholds (statements 85, branches 80, functions 85, lines 85, or stricter) MUST include:
  - `src/routing/**`, `src/authority/**`, `src/config/**`, `src/gate/**`;
  - the guard;
  - the CLI modules for `next`, `work`, `finish`, `adopt` and `guard`.

  Tests MUST NOT call `process.chdir`.
- **Action startup.** The Action MUST NOT run `tsc` or install dev dependencies at runtime. It either:
  - ships reviewed bundled JavaScript (`runs.using: node20`/`node24`); or
  - runs production-only dependencies against reviewed prebuilt output.

  It MUST declare `outputs` (result, mode, classification, selected contract).
- **Self-gating.** This repository's CI MUST evaluate routing, authority, config and guard changes with a CLI built from the **trusted base** (or a pinned reviewed SHA), never with the PR head's own routing code.

## Compatibility

- **Documents:** additive draft fields (`authority_kind`, `expires_at`, `change_budget`) and a new optional profile.
  - Per SPEC.md, release candidates may add backward-compatible draft fields at the existing 0.1 identifier.
  - Implementations that do not support `lite` MUST reject lite documents with an unsupported-profile diagnostic rather than treating them as full contracts.
- **Configuration:** a new `repository-config-0.2` schema. 0.1 configurations remain valid and select legacy behavior.
- **Receipts:** a new receipt schema version. Existing implementation receipts are unchanged.
- **CLI/Action:**
  - Legacy behavior is preserved when `mode` is absent.
  - New inputs (`mode` override for dry runs, `contract`) are additive.
  - `gate-*` inputs keep their meaning.

## Security considerations

- **Base-pinned authority:** unchanged. Mode, policy, candidates, receipts and standing expiry all come from one immutable base tree.
- **Deny overrides allow:** evaluated first. No selector, mode, tier or exemption suppresses it.
- **Selector abuse:** selectors are untrusted and can only narrow. A malicious label can at most make a PR fail.
- **Exemptions are a reviewed weakening.** They live in trusted-base config, which is implicitly protected. Protected always beats exempt.
- **Advisory mode enforces nothing.** Output MUST say so, and `doctor` MUST report advisory mode as non-enforcing.
- **Standing authority is bounded** by expiry and cannot touch protected or grant-before-spend paths.
- **Receipts fail safe** (§5).
- **Budgets are not a security boundary.** Splitting work across PRs evades them. They are a guardrail for runaway agent diffs.
- **Edit guard:** a guardrail only. Agents may bypass hooks through shell or unsupported tools, and CI stays authoritative.
- **Workflow tampering:** documented residual risk with explicit mitigations (§8).
- **Self-gating:** base-built evaluation prevents a routing change from approving itself.
- **Inertness:** no new command execution in parsing, validation, routing, guard or receipts.

## Alternatives considered

- **Most-specific glob wins.** Rejected. Implicit, hard to audit, and interacts badly with the restricted-dialect interoperability goal. Explicit selection is auditable.
- **One-PR mode with the head contract as authority.** Rejected. It violates base-pinned authority: a PR could widen and spend in one change. CODEOWNERS review of the contract diff reduces but does not remove this.
- **Numeric priorities between contracts.** Rejected. Hidden global ordering, and conflicts move rather than disappear.
- **Extend maintenance controllers with globs.** Rejected. It increases the most complex construct instead of removing the need for it. Controllers remain supported and unchanged.
- **Status quo plus documentation.** Rejected by the reproduced evidence.

## Conformance changes

Fixtures are proposed here and implemented only under approved authority. See the inventory in `ES-routing-v2-adoption-modes` (`engineering-x-engineeringspec-conformance-inventory`). New diagnostic codes are **provisional** until implementation:

| Provisional code | Meaning |
|---|---|
| `ESRT008` | Protected path not authorized |
| `ESRT009` | Selector conflict or unresolved selector |
| `ESRT010` | Change budget exceeded |
| `ESRT011` | Standing authority invalid or expired |
| `ESRT012` | Standing authority claims a protected or grant-before-spend path |
| `ESRT013` | Closure receipt invalid |

## Reference implementation impact

Implementation proceeds in the phases defined by the authorizing contract:

- **Phase 0:** base-built self-gating, test hygiene, coverage scope.
- **Phase 1:** conformance fixtures.
- **Phase 2:** config 0.2, modes, policy, zero-contract advisory.
- **Phase 3:** selector, standing authority, budgets.
- **Phase 4:** receipts, lite profile.
- **Phase 5:** secure adoption wiring and docs.
- **Phase 6:** guard and adapters.
- **Phase 7:** executable ceremony benchmark and Action startup.

## Resolved decisions

These were recorded on acceptance and are binding for the implementation phases.

1. **Receipt location and timing (§5):** option (a). `finish` writes `<specDirectory>/receipts/<contract-id>.receipt.json` in the implementation PR, under a new `implementation_with_receipt` governance classification. The contract file is not edited.
2. **Standing versus change overlap (§2 step 7):** without a selector, a single allowing change contract takes the path over standing authority. Tiering decides attribution only. It never allows a denied, protected or grant-before-spend path.
3. **Action startup (§10):** a committed bundled JavaScript action under `action/`, built by `scripts/build-action.mjs`. CI verifies that the committed bundle matches the source build.
4. **Lite profile and protected paths (§6):** a `lite` contract never satisfies a protected path.
5. **One contract or per-phase contracts:** one authorizing contract, `ES-routing-v2-adoption-modes`, with mandatory phase order (`CON-PHASE-ORDER`).
6. **Standing lifetime (§4):** a default maximum of 180 days, configurable per repository. Expiry is evaluated against the trusted base commit's committer timestamp.

## Clarifications recorded in phase 1

Writing the conformance fixtures (`conformance/routing-v2/**`) forced these answers where the text above left room. The fixtures encode them, and they are subject to maintainer review in the phase 1 pull request.

- **C1. Governance classification runs first.** The contract-only lane and today's `ESRT006` mixed-change handling are unchanged. In a mixed change, a specification-directory path is `protected_unauthorized` (`ESRT008`) alongside `ESRT006`.
- **C2. Protection comes before governance scope.** A protected path is protected even outside `governedPaths`, and even with no candidates. Step 2 precedes step 4.
- **C3. `over_budget` is a change-level result.** It is reported in `changeDecisions` with `ESRT010` and leaves per-path decisions unchanged.
- **C4. An expired standing contract is ineligible.** When it is the only claimant, the path is `uncovered`, with `ESRT011` and `ESRT002`.
- **C5. `ESRT009` covers every invalid selector:** malformed, conflicting across sources, unresolved, or naming ineligible authority (draft, proposed, spent, expired). No per-path routing is reported for an invalid selector.
- **C6. Denies are evaluated first**, including denies from unselected and standing contracts and on exempt paths.
- **C7. Decisions are identical in every mode (`CON-MODES`); only outcomes differ.**
  - Grant-before-spend applies in every mode, which is consistent with `CON-STANDING`.
  - In `controlled`, a `standing` decision is not an authorized path. `valid` is false and the outcome fails, so every governed, non-exempt path needs change authority. This is today's model plus policy and selection. Keeping `valid` false (not just the outcome) keeps C15 consistent: `valid` means authorized.
  - This replaces the earlier "`controlled` mode only" wording in step 5 and the outcome table.
- **C8. Standing authority on protected or grant-before-spend paths is handled per path.** A standing allow on such a changed path is ignored for that path and reported with `ESRT012`. The standing contract stays eligible for its other paths.
- **C9. With a `mode` set, `ESRT001` is not emitted.** Each path gets a decision instead. Legacy (no `mode`) keeps `ESRT001`.
- **C10. Advisory never blocks.** Its outcome is `pass` for every routing decision and selector error. Only an invalid trusted configuration (for example `ESPTH002` in a policy glob) is an `error`, in every mode.
- **C11. An invalid receipt is reported as `ESRT013` at error severity.** The contract stays eligible, so it fails safe. `standard` and `controlled` fail until the receipt is corrected or removed.
- **C12. Conformance compares diagnostic codes as sets.** Emission order is an implementation detail. Canonical byte fixtures are generated and reviewed in the phase that implements each field.
- **C13. A rename counts as one file and zero lines toward budgets.** It is still routed as delete plus add, as today.
- **C14. Bootstrap advisory for first adoption.** On an adoption PR, the trusted base has no `engineering-spec.json`, so it cannot supply `mode: advisory`.
  - `select`, `check` and `review` accept `--bootstrap-mode advisory` (Action input `bootstrap-mode`).
  - The flag is honored only when the trusted base has **no** `engineering-spec.json` **and no** approved contracts. That way it can never weaken a repository that already has configuration or authority.
  - In every other case it is ignored and reported (`bootstrap: "ignored"`).
  - A missing configuration is **not** treated as advisory; legacy behavior is preserved (`CON-LEGACY-COMPAT`).
  - The flag lives in the workflow file, which a PR can already edit (see the residual risk in §8), so it adds no new bypass.
- **C15. Enforcement is separate from authorization.** Reports keep `valid` meaning "every path authorized", and add `enforcement: {mode, outcome, enforced}`. Only the exit codes of `select`, `check` and `review` (and so the Action) follow `outcome`. `next` permission, `work`, `finish` closure and receipts still require `valid`, so an advisory pass never produces authority.

### Compatibility note for configured modes

Runtimes older than this change reject unknown keys in `engineering-spec.json`, so a configuration with `mode` or `policy` fails closed under them. Until a release re-pins the Action, the Action SHA that `adopt` generates is still the pre-RFC-0014 runtime. That runtime warns on the unknown `bootstrap-mode` input, and it still fails the adoption PR.
- **C16. Expiry only removes authority.** An expired standing contract (judged against the trusted base committer timestamp) loses its allows but keeps its `read_only`/`observe` denies, so expiry can never widen authority. Phase 4 applies the same rule to spent change contracts.
  - `ESRT011` is reported only for a changed path the expired contract would have allowed. It is `error` when the path ends `uncovered`, and `info` when other authority still covers the path. A stale standing contract therefore never fails unrelated changes.
- **C17. Routing runs once, then claims are partitioned.** The policy layer calls legacy routing a single time over every eligible contract, so denies and maintenance sequencing see the full trusted-base set. It then splits each path's remaining allows into change and standing claims. Per-path `ESRT002`/`ESRT003`/`ESRT004` findings are re-derived from the v2 decision; sequencing (`ESRT007`), duplicate-identity (`ESRT005`) and `ESG006` findings are kept.
- **C18. Standing authority and the change lifecycle.** Standing contracts are not counted as approved change contracts by `status` and `next`; they are listed separately (`standingAuthority`). So adding one never removes `permission: implementation` for the single approved change contract. `finish --write-closure` refuses standing contracts.
- **C19. Maximum standing lifetime.** The cap is checked in the contract-only lane, not at routing time.
  - It applies when a changed standing contract is added as approved, becomes approved, or changes `expires_at`.
  - `expires_at` must be after the trusted base commit, and at most `policy.maxStandingDays` (default 180, range 1–3650) after it.
  - The measurement point is the trusted base commit timestamp, never a PR commit date, which the PR author controls.
  - A violation is reported as `ESRT011`.
- **C20. Selector sources and merge queues.** Beyond the RFC's CLI, Action, label and branch sources, an `EngineeringSpec-Contract: <ID>` commit trailer on any commit in base..head is also a selector source.
  - Labels and branch names exist only on `pull_request` events, so GitHub merge-queue (`merge_group`) runs never see them. Trailers survive into queue commits, so the queue sees the same selector the PR did.
  - Label and branch sources are opt-in through trusted-base `selection` prefixes, so an unrelated branch such as `es/fix-typo` never becomes an `ESRT009` failure. Explicit `--contract` values and trailers are always read.
  - Selectors are ignored in legacy repositories (no `mode`).
  - **Known limitation:** a batched queue run that combines PRs naming *different* contracts reports `ESRT009` (conflicting sources), because one change can have only one selector. Repositories that rely on selectors should use merge-queue batch size 1, or avoid overlap for concurrently queued work.
- **C21. Budget scope.** Budgets count every routed implementation file, exempt and ungoverned files included, because they measure the size of the change and not its authority.
  - A rename is one file (C13). The exact monotonic close that accompanies an implementation is not counted.
  - A budget from exactly one attributed change contract (or the selected change contract) overrides the repository default. With several attributed contracts, only the repository default applies.
  - Line counts come from `git diff --numstat` over the same range and mode as the path diff. In working-state mode, untracked files are counted in full, even when rename promotion treats them as renames.
  - When paths are listed explicitly (`--changed`), line counts are unavailable. The line budget is then reported as not evaluated (`ESRT010`, info) rather than passing silently. The file budget still applies.
- **C22. Lite profile processing.**
  - The relaxed block requirements key on the profile *name* `lite`, so an unsupported lite version fails only with `ESV002`.
  - For lite documents, absent `engineering-source-refs` and `engineering-verification` blocks normalize to empty arrays, and the schema's minimum-one rule applies only to non-lite documents. Non-lite documents and their digests are unchanged.
  - Declared coverage treats only the ProductSpec profile as external (`unknown`), so a lite contract does not make coverage unknown.
  - `propose --lite` writes a 15-line draft.
- **C23. Receipt lanes and lifecycle.**
  - **When receipts apply.** Receipts are honored only in configured modes. Legacy repositories keep the exact `approved → implemented` close, and `finish` writes a receipt only in configured modes. The pinned pre-RFC-0014 Action and older CLIs never read receipts, so under them a receipt-closed contract stays open.
  - **Where receipts live.** They are stored at `<specDirectory>/receipts/<ID>.receipt.json`, and `finish --write-closure` never overwrites one.
  - **Adding a receipt.** A receipt added in the implementation lane closes its contract when all of these hold:
    - it parses;
    - its file name matches `contractId`;
    - its revision and closure semantic digest match the trusted-base contract;
    - its `baseSha` is the trusted base or an ancestor of it;
    - when the change also has implementation paths, one of them spends that contract.

    `changeDigest` and `cliVersion` are audit fields. They are not bound to the evaluating change, so receipts survive merge-queue rebatching. The change is classified `implementation_with_receipt`.
  - **Editing or removing a receipt.** Editing, renaming or deleting a receipt in the implementation lane is refused (`ESRT013`), because it would re-grant authority. The contract-only lane may delete a receipt only in the change that also revises (new `spec_revision`), supersedes or rejects its contract.
  - **Invalid receipts.** An invalid receipt already on the trusted base spends nothing, so it fails safe. `ESRT013` is an error only for changes that touch its contract, and info otherwise.
  - **Spent contracts.** A spent contract keeps its denies (C16). `next`/`status` count it as closed, marked `spent` in candidate summaries. `work` and `finish` are blocked for it. A selector naming it fails with `ESRT009`.
  - **This repository's CI.** Only `*.engineering-spec.md` documents and RFCs count as contract-only. Receipt paths are always routed.
- **C24. Checking trust-boundary ownership.** `doctor` checks ownership the way GitHub does, where the last matching CODEOWNERS pattern decides. It uses sample paths for the specification directory, `.github/workflows/`, `.github/CODEOWNERS` and `engineering-spec.json`, so a catch-all `* @owners` counts as coverage. It warns on any unowned path, and when `mode` is `advisory`. Both are warnings, which fail `doctor --strict`. `adopt --quickstart` writes anchored entries for all four paths and no longer generates the Copilot prompt file.

