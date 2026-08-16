# RFC 0011: Maximum safety with minimum ceremony

- Status: Proposed
- Date: 2026-08-17
- Contract: `ES-rc14-maximum-safety-minimum-ceremony`

## Summary

RC14 reduces the normal EngineeringSpec change journey from three human-reviewed pull requests to two when new authority is required, and removes repeated `--spec-dir`, `--base`, and `--strict` flags. It does so by composing the existing `status`, `prepare`, `check`, `review`, `transition`, proposal, evidence, and routing primitives rather than adding a second authorization system.

The invariant is unchanged:

> A change cannot grant or widen its own authority and spend that authority in the same pull request.

Only the exact approved contract revision loaded from a resolved trusted-base commit grants implementation authority. A head-branch transition from `approved` to `implemented` may record that the authority was spent, but it contributes no authority to the implementation diff.

RC14 is additive. Existing documents, lifecycle states, commands, explicit flags, Action inputs, and inert specification runners remain valid. Durable repository policy, risk-tiered authorization, hosted services, and a web UI are not part of this RFC.

## 1. Current journey and primitive reuse

The documented workflow currently presents six lifecycle stages, but the security boundary does not require one pull request per state. `proposed` is already optional in the format, while a temporary approved contract currently requires a separate closure pull request because mixed implementation and lifecycle changes fail routing.

### Current normal journey

```text
local draft
  -> optional proposal-state pull request
  -> approval pull request
  -> implementation pull request
  -> closure pull request
```

The minimum safe practice today is normally three pull requests: approval, implementation, and closure. Repositories that persist `proposed` in a separate review pay a fourth merge without gaining an additional authorization boundary.

Daily use also repeats repository facts across `status`, `prepare`, `check`, and `review`. The commands are individually useful, but the user or coding agent must remember their order, flags, evidence wording, and closure procedure.

### Reuse map

| RC14 surface | Existing primitive reused | Added responsibility |
|---|---|---|
| repository configuration | existing option objects, base resolution, `doctor`, `adopt` | load authorization settings from one immutable base blob |
| `next` | `status`, lifecycle counting, routing diagnostics | informational next-safe-action rendering that tolerates unrelated dirt |
| `work <id>` | `prepare`, candidate loading, base SHA resolution | zero-flag configuration and one stable agent JSON envelope |
| `finish <id>` | `check`, `review`, `transition`, receipts | trusted evidence collection, PR metadata, and monotonic closure preparation |
| authority diff | normalized model, canonical JSON, digest, review rendering | one reusable semantic change model |
| implementation plus close | governance classification and multi-spec routing | recognize one exact monotonic close without using head authority |

`propose` and `review` remain the submission path. RC14 does not add `submit` unless later implementation analysis demonstrates a capability that cannot be composed from those commands.

## 2. Essential and accidental friction

Security-essential friction is limited to:

1. new authority must be reviewed and merged before it can be spent;
2. authorization must use an immutable, resolved trusted-base SHA;
3. every implementation path must remain fail-closed against base-approved candidates;
4. read-only, denied, ambiguous, uncovered, and invalid surfaces must fail;
5. verifier requirements and evidence must be explicit without executing untrusted document commands; and
6. any head contract accompanying implementation must be proven semantically identical to its base contract except for an allowed monotonic close.

The following are accidental friction:

- persisting `proposed` in its own pull request;
- typing the same repository options for every command;
- requiring a third human merge solely to change `approved` to `implemented`;
- hand-assembling PR descriptions and evidence summaries;
- asking agents to infer the next safe command;
- making informational inspection fail merely because unrelated user work exists; and
- explaining text changes without showing their authority meaning.

## 3. Lifecycle semantics

The format 0.1 status enum is unchanged.

- `draft` is the normal local authoring state.
- `proposed` remains a valid optional persisted review state. It grants no authority and is not a required merge.
- `approved` grants authority only when the exact document revision is present on the trusted base.
- `implemented` records completion and is never eligible implementation authority by default.
- `superseded` and `rejected` retain their current non-authoritative meanings.

The target journey for new authority is:

```text
local draft
  -> authority pull request reviewed and merged as approved
  -> implementation pull request with trusted evidence and approved -> implemented
  -> done
```

There are exactly two meaningful human approvals because the first grants authority and the second reviews its spend. The implementation pull request may close only the exact contract that authorized it.

The lifecycle classifier adds `implementation_with_monotonic_close`. This classification is not `contract_only`. Implementation paths are still routed exclusively against approved contracts loaded from the base SHA. The head contract is inspected only after base authorization has been established and can only make the result fail.

## 4. Exact implementation-plus-closure algorithm

Given a repository state, trusted base reference, and specification directory:

1. Resolve the trusted base exactly once to `baseSha`. All later Git reads use that SHA, not the movable ref.
2. Load authorization-affecting repository configuration from `baseSha`.
3. Load, parse, and strictly validate all candidate contracts from `baseSha` using existing bounded candidate discovery.
4. Collect the selected implementation diff using the existing null-delimited Git collector.
5. Separate changed EngineeringSpec paths from non-spec implementation paths without dropping either set from the report.
6. Route every non-spec path using only base candidates whose base status is `approved`. Head documents never enter candidate selection.
7. For each changed EngineeringSpec path in a mixed implementation diff, require all of the following:
   - the same path exists at `baseSha`;
   - the base document parses and strictly validates;
   - the base document is uniquely identified by the same contract ID;
   - the base status is exactly `approved`;
   - the head document parses and strictly validates;
   - the head status is exactly `implemented`;
   - `spec_format`, `spec_format_version`, `spec_revision`, ID, repository reference, and document path are unchanged;
   - the closure semantic digests are equal; and
   - any changed field is on the explicit completion allowlist.
8. The completion allowlist for RC14 contains only:
   - `metadata.status`: `approved` to `implemented`; and
   - optional `metadata.updatedAt`: a valid date-time.
9. Reject additional, deleted, renamed, copied, or multiply matched EngineeringSpec files in the mixed implementation unit unless they are independently classified by an existing safe governance lane outside that unit. A new or widened contract cannot accompany dependent implementation.
10. Run normal deny-wins, ambiguity, uncovered-path, strict-warning, unsafe-path, and complete-diff checks.
11. Emit success only if both the base-only implementation routing and monotonic closure validation succeed.

The evaluation order is security-significant. Implementations are authorized before the head closure is considered. The head document can never add a candidate, target, exception, verifier, or policy to the routing decision.

The following mixed changes fail closed, even when their text appears harmless:

- any revision change;
- target addition, removal, path edit, component edit, owner edit, or policy edit;
- constraint addition, removal, or modification;
- verification or evidence-requirement change, including runner declarations;
- source-reference, technical-contract, decision, exception, rollout, profile, base-revision, repository, supersedes, extension, or prose change;
- ID, title, owner, creation-time, or document-path change; and
- any lifecycle transition other than `approved` to `implemented`.

These restrictions are intentionally stronger than a minimal authority subset. Completion should not become a hidden amendment channel.

## 5. Semantic digest rules

RC14 defines two related deterministic projections.

### Closure semantic projection

The closure semantic projection is the normalized EngineeringSpec with only these values removed:

- `metadata.status`; and
- `metadata.updatedAt`.

No other field is omitted. Prose, extensions, runner declarations, ordering-normalized arrays, and every accepted format field remain part of the projection. The closure semantic digest is:

```text
sha256(canonicalJson(closureSemanticProjection(normalize(spec))))
```

Base and head must have identical closure semantic digests. A separate field-level allowlist check ensures that only the permitted status transition and optional timestamp changed. Digest equality is not used as a substitute for structural validation.

### Authority projection

Authority diff uses a typed projection rather than a generic text tree. It contains:

- contract identity and revision;
- repository, base, profile, and supersession references;
- targets and change policies;
- read-only/protected surfaces;
- constraints and exceptions;
- verifier and evidence requirements;
- source and technical-contract references;
- decisions and rollout controls where they affect obligations or compatibility; and
- lifecycle state as a separately reported, non-authorizing dimension.

All arrays are sorted deterministically by stable ID and Unicode code-point ordering where order has no declared meaning. Object keys use existing canonical JSON ordering. Digests are lowercase SHA-256 values over UTF-8 canonical JSON. Raw runner payloads may be included in internal identity comparison but must remain omitted from normal agent-facing and PR rendering.

## 6. Trusted-base repository configuration

RC14 adds one optional bounded JSON file at the repository root:

```json
{
  "$schema": "https://engineeringspec.org/schema/repository-config-0.1.json",
  "specDirectory": "docs/engineering-specs",
  "strict": true,
  "trustedBase": "origin/main",
  "trustedVerifiers": {
    "ES-42#VER-QUALITY": {
      "argv": ["npm", "run", "quality"],
      "workingDirectory": ".",
      "network": "deny",
      "timeoutSeconds": 900
    }
  }
}
```

The default filename is `engineering-spec.json`. JSON is used to keep parsing bounded and unambiguous. Unknown authorization-affecting keys fail strict validation.

### Safe bootstrap

A committed feature-branch file cannot safely choose the ref from which its own trusted configuration is loaded. Therefore the trusted-base locator uses this precedence:

1. explicit `--base` or enforcing Action input;
2. repository-local Git configuration `engineeringspec.trustedBase`;
3. the resolved `origin/HEAD` remote-tracking symbolic ref; or
4. fail with an actionable remediation.

`adopt` and `doctor` may help a user configure the repository-local Git value with explicit consent. CI should continue passing its reviewed base or event base SHA explicitly.

After resolving `baseSha`, authorization-affecting configuration is read only with `git show baseSha:engineering-spec.json`. The base copy determines `specDirectory`, strictness, trusted verifier mappings, limits, and authorization-related defaults. A workspace copy may be parsed for drift reporting, but cannot affect the current authorization result.

The `trustedBase` value inside the base-loaded file is a consistency assertion and presentation default, not the bootstrap trust root. A mismatch with the bootstrap locator fails in enforcing mode.

### Presentation-only local settings

Color, preferred human output format, and verbosity may come from user or workspace settings only when they cannot alter files selected, validation severity, authority, verifier execution, evidence acceptance, exit status, or machine-readable content. Machine JSON never depends on terminal presentation preferences.

### Threat analysis

| Threat | Required behavior |
|---|---|
| PR changes `specDirectory` to hide its own files | ignore head config for authorization; use base config and report drift |
| PR sets `strict: false` | use base strictness |
| PR changes `trustedBase` to its own branch | bootstrap never trusts the workspace value |
| PR replaces trusted verifier command | execute only the mapping loaded from `baseSha` |
| config path is a symlink or traversal | use bounded Git blobs and repository-relative safe paths; reject traversal and non-regular workspace mutation targets |
| base ref moves during command | resolve once and bind every report and receipt to `baseSha` |
| remote tracking ref is stale | disclose resolved SHA; optional fetch remains explicit and never silently changes authority during evaluation |

Explicit CLI overrides remain available. In enforcing mode, an override that affects authorization is part of the receipt and must not be sourced from untrusted contract content.

## 7. Semantic authority diff

Authority diff is a reusable core result with stable JSON, text, and Markdown renderers. The JSON envelope is versioned independently from CLI presentation:

```json
{
  "format": "engineering-authority-diff",
  "formatVersion": "0.1",
  "base": {
    "sha": "abc123...",
    "path": "docs/engineering-specs/ES-42.engineering-spec.md",
    "contractId": "ES-42",
    "revision": 3,
    "closureSemanticDigest": "sha256:..."
  },
  "head": {
    "source": "workspace",
    "contractId": "ES-42",
    "revision": 3,
    "closureSemanticDigest": "sha256:..."
  },
  "lifecycle": {
    "from": "approved",
    "to": "implemented",
    "classification": "monotonic_close"
  },
  "authority": {
    "writableAdded": [],
    "writableRemoved": [],
    "createAdded": [],
    "createRemoved": [],
    "protectedAdded": [],
    "protectedRemoved": [],
    "constraints": { "added": [], "removed": [], "modified": [] },
    "verifiers": { "added": [], "removed": [], "modified": [] },
    "sourceReferences": { "added": [], "removed": [], "modified": [] },
    "technicalContracts": { "added": [], "removed": [], "modified": [] },
    "otherSemanticChanges": []
  },
  "noAuthorityChange": true,
  "safeMonotonicClose": true
}
```

Path-authority entries contain target ID, component when present, path, and change policy. Modified entries contain stable IDs plus before and after digests; human renderers may show safe field summaries. Add/remove sets must distinguish `create` from other writable policies and must report `read_only` and `observe` as protected changes. `interface_only` remains path-writable and retains its existing semantic-verification disclosure.

Human output groups additions, removals, protection, obligations, references, and lifecycle. An empty authority change explicitly prints `NO AUTHORITY CHANGE`; it must not be inferred from absent output.

The model powers `review`, PR metadata, CI summaries, coding-agent JSON, and future static UI. There must be only one diff calculation implementation.

## 8. `next` UX

`engineeringspec next` is informational and composes `status` plus repository configuration.

It:

- resolves and displays the trusted-base SHA;
- reports lifecycle counts and relevant contracts;
- distinguishes `permission: none` from malformed or blocked state;
- identifies unrelated working-tree changes without treating their existence as a command failure;
- recommends exactly one next safe action and command;
- never creates, edits, stages, stashes, resets, fetches, commits, merges, or approves; and
- supports stable JSON for agents.

A valid repository with no approved contract exits successfully and reports an informational next action such as `explore` or `propose`. Invalid configuration, unsafe paths, or malformed specifications remain errors. `next` does not claim authorization and is not a CI gate.

Example:

```text
next: work ES-42
authority: approved on origin/main @ abc123
working tree: 2 relevant paths; 1 unrelated path preserved
command: engineeringspec work ES-42
```

## 9. `work` UX

`engineeringspec work <contract-id>` is a thin configured form of `prepare`.

It:

- resolves trusted configuration and pins `baseSha` once;
- requires one exact approved contract ID from the base;
- delegates brief construction to the existing `prepare` implementation;
- reports writable, protected, and repository-read boundaries;
- reports constraints, verifier identities, references, unresolved questions, and final-routing caveats;
- omits verifier runner payloads;
- emits the same stable machine fields as `prepare`; and
- performs no Git or filesystem mutation.

When configuration is absent, existing explicit `prepare` behavior remains available. `work` may suggest `git fetch`, but fetching is opt-in because it changes the local remote-tracking state used for later resolution.

## 10. Safe `finish` UX

`engineeringspec finish <contract-id>` composes `check`, `review`, evidence validation, PR metadata, and `transition`.

Default behavior is dry-run and non-mutating. It:

1. proves the exact contract is approved at `baseSha`;
2. evaluates the intended implementation set and discloses excluded unrelated dirt;
3. runs the normal authorization check over the selected review unit;
4. lists required verifier identities;
5. validates supplied trusted evidence;
6. optionally invokes only trusted verifier mappings loaded from `baseSha` when repository policy and the user explicitly permit it;
7. prepares a deterministic implementation receipt and PR metadata;
8. previews the exact `approved` to `implemented` closure patch; and
9. re-evaluates the combined implementation-plus-close state with the monotonic closure algorithm.

Mutation requires an explicit option such as `--write-closure`. It may edit only the named contract path after validating the expected base/head identity. It never stages, commits, pushes, opens, merges, resets, stashes, or discards files. Optional Git-host orchestration remains a thin adapter outside core semantics.

`finish` must not describe a verifier as passed unless a validated trusted result exists. It must distinguish:

- requirement declared;
- trusted mapping available;
- execution attempted;
- execution passed or failed;
- external evidence accepted or rejected; and
- not run.

## 11. Trusted verifier and evidence model

Specification `runner` objects remain inert declarative data. They can describe author intent but are never selected as executable commands by `finish`, `check`, `review`, or the Action.

Execution authority lives in the base-loaded repository configuration. Mappings are keyed by both contract and verifier identity, for example `ES-42#VER-QUALITY`, so common IDs cannot collide across contracts. A mapping contains an argv array, bounded working directory, network declaration, timeout, and accepted result form. Shell strings remain forbidden.

Before execution, `finish` binds:

- `baseSha`;
- base contract path, ID, revision, and digest;
- verifier requirement ID and requirement digest;
- trusted mapping key and mapping digest;
- intended change digest; and
- CLI version.

Evidence results record mapping identity, start/end timestamps, exit status, result format, and safe artifact digests. They do not embed secrets or raw environment values. External evidence must satisfy the same identity binding and cannot be accepted solely because a filename matches a contract-declared artifact.

The generated receipt is evidence, not authority. CI or repository policy decides whether required evidence is sufficient to merge. A successful scope gate does not prove verifier execution or correctness.

## 12. Dirty-working-tree behavior

Commands use three explicit modes:

1. **Informational:** `next`, `status`, `doctor`, `work`, catalogue, context, and explain may report relevant and unrelated changes but do not fail solely because unrelated dirt exists.
2. **Intended-set helper:** proposal, closure writing, PR metadata, and trusted verifier helpers operate only on explicit paths or an explicit staged review unit. They preserve and report every unrelated path.
3. **Enforcement:** CI and complete review checks evaluate the actual committed pull-request diff and never exclude a path merely because a user labelled it unrelated.

No command automatically stashes, resets, cleans, discards, rewrites, or stages unrelated user work.

A local `finish --staged` may produce a scoped preparatory result while unrelated unstaged files exist. Its receipt must state `completeWorkingState: false` and list only counts/digests for excluded paths unless disclosure is requested. It cannot claim the whole worktree passed. CI remains authoritative over the final pull-request diff.

Rename and copy endpoints remain indivisible: both old and new paths must belong to the same intended review unit and pass existing cross-boundary rules.

## 13. PR metadata

RC14 defines one JSON model with a Markdown renderer. It contains:

- contract ID, revision, path, status, and closure semantic digest;
- trusted base ref and resolved SHA;
- intended head/diff digest;
- selected targets and path counts;
- semantic authority diff;
- required `CON-*`, `VER-*`, and `CONTRACT-*` identities;
- evidence state for each verifier without runner payloads;
- authorization result and diagnostics;
- lifecycle transition preview;
- EngineeringSpec CLI version; and
- explicit disclaimers that receipts do not grant authority or prove correctness.

Generated Markdown uses stable headings: Summary, Authority, Scope, Constraints, Verification evidence, Contract references, Lifecycle, and Trust statement. It never prints `VER-* satisfied` when evidence is merely declared or not run.

PR metadata generation is read-only. GitHub comment or pull-request creation is an optional adapter and is not required by core EngineeringSpec.

## 14. Coding-agent and CI workflows

### Coding agent

```text
engineeringspec next --format json
engineeringspec work ES-42 --format json
<agent implements only within the brief>
<trusted repository checks or externally supplied evidence>
engineeringspec finish ES-42 --staged --format json
```

The agent receives one stable envelope containing contract identity, resolved base SHA, writable/protected surfaces, constraints, verifier identities, unresolved questions, relevant/unrelated state, next action, and authorization result. Existing `prepare` and `review` renderers remain the source rather than being reimplemented.

### CI

CI passes or derives the event base, resolves it once, loads configuration and contracts from that SHA, checks the complete pull-request diff, validates any monotonic close, and emits authority diff plus evidence metadata. CI never trusts head configuration or a head-approved contract. Merge queues continue to use their reviewed merge-group base.

## 15. Backward compatibility and migration

- EngineeringSpec format 0.1 and every lifecycle value remain valid.
- `proposed` remains readable and writable but is documented as optional.
- Existing commands and flags retain their meanings.
- Repositories without `engineering-spec.json` continue using explicit flags and current defaults.
- Existing Actions continue to work; a later Action input may opt into base-loaded configuration.
- Existing contract-only closure remains accepted.
- Existing receipts retain their schemas. RC14 introduces versioned authority-diff and implementation-receipt models rather than silently changing old meanings.
- Existing specification runners remain inert.
- No contract is automatically migrated, closed, or rewritten.

Adoption can be incremental: add trusted configuration in one reviewed governance change, then use convenience commands. A repository may keep the three-PR workflow. Combined closure becomes available only when its CI/CLI version supports the new classification.

## 16. Implementation phases ordered by ROI

### Phase 1 — trusted configuration and shared resolution

Add the repository-config schema, safe base bootstrap, base-blob loading, drift reporting, and shared option resolution. Update `doctor` and `adopt`. This immediately removes repeated flags without changing lifecycle authorization.

Likely surfaces: `src/config/**`, `src/cli/program.ts`, `src/cli/doctor.ts`, `src/cli/adopt.ts`, discovery/path safety, schema packaging, and integration tests.

### Phase 2 — monotonic implementation closure

Add closure semantic projection/digest, field-level identity checks, and `implementation_with_monotonic_close` governance classification. Keep routing base-only.

Likely surfaces: `src/routing/governance.ts`, `src/routing/select.ts`, `src/routing/types.ts`, normalization/digest helpers, governance conformance vectors, and adversarial tests.

### Phase 3 — semantic authority diff

Add the typed core model, canonical JSON, text/Markdown renderers, and integration into `review` and CI summaries.

Likely surfaces: `src/authority/**`, `src/cli/review.ts`, `src/cli/render.ts`, `src/index.ts`, schemas, and unit/conformance tests.

### Phase 4 — dirty-tree separation and PR/evidence metadata

Add explicit intended-set handling, staged preparatory results, versioned implementation receipts, trusted evidence validation, and generated PR metadata. Preserve complete-diff CI enforcement.

Likely surfaces: `src/gate/collectDiff.ts`, `src/gate/receipt.ts`, `src/cli/review.ts`, new receipt schemas, and integration tests.

### Phase 5 — thin `next`, `work`, and `finish`

Compose the prior phases over existing status, prepare, check, review, and transition functions. Add no duplicate routing or authorization implementation.

Likely surfaces: `src/cli/next.ts`, `src/cli/work.ts`, `src/cli/finish.ts`, `src/cli/program.ts`, agent integrations, the portable skill, and user documentation.

Each phase must be separately reviewable and preserve all earlier conformance vectors.

## 17. Test and adversarial matrix

### Trusted configuration

- explicit base, local Git config, and `origin/HEAD` precedence;
- missing bootstrap fails with remediation;
- base ref resolves once and receipts bind the SHA;
- workspace config changes to base, spec directory, strictness, limits, or verifiers are ignored for authorization and reported;
- head config cannot hide its own path or disable strict warnings;
- traversal, unsafe path, oversized config, duplicate/colliding keys, invalid UTF-8, unknown strict keys, and malformed JSON fail;
- symlink and real-path workspace mutation targets cannot escape the repository;
- Action/merge-queue bases remain explicit and immutable.

### Monotonic closure

- exact base `approved` to head `implemented` with identical semantic digest passes alongside authorized implementation;
- optional valid `updatedAt` passes;
- base draft, proposed, implemented, superseded, rejected, missing, duplicate, or invalid fails;
- head revision, ID, path, format, repository, base revision, profile, title, owner, timestamp other than allowed `updatedAt`, supersedes, extension, or prose change fails;
- target add/remove/reorder-with-meaning/path/policy/component/owner/notes change fails;
- constraint, exception, verifier, runner, expected result, evidence requirement, source reference, technical contract, decision, or rollout change fails;
- contract addition, deletion, rename, copy, cross-boundary rename, or multiple lifecycle edits in a mixed change fails unless independently safe and non-dependent;
- head-approved widened contract never participates in routing;
- implementation remains denied when base authority does not cover a path even if head closes or widens a contract;
- denial and ambiguity from other base contracts still win.

### Authority diff

- deterministic output across input ordering and platforms;
- Unicode code-point ordering and canonical digests;
- create, modify, delete, interface-only, read-only, and observe additions/removals;
- modified constraints/verifiers/references represented once with before/after digests;
- lifecycle-only output explicitly reports no authority change;
- JSON schema and text/Markdown renderer parity;
- runner payloads omitted from agent and PR output.

### Verifiers and finish

- malicious `runner.argv`, environment, working directory, and reference are never executed;
- only a base-loaded `contract#verifier` mapping may execute;
- a head config mapping change cannot affect execution;
- missing, mismatched, stale, failed, timed-out, non-finite, malformed, or wrong-digest evidence cannot be called passed;
- receipt binds base, contract, mapping, diff, CLI version, and artifacts;
- dry-run is write-free;
- closure write edits only the named contract and refuses changed preconditions;
- no automatic stage, stash, reset, clean, commit, push, PR, approval, or merge.

### Dirty tree and compatibility

- informational commands succeed with unrelated modified/untracked files and report them separately;
- intended-set helpers never mutate or stage unrelated files;
- scoped/staged receipts cannot claim complete-worktree success;
- CI still rejects every uncovered path in the actual PR diff;
- existing flag-heavy commands, no-config repositories, proposal states, contract-only closure, old receipts, and all current conformance fixtures remain valid.

## 18. Expected reduction

For a consequential change requiring new authority:

| Measure | Current minimum | RC14 target |
|---|---:|---:|
| meaningful pull requests | 3 | 2 |
| authority-granting approvals | 1 | 1 |
| implementation-spend approvals | 1 | 1 |
| closure-only approvals | 1 | 0 |
| repeated repository flags per normal command | 3 | 0 |
| typical EngineeringSpec workflow commands after contract authoring | 5 or more | `work`, then `finish` |

The reduction removes no trust boundary. It combines implementation review with authority retirement and composes existing read-only primitives.

## 19. Risks and mitigations

- **Head closure accidentally contributes authority:** enforce base-only routing before closure inspection and add adversarial self-widening vectors.
- **Semantic digest omits an authority field:** use the stronger full-document closure projection and a field allowlist, not a hand-selected authority subset alone.
- **Committed config creates a bootstrap cycle:** obtain the base locator only from explicit input, local Git config, or `origin/HEAD`; never from the workspace file.
- **Convenience command diverges from core behavior:** delegate to exported existing functions and test output parity.
- **Scoped dirty-tree handling hides a PR path:** mark scoped receipts incomplete and keep CI on the actual complete PR diff.
- **Trusted verifier mapping becomes command injection:** accept argv arrays only from base-loaded bounded config; never shell strings or contract runners.
- **Generated metadata overclaims evidence:** model declared, mapped, attempted, passed, failed, and not-run states separately.
- **Optional `proposed` confuses teams:** document it as a review annotation, not an authorization requirement.

## 20. Explicit non-goals

RC14 does not add:

- durable standing policy or a one-PR routine-work authorization model;
- risk tiers as format or governance primitives;
- automatic contract approval, merge, commit, push, staging, or stashing;
- trust in feature-branch configuration or feature-branch approval;
- execution of specification-declared runners;
- a generic `submit` command;
- a GitHub dependency in core semantics;
- a hosted control plane, database, telemetry upload, plugin requirement, MCP requirement, or web UI;
- conflict-aware multi-envelope composition or relaxation of existing unique routing; or
- a claim that fewer commands improve correctness, productivity, adoption, or commercial outcomes.

## Conformance impact

RC14 requires new versioned repository-config, authority-diff, monotonic-closure, dirty-tree, trusted-evidence, and PR-metadata fixtures. Existing routing, governance, prepare, parser, validation, receipt, and runner-inertness fixtures remain mandatory. No reference implementation may ship until the adversarial matrix above proves that a head branch cannot authorize itself.

## Decision requested

Reviewers are asked to approve the design direction, especially:

1. the stronger closure semantic identity rule;
2. the safe trusted-base bootstrap precedence;
3. the two-PR lifecycle;
4. base-loaded verifier mappings with inert contract runners;
5. scoped local preparation without weakened CI enforcement; and
6. additive convenience commands over existing primitives.

Approval of this RFC does not approve implementation. The accompanying draft EngineeringSpec must be separately reviewed, narrowed where necessary, and merged as `approved` before RC14 code changes begin.
