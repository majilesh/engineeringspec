# RFC 0013: Historical replay and trusted maintenance sequencing

- Status: Proposed
- Date: 2026-08-21
- Contract: `ES-RC16-DX-AUTHORITY`
- Release target: `0.1.0-rc.16` after separate approval and implementation

## 1. Problem statement

EngineeringSpec's fail-closed authority model behaved correctly during deep dogfooding, but two legitimate workflows expose accidental ceremony:

1. historical verification is forced through the current-authority resolver, which treats a literal historical commit as a mismatch with a configured symbolic trusted base; and
2. a small maintenance contract that overlaps a long-running approved feature contract produces correct `ESRT003` ambiguity, but resolving the overlap currently requires revising, sequencing, closing, and later reapproving contracts across more governance pull requests than the security boundary requires.

The objective is not to make routing permissive. RC16 should preserve or strengthen immutable authority while restoring the product contract:

> One pull request when trusted policy already permits the work; two pull requests when new authority is required.

## 2. Dogfooding evidence

### Case A: RC14 trusted-base ProductSpec defect

RC14 reread a trusted-base EngineeringSpec through workspace-oriented ProductSpec validation during `review` and `finish`. RC15 fixed those paths by ensuring mutable workspace ProductSpec content could not influence trusted-base authority or its semantic digest.

Design consequence: every historical or trusted-base dependency must be read through one immutable snapshot abstraction. No local ProductSpec path may fall back to the current filesystem when its EngineeringSpec came from a Git blob.

### Case B: overlapping approved authority

A long-running feature contract and a maintenance contract both authorized `package.json` and `pnpm-lock.yaml`. RC15 correctly returned `ESRT003`; choosing one automatically would have been unsafe. The secure manual recovery required multiple contract revisions and later feature reapproval.

Design consequence: maintenance needs a trusted, auditable way to subtract a competing positive claim for exact paths without changing the feature contract's meaning or adding an ambiguity bypass.

### Case C: historical regression verification

An explicit historical SHA correctly failed current-authority evaluation because trusted repository configuration asserted `origin/main`. The old state was immutable, but it was not the current trusted authority source.

Design consequence: historical evaluation must be a separate read-only mode, not a weakened branch of current authorization.

## 3. Current behavior and root cause

The inspected RC15 implementation has the following properties:

- `next` resolves repository configuration and delegates to complete-working-state routing. It can recommend lifecycle actions, but does not model historical intent or a trusted overlap-remediation operation.
- `work` wraps `prepare`; `prepare` enumerates and validates the entire candidate set from the resolved base and grants permission only for one exact base-approved contract.
- `check`, `review`, and `finish` route all changed paths against approved contracts loaded from the base tree. `finish` may add only the exact `approved -> implemented` monotonic close after authorization.
- `routeChanges` treats more than one positive approved claim as `ESRT003` and applies deny-wins across contracts. It has no trusted sequencing input.
- `resolveRepositoryConfig` currently represents the bootstrap ref and resolved commit in one enforcing flow. The `trustedBase` value loaded from the base is both a symbolic identity assertion and part of current evaluation, so an explicit historical SHA is rejected when it does not equal the configured string.
- routing candidate loading uses `resolveProfiles: false`, preserving base isolation but not providing same-snapshot ProductSpec validation.
- ordinary ProductSpec validation requires an explicit repository root and confines real paths to that root. This prevents implicit mutable-worktree fallback.
- lifecycle transitions remain `draft -> proposed|rejected`, `proposed -> approved|rejected`, and `approved -> implemented|superseded|rejected`.
- governance inspection permits contract-only changes and exact implementation-plus-close, but not new or widened authority beside implementation.
- `catalogue` reads workspace documents for discovery and explanation only; it grants no authority.

The ceremony problem is therefore architectural: current evaluation has no non-authorizing snapshot mode and routing has no independently approved subtractive sequencing primitive. The correct ambiguity behavior should remain unchanged when no such primitive exists.

## 4. Threat model and invariants

RC16 must defend against:

- a branch changing configuration, ProductSpecs, EngineeringSpecs, or references used for trusted evaluation;
- an agent proposing a maintenance contract and immediately spending it;
- a maintenance declaration suppressing a prohibition or authorizing an uncovered path;
- stale sequencing declarations silently matching a revised contract;
- automatic selection among genuinely competing authorities;
- replay mutating lifecycle state, the evaluated repository, refs, or the working tree;
- replay invoking `runner.argv` or trusted verifier commands;
- a symbolic ref moving during an evaluation; and
- an old CLI ignoring new sequencing semantics and accidentally allowing a change.

The governing invariants are:

1. current authority comes only from an immutable commit resolved from independently selected trusted policy;
2. head or workspace content may only make an evaluation fail, never broaden it;
3. historical replay grants zero current authority and exposes no write operation;
4. maintenance sequencing can only subtract positive claims and cannot suppress deny claims;
5. sequencing is effective only when its exact controlling contract is approved in the trusted base;
6. specification runners remain inert data; and
7. absent, invalid, stale, overlapping, or cyclic sequencing fails closed.

## 5. Historical replay is first-class

Historical replay should be a first-class top-level command named `replay`. `verify-at` sounds like verifier execution, while `inspect --at` hides a security mode inside a general inspection command. `replay` is explicit, discoverable, and does not imply authority.

Conceptual CLI:

```text
engineeringspec replay <contract-id> \
  --at <immutable-authority-commit> \
  --operation review \
  --head-at <immutable-candidate-commit>

engineeringspec replay <contract-id> \
  --at <immutable-authority-commit> \
  --operation finish-readiness \
  --changes-file <read-only-fixture.json>
```

Rules:

- `--at` is required and must resolve to an immutable commit object. The report always records the full commit SHA.
- `--head-at`, when present, must also resolve to an immutable commit. Diffs are collected between immutable trees, never from the index or working tree.
- `--changes-file` is an inert, bounded, schema-validated path/kind fixture. It cannot contain commands. It is mutually exclusive with `--head-at`.
- `review` simulates candidate loading and path routing.
- `finish-readiness` simulates approval, routing, evidence-identity, and exact-close eligibility but never calls `transition`, writes a closure, accepts executable evidence, or invokes a runner.
- replay has no `--write`, `--write-closure`, `--staged`, `--worktree`, `--force`, `--prefer`, or selection option.
- a missing snapshot-local reference is an error, not a workspace fallback.

The machine result is `HistoricalSnapshotEvaluation`:

```json
{
  "format": "engineering-spec-historical-snapshot-evaluation",
  "formatVersion": "0.1",
  "authorityMode": "historical_read_only",
  "currentAuthorityGranted": false,
  "snapshotSha": "<full commit SHA>",
  "candidateSha": "<optional full commit SHA>",
  "repositoryConfig": {
    "snapshotSha": "<full commit SHA>",
    "configuredTrustedBaseRef": "origin/main"
  },
  "contract": {
    "id": "ES-example",
    "revision": 4,
    "status": "approved",
    "semanticDigest": "sha256:..."
  },
  "routing": {},
  "lifecycleReadiness": {},
  "diagnostics": [],
  "limitations": [
    "Historical replay grants no current implementation authority.",
    "Specification runners were not executed."
  ]
}
```

The process exit status reflects whether the simulated historical evaluation passed, not whether current work is authorized.

## 6. TrustedBaseRef versus ResolvedTrustedBaseCommit

RC16 should separate symbolic policy identity from immutable content identity:

```text
TrustedBaseRef
  value: origin/main
  source: explicit | repository_git_config | origin_head

ResolvedTrustedBaseCommit
  sha: f00a2a2...
  resolvedFrom: origin/main
  objectType: commit
```

Current authority evaluation uses both. It resolves `TrustedBaseRef` once, loads configuration from `ResolvedTrustedBaseCommit`, and enforces the snapshot configuration's `trustedBase` identity assertion against the selected ref.

Historical replay uses a distinct resolution record:

```text
HistoricalSnapshot
  sha: <required immutable commit>
  configuredTrustedBaseRef: <recorded from snapshot config, not asserted as current>
  currentAuthorityGranted: false
```

This is not an escape hatch for current evaluation. Supplying `--base <historical-sha>` to `work`, `check`, `review`, or `finish` retains current mismatch enforcement. Only `replay` uses historical mode.

## 7. Snapshot repository abstraction

Introduce a read-only `RepositorySnapshotReader` with bounded operations:

- resolve and verify one commit SHA;
- list safe repository-relative paths from that tree;
- read a bounded blob from that tree;
- report blob absence distinctly; and
- compute tree-to-tree changed paths without consulting the workspace.

Repository configuration, EngineeringSpecs, ProductSpecs, and repository-local references used by replay must all be read through the same reader and snapshot SHA. ProductSpec resolution should accept a content reader rather than silently constructing a filesystem path. Ordinary workspace validation continues using its explicit realpath-confined repository root.

No snapshot operation may create refs, check out files, modify the index, write temporary content inside the evaluated repository, or execute document-declared commands.

## 8. Maintenance and suspension alternatives

| Alternative | Security | Lifecycle/schema cost | UX/PRs | Recovery and auditability | Decision |
|---|---|---|---|---|---|
| A. Add `suspended` lifecycle state | Safe only with separately approved transitions, but whole-contract state is broader than the path conflict | Adds state, transitions, restoration rules, revision questions, and broad compatibility work | Common case risks governance PR to suspend, implementation PR, and another PR to restore | Restoration can be forgotten; whole-contract effects are hard to understand | Reject for RC16 |
| B. Approved maintenance contract declares path-scoped suspension | Strong when base-pinned, exact, subtractive, and deny-preserving | One optional additive authority-control block plus routing semantics | One authority PR plus one implementation-and-close PR | Exact paths and pinned referenced authority are auditable; closing controller restores normal routing | Select |
| C. Authority lease/activation model | Can be secure with trusted activation | Adds a second lifecycle, activation store, expiry, renewal, and server-policy questions | Potentially low command count but high conceptual cost | Failure recovery depends on external or repository activation state | Defer |

The selected design is option B, described as trusted maintenance sequencing. “Suspension” is an audit term for subtracting a positive claim, not a new lifecycle status.

## 9. Selected authority-control format

RC16 adds one optional structured block to format 0.1:

````markdown
```engineering-authority-controls
mode: maintenance
suspensions:
  - contract_id: ES-ACP-007-EVALUATION
    spec_revision: 4
    semantic_digest: sha256:<64 lowercase hex characters>
    paths:
      - package.json
      - pnpm-lock.yaml
```
````

The exact spelling is proposed for review, not implemented by this RFC. Its semantics are:

- the containing maintenance contract is the controller;
- the controller must be `approved` in the trusted base;
- every suspended contract must exist exactly once, be `approved` in the same base, and match both revision and closure semantic digest;
- suspension paths are safe, exact repository-relative file paths in RC16; globs are not accepted;
- every path must be positively writable by both controller and suspended contract for the evaluated change kind;
- only the named suspended contract's positive allow claim is removed for the exact path;
- `read_only` and `observe` claims are never removed;
- the controller must still uniquely authorize the path after subtraction;
- controls cannot chain, recurse, form cycles, or suppress another active controller in RC16;
- two controllers claiming the same path remain ambiguous; and
- any stale, inapplicable, broadened, or malformed control invalidates routing.

Older CLIs treat the new block as an extension. In strict mode they fail on the extension warning; in non-strict mode they ignore the subtraction and retain `ESRT003`. They therefore cannot accidentally spend sequenced authority.

## 10. Routing semantics

Routing remains deny-first and fail-closed:

1. resolve the current trusted base to one immutable commit;
2. load and strictly validate all candidates from that commit;
3. identify approved candidates and validate all authority controls;
4. evaluate deny claims across all approved candidates without suspension;
5. if any deny matches, return denied;
6. compute positive allow claims;
7. for each valid active controller, subtract only its pinned suspended contract's positive claim on an exact listed path;
8. return uncovered for zero claims, selected for one claim, and `ESRT003` for more than one claim; and
9. emit an audit record for every applied or rejected subtraction.

An authority control never turns a non-claim into a claim. It only changes `{A, B}` to `{B}` after independently trusted approval of B's exact control. If the control is absent, proposed only in the workspace, stale, or invalid, `{A, B}` remains ambiguous or the whole evaluation fails.

## 11. Lifecycle and state diagrams

The lifecycle enum does not change.

```mermaid
flowchart LR
  D["draft maintenance contract"] --> P["optional proposed"]
  D --> A["approved on trusted base"]
  P --> A
  A --> I["implementation plus exact close"]
  I --> M["implemented on new trusted base"]
```

Authority participation changes only through trusted-base eligibility:

```mermaid
sequenceDiagram
  participant H as Human/base review
  participant B as Maintenance contract B
  participant R as Router
  participant A as Feature contract A
  H->>B: Merge B as approved with exact A revision/digest/paths
  R->>A: Keep deny claims; identify A positive claim
  R->>B: Validate B positive claim and trusted suspension
  R-->>R: Subtract A positive claim only on exact paths
  R->>B: Select B for maintenance implementation
  B->>H: Close approved to implemented in implementation PR
  H-->>R: New base makes B inactive; A participates normally
```

No revision or reapproval of A is required because A was never modified or globally deactivated.

## 12. Self-authorization proof

Attack:

1. an agent wants to change protected path X;
2. trusted base contains contract A;
3. the agent creates maintenance contract B in its branch and declares A suspended;
4. the agent changes X in the same branch.

The attack fails because:

- routing candidates and authority controls are loaded only from the trusted-base commit;
- branch-only B is not a candidate and cannot subtract A's claim;
- the mixed contract-and-code change remains outside contract-only governance and cannot grant authority;
- changing B's workspace status to approved has no effect;
- B becomes effective only after an independently reviewed contract-only merge places the exact approved revision and digest on the trusted base; and
- B can then authorize only its own already-declared writable exact paths, while all deny claims remain effective.

Thus proposing suspension, approving suspension, and spending sequenced authority remain distinct security events. A repository may collapse proposal and approval into one human-reviewed authority PR, but dependent implementation cannot occur until that merge is the trusted base.

## 13. Audit and event semantics

Routing and review output should include, without runner payloads:

- controller contract ID, revision, path, and semantic digest;
- suspended contract ID, revision, path, and semantic digest;
- exact affected path;
- whether a positive claim was subtracted;
- reason when a control was rejected;
- remaining positive and deny claims; and
- trusted base SHA.

Historical replay output additionally records snapshot SHA, optional candidate SHA or fixture digest, snapshot configuration digest, selected contract identity, routing digest, lifecycle readiness, diagnostics, and the fixed statements `authority_mode: historical_read_only` and `current_authority_granted: false`.

These are deterministic evaluation records, not mutable activation events and not proof that a verifier ran.

## 14. CLI and progressive disclosure

The explicit commands remain available. `next` should add stable recommendations rather than hidden transitions:

- `work` when exactly one relevant approved contract can authorize the current changed paths;
- `request-approval` for draft/proposed authority;
- `resolve-authority-conflict` for `ESRT003`, including exact overlapping paths and contracts;
- `historical-replay` only when the user explicitly requests historical intent or a current-base mismatch diagnostic points to the separate read-only command; and
- `finish` for a uniquely selected implementation ready for closure.

`next` must not create contracts, approve controls, alter lifecycle state, choose among ambiguous contracts, or start replay implicitly. Machine JSON should expose recommendation code, reason, diagnostics, and explicit command separately from human prose.

## 15. Error remediation

### ESRT003

Report every ambiguous path and each approved claimant with contract ID, revision, contract path, matching target IDs, and base digest. Explain that automatic selection is unsafe. Safe actions are:

- narrow the implementation path set;
- merge an independently reviewed maintenance contract with exact path-scoped sequencing; or
- revise one authority in a contract-only governance change.

Never suggest `--force`, priority, “latest wins,” or manual contract selection as an authorization bypass.

### ESPR001

Distinguish:

- workspace validation missing an explicit repository root;
- current trusted-base validation using intentionally isolated profile handling; and
- historical snapshot validation missing a ProductSpec blob or reference in the same snapshot.

Historical failure should name the snapshot and missing safe path, and state that current workspace content was not consulted.

### Trusted-base mismatch

Current authority commands should continue to fail and explain the configured `TrustedBaseRef`, supplied ref, and resolved commit. When the supplied input is an immutable historical commit, the remediation may suggest `engineeringspec replay ... --at <sha>` while stating that replay grants no authority and cannot write.

## 16. Backwards compatibility and schema impact

Historical replay requires no EngineeringSpec document rewrite and no new lifecycle status.

Maintenance sequencing requires one optional additive structured block and matching normalized-model/schema support. Existing format 0.1 documents without the block retain byte-for-byte meaning. Old approved contracts remain eligible exactly as before. Absence of authority controls preserves current ambiguity behavior. Old CLIs fail closed as described in section 9.

Because the new block affects routing authority, implementation requires this RFC, schema updates, semantic validation, authority-diff coverage, and matching conformance fixtures. It must not be smuggled through a vendor extension or repository-local priority rule.

## 17. Failure modes

| Failure | Required result |
|---|---|
| snapshot SHA missing, ambiguous, or not a commit | replay fails before evaluation |
| historical config or contract missing | replay fails closed |
| historical local ProductSpec absent from snapshot | `ESPR001` error; no workspace fallback |
| maintenance controller not approved in base | control inactive and cannot authorize |
| suspended contract missing, duplicated, non-approved, or digest/revision mismatch | routing fails closed |
| suspension path is a glob, traversal, or outside both positive claims | routing fails closed |
| suspended contract has a deny claim | deny remains and path is denied |
| two controllers remain | `ESRT003` |
| controller closes with semantic edits | unsafe mixed close fails |
| replay is given a runner or write flag | option rejected |

## 18. Test strategy

Future implementation must prove:

1. replay evaluates configuration, contracts, ProductSpecs, and references from one immutable old snapshot;
2. replay reports zero current authority and has no write-capable code path;
3. workspace config and ProductSpec mutation cannot alter replay output;
4. current trusted-base mismatch enforcement remains unchanged outside replay;
5. unsequenced overlapping approved contracts still return `ESRT003`;
6. exact approved maintenance sequencing removes only the pinned positive claim;
7. draft, proposed, workspace-only, stale, broad, cyclic, or self-created controls fail closed;
8. deny claims cannot be suspended;
9. exact implementation-plus-close restores normal participation on the next base without modifying the suspended contract;
10. ordinary one-PR and new-authority two-PR workflows remain intact;
11. ceremony scenarios A-G meet their security and PR targets;
12. RC15 ProductSpec regressions remain green; and
13. all specification runners remain inert.

## 19. Developer-experience ceremony benchmark

Add a machine-readable `engineering-spec-ceremony-result` format with:

- scenario and fixture identity/digest;
- CLI version and trusted base SHA;
- expected and actual security outcome;
- commands required;
- pull requests required;
- lifecycle edits required;
- hand-edited files;
- concepts required;
- repository and authority mutations;
- diagnostics and remediation code;
- current authority granted; and
- runner execution count, required to be zero for replay.

The canonical scenarios and targets are:

| Scenario | Expected outcome | PR target |
|---|---|---:|
| A. Existing approved authority | selected; normal implementation | 1 |
| B. New authority | approval then implementation/close | 2 |
| C. Maintenance overlap | approved sequencing then implementation/close | <= 2 |
| D. Historical regression | one read-only command, no mutations | 0 |
| E. Competing authority without decision | fail closed with `ESRT003` | 0 successful implementation PRs |
| F. Agent self-suspension attempt | fail closed | 0 successful implementation PRs |
| G. Workspace profile/config mutation | trusted result unchanged | 0 additional governance PRs |

The benchmark must report command count without optimizing it independently of security. It should distinguish required user concepts from raw command invocations and validate remediation clarity with stable diagnostic action codes.

## 20. Migration strategy, scope, and open questions

Migration is additive:

1. merge and approve the RC16 authority contract separately;
2. implement snapshot reading and replay with no schema dependency;
3. implement the RFC-defined authority-control block, routing audit, and conformance fixtures;
4. add the ceremony benchmark and remediation output;
5. keep old documents unchanged;
6. prepare RC16 metadata only after the complete suite passes; and
7. publish only through a separately authorized release ceremony.

Equivalent RC15 base-blob call sites in `agentCheck`, `context`, `explain`, and single-contract `gate` should remain outside this RC16 contract. The explicit-root ProductSpec requirement prevents mutable fallback, so their present risk is fail-closed availability and inconsistent diagnostics rather than silent authority expansion. They should receive a separate narrow hardening contract that can reuse the snapshot reader after RC16 review.

Non-goals include verifier execution, hosted activation, leases, priorities, force selection, vendor-specific behavior, Action-pin updates, Agent Control Plane changes, automatic merges, publication, and rewriting existing contracts.

Open questions for approval review:

- Should the controller pin the suspended contract's full semantic digest or closure semantic digest? This RFC recommends closure semantic digest because status is separately required to be approved.
- Should RC16 allow exact directory prefixes? This RFC recommends exact files only initially.
- Should more than one suspended contract be allowed for one exact path? This RFC recommends yes only when each is independently pinned and the controller remains the sole positive claimant; any controller overlap still fails.
- Should replay accept tree objects in addition to commits? This RFC recommends commits only for RC16 because configuration and audit identity are clearer.
- Should ceremony benchmarking extend the existing agent-impact command or use `benchmark ceremony`? This remains an implementation-level CLI naming decision, with the result schema fixed independently.
