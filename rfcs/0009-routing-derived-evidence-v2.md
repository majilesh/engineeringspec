# RFC 0009: Routing-derived evidence v2

- Status: Proposed
- Date: 2026-08-12
- Contract: `ES-routing-derived-evidence-v2`

## Summary

Make enforcement and measurement consume one immutable, repository-wide routing decision. Introduce a versioned `concrete-paths-v2` receipt that records the complete privacy-safe outcome of that decision, distinguishes a requested contract from repository authority, measures finite authority granted rather than authority exercised, and retains negative routing outcomes instead of filtering them from publishable evidence.

Strengthen the paired benchmark so public pilot records bind the task stimulus, agent and harness versions, EngineeringSpec version, immutable revisions, timing, and review-blinding status. After this focused correction ships, freeze product functionality for the predeclared ten-task paired pilot.

This RFC does not change EngineeringSpec format 0.1, target-policy meanings, routing enforcement, runner inertness, or `concrete-paths-v1` history. It does not add inference, trusted execution, autonomous approval, dashboards, hosted services, architecture-derived authority, or multi-contract precision claims.

## Motivation

RC11 can produce a deterministic scope receipt, but its measurement path loads one requested contract and gates that contract independently. Repository enforcement instead loads the complete approved candidate set and routes every changed path to exactly one contract or to a negative outcome. Those procedures can disagree when another approved contract allows or denies the same path, when candidates are ambiguous, or when an approved identifier is duplicated.

RC11 also estimates a finite denominator partly from exercised additions. That understates an exact create set when only some authorized paths were changed, excludes absent paths that `modify` or `interface_only` could create, and can therefore overstate precision.

Finally, evidence policy must not create survivorship bias. A complete run containing denied, ambiguous, uncovered, or other-contract-selected paths is an important observed outcome. It can remain publishable as a result even though single-intended-contract scope precision is not numerically meaningful.

The correction separates three concepts:

1. **Repository routing outcome:** what the immutable approved candidate set decided for every expanded changed path.
2. **Sample publishability:** whether an observed record has deterministic, reproducible, policy-complete provenance and may be retained in public results.
3. **Metric eligibility:** whether a particular numeric metric, especially single-contract scope precision, has an honest denominator and interpretation.

Publishability does not imply metric eligibility, correctness, causality, or generalizability.

## Terminology

- **Approved candidate set:** every valid `approved` EngineeringSpec candidate loaded from the immutable base tree through the shared bounded loader.
- **Repository routing decision:** the single result of applying existing routing semantics to the complete approved candidate set and the committed expanded base-to-head diff.
- **Requested contract:** the unique approved candidate named by the caller. Its ID is a projection over repository routing, not a separate source of authority.
- **Expanded changed path:** a normalized repository-relative path and change kind. A rename expands to an old `deleted` path and a new `added` path.
- **Requested-contract-selected:** an expanded path uniquely selected by repository routing for the requested contract.
- **Other-contract-selected:** an expanded path uniquely selected for a different approved contract.
- **Negative routing outcome:** an other-contract-selected, denied, ambiguous, or uncovered expanded path. “Negative” describes the requested-contract projection, not whether the repository correctly enforced its policy.
- **Approved writable path:** a concrete path for which a representative change kind is uniquely selected for the requested contract by the complete repository routing decision.
- **Authority breadth:** `finite`, `open_create_namespace`, or `repository_wide`.
- **Publishable record:** a complete observed record satisfying the deterministic RC12 publication policy, including a v2 receipt for every scope claim.
- **Metric eligible:** a record for which a named numeric metric has the required semantics and denominator. A publishable record may be ineligible for a metric.

## Normative proposal

### 1. Use one immutable authorization pipeline

Measurement MUST use this pipeline:

```text
resolve immutable base and head SHAs
  -> load every approved candidate from the base tree
  -> obtain the committed base-to-head diff
  -> expand and normalize changed paths
  -> run repository routing once
  -> retain selected / denied / ambiguous / uncovered outcomes
  -> project the result onto the requested contract
  -> construct the receipt
```

The requested contract MUST NOT be gated independently and MUST NOT be loaded from the workspace. Measurement MUST use existing change-kind, restricted-glob, change-policy, deny-overrides, and ambiguity semantics. This RFC changes evidence derivation, not enforcement decisions.

Dirty staged, unstaged, untracked, and ignored workspace state MUST be excluded. Base and head MUST resolve to immutable commit SHAs before candidate, tree, or diff reads.

### 2. Share a bounded approved-candidate loader

`select`, `check`, and `measure` MUST consume a shared loader for base-tree candidates. It MUST:

1. enumerate at most 10,000 specification candidates from the resolved base tree;
2. parse, validate, normalize, and digest every candidate before eligibility filtering;
3. apply strict warning behavior consistently;
4. retain only `approved` candidates as eligible routing authority;
5. fail closed on duplicate approved IDs using the existing diagnostic contract;
6. use bounded Git output, argument arrays, and NUL-delimited path parsing where applicable; and
7. neither execute nor expose a specification-declared runner.

An invalid candidate, candidate-limit breach, duplicate approved ID, missing requested ID, or requested ID that is not uniquely approved MUST fail measurement. No successful receipt may be emitted for a failed measurement.

### 3. Define canonical digests

All v2 digests MUST use SHA-256 over UTF-8 canonical JSON. Canonical JSON for this RFC has no insignificant whitespace, uses JSON primitive encodings, preserves the object member order specified below, and orders arrays as specified. String ordering is ascending Unicode code-point order, not locale-sensitive order.

#### Candidate-set digest

The candidate-set input is an array of all approved candidates, ordered first by `path`, then `id`, revision, and digest:

```json
[
  {
    "path": "docs/engineering-specs/ES-example.engineering-spec.md",
    "id": "ES-example",
    "revision": 1,
    "status": "approved",
    "digest": "sha256:..."
  }
]
```

Object member order MUST be `path`, `id`, `revision`, `status`, `digest`. The candidate digest is the existing digest of the normalized specification. Including status prevents an eligibility transition from being invisible.

#### Routing-decision digest

The routing-decision input is an array ordered by normalized path and then change kind. Each entry has this member order:

```json
{
  "path": "src/example.ts",
  "kind": "modified",
  "decision": "selected",
  "selected": {
    "specId": "ES-example",
    "specPath": "docs/engineering-specs/ES-example.engineering-spec.md"
  },
  "allows": [
    {
      "specId": "ES-example",
      "specPath": "docs/engineering-specs/ES-example.engineering-spec.md",
      "targetIds": ["TARGET-code"]
    }
  ],
  "denies": []
}
```

Object member order MUST be `path`, `kind`, `decision`, `selected`, `allows`, `denies`. `selected` MUST be `null` unless the decision uniquely selects a candidate. Claim objects MUST use member order `specId`, `specPath`, `targetIds`; claims are ordered by `specId` and `specPath`, and target IDs are unique and code-point ordered. The allowed decision values are `selected`, `denied`, `ambiguous`, and `uncovered`.

The internal routing result MAY be enriched to preserve allowing and denying claims, but public enforcement behavior MUST remain unchanged.

#### Path-set digests

A path-set digest hashes a JSON array of unique normalized repository-relative path strings in code-point order. Default receipts MUST publish only the count and digest. Individual paths may appear only when the caller explicitly requests disclosure.

### 4. Introduce the v2 receipt

The scope-measurement schema adds version `0.2`. A v2 receipt MUST identify:

- `schemaVersion: "0.2"`;
- `methodVersion: "concrete-paths-v2"`;
- authority source as base-pinned repository routing;
- resolved `baseSha` and `headSha`;
- requested contract `id`, `revision`, `path`, and normalized digest;
- `candidateSetDigest`;
- `routingDecisionDigest`;
- authority breadth;
- counts and path-set digests for `approvedWritable`, `actualChanged`, `selectedForRequestedContract`, `selectedForOtherContracts`, `denied`, `ambiguous`, and `uncovered`; and
- deterministic limitations and metric-eligibility reasons.

The receipt MUST state that it is unsigned measurement evidence, grants no authority, proves no correctness, and does not show that trusted repository checks ran.

`--include-paths` MAY add the corresponding normalized path arrays. It MUST NOT be enabled by default. The receipt MUST never contain verifier command payloads, runner environment, credentials, or workspace-derived authority.

### 5. Partition the actual changed set

Renames MUST expand to the old path with kind `deleted` and the new path with kind `added`. After expansion, normalized paths are unique for count and digest purposes.

For the finalized single-intended-contract pilot convention, these sets MUST partition `actualChanged`:

1. `selectedForRequestedContract`;
2. `selectedForOtherContracts`;
3. `denied`;
4. `ambiguous`; and
5. `uncovered`.

Every actual path MUST appear in exactly one set. If duplicate expanded entries for one normalized path would produce conflicting classifications, measurement MUST fail closed as non-partitionable rather than inventing precedence.

The requested contract ID only selects the projection. A path counts as requested-contract-selected only when repository routing uniquely selects that exact approved candidate. Other-contract selections and all non-selection decisions remain present in the receipt.

### 6. Define `concrete-paths-v2` finite authority

The denominator measures authority granted, not paths exercised. For each literal writable target path on the requested contract, measurement MUST evaluate a representative change through the complete repository routing decision:

| Policy | Path exists in base | Path absent from base |
| --- | --- | --- |
| `create` | excluded | evaluate as `added` |
| `modify` | evaluate as `modified` | evaluate as `added` |
| `delete` | evaluate as `deleted` | excluded |
| `interface_only` | evaluate as `modified` | evaluate as `added` |
| `read_only` / `observe` | excluded | excluded |

The path enters `approvedWritable` only if that representative decision uniquely selects the requested contract. Repository-wide denial, other-contract selection, and ambiguity therefore reduce the effective finite authority.

A delete-only wildcard is finite over matching paths that exist in the base tree. Each matching path MUST be evaluated as `deleted` through full repository routing.

A create-capable wildcard under `create`, `modify`, or `interface_only` has `open_create_namespace` breadth unless its effective authority is repository-wide. Repository-wide authority has `repository_wide` breadth. The implementation MUST apply a conservative classification when it cannot prove finiteness.

Numeric single-contract scope precision is available only when:

- breadth is `finite`;
- `approvedWritable` is non-empty; and
- `selectedForOtherContracts`, `denied`, `ambiguous`, and `uncovered` are all empty.

Otherwise precision MUST be `null` with an explicit eligibility reason. Open or repository-wide authority, a zero denominator, and any negative routing outcome MUST NOT be converted to a numeric score.

### 7. Preserve negative outcomes without survivorship bias

`benchmark --require-publishable` MUST require a complete deterministic v2 receipt for every retained record making a scope claim. It MUST validate receipt structure, digest form, internal partition invariants, revision bindings, and agreement with any compatible legacy projection supplied in the same record.

Manual estimates and `concrete-paths-v1` records remain readable, summarizable, and historical, but they are non-publishable under the RC12 quantitative scope policy. They MUST NOT be silently upgraded or reinterpreted as v2.

A complete v2 record containing other-contract-selected, denied, ambiguous, or uncovered paths remains publishable as an observed outcome when all other policy checks pass. Its single-intended-contract precision is `null` and explicitly ineligible. The summarizer MUST retain the failure, operational, safety, duration, correction, and review observations rather than dropping the run.

This distinction prevents the publication policy from selecting only successful routes.

### 8. Embed complete privacy-safe provenance

Benchmark scope evidence MUST embed the complete privacy-safe v2 receipt or reference immutable receipt content whose digest and content are available to validation. A lossy receipt projection is insufficient.

When both a v2 receipt and legacy scope fields are present, the benchmark MUST reject disagreement rather than prefer either source. Pair validation MUST bind the same contract identity and digest, candidate-set digest, base SHA, task stimulus, and comparable execution configuration. Condition head SHAs may and ordinarily will differ. Each record’s `headRevision` MUST equal its receipt `headSha`; its repository/base revision MUST equal the receipt `baseSha`.

### 9. Add reproducibility metadata

Benchmark records add backward-compatible fields:

- `taskPromptDigest`: digest of the common task stimulus, excluding condition-specific EngineeringSpec instructions;
- `agentVersion`;
- `harnessVersion`;
- `engineeringSpecVersion`;
- `headRevision`;
- `startedAt`: ISO-8601 timestamp; and
- `reviewBlinded`: truthful boolean.

Complete publishable pairs MUST preserve the same base revision, task-prompt digest, model, agent version, harness version and applicable harness inputs, permissions, trusted check set, acceptance reviewer, and time limit. They MUST retain their condition order and distinct committed heads. EngineeringSpec version may be recorded as not applicable for a baseline execution environment only if the protocol and schema make that absence explicit; the post-hoc evaluator version remains recorded for both conditions.

`unauthorizedPathsMerged` MUST NOT exceed `unauthorizedPathsChanged`.

Private prompt text, participant identity, repository paths, and private revisions need not be placed in public records. Opaque identities and digests are sufficient when the underlying artifacts are retained under the pilot’s consent and audit procedure.

### 10. Fix the paired-pilot method

Each first-pilot task MUST name one intended approved contract and one immutable base revision. That same contract and base form the post-hoc scope rubric for both conditions.

The baseline condition:

- receives the common task and normal repository instructions;
- does not receive `prepare`, `context`, or EngineeringSpec-generated implementation guidance; and
- is not constrained by EngineeringSpec during implementation.

The EngineeringSpec condition receives the approved agent workflow and base-pinned context. Both committed condition heads are measured afterward using the same v2 repository-routing rubric. Repository checks and acceptance review use the same predeclared criteria for both conditions.

Acceptance review SHOULD be blinded to condition where practical. `reviewBlinded` MUST record what actually happened, not the intended method.

The retained evidence MUST include failures, slower runs, contract amendments, corrections, routing anomalies, onboarding friction, consent, timestamps, immutable commits, and negative or inconclusive findings. Exploratory dry runs performed before RC12 are methodology validation, not counted pilot observations; their immutable commits and raw notes SHOULD be retained so the method can be reproduced after RC12.

### 11. Compatibility

- EngineeringSpec format `0.1` is unchanged.
- Target change-policy meanings and repository routing enforcement are unchanged.
- Approved-base authority, strict validation, duplicate-ID failure, and inert runners are unchanged.
- `concrete-paths-v1` and schema `0.1` remain readable with their historical interpretation.
- Sparse legacy benchmark records remain readable without `--require-publishable`.
- No v1 record is silently converted to v2.
- The GitHub Action and existing agent integrations remain behaviorally unchanged by this RFC.

### 12. Security and privacy

- Candidate authority comes only from the resolved immutable base tree.
- Measurement is read-only unless an explicit receipt output path is requested.
- Git invocations use argument arrays, bounded output, and unambiguous path parsing.
- Default receipts disclose digests and counts, not repository paths.
- Specification runners remain inert data and their payloads are not exposed.
- A receipt is unsigned and supplies neither authorization nor proof of trusted checks.
- The candidate limit bounds adversarial repositories and accidental expansion.
- Invalid, ambiguous, duplicate, or non-partitionable inputs fail closed without a success receipt.

### 13. Failure behavior

Measurement MUST return non-zero and MUST NOT emit a successful receipt when:

- base or head cannot be resolved safely;
- the committed diff cannot be read or normalized safely;
- the base candidate ceiling is exceeded;
- any required candidate fails applicable validation;
- an approved ID is duplicated;
- the requested contract is absent, not approved, or non-unique;
- expanded paths cannot form the required partition; or
- canonical receipt inputs cannot be constructed deterministically.

Diagnostic output MAY describe the failure but MUST NOT imply that an incomplete receipt is publishable evidence.

### 14. Feature freeze

After the reviewed implementation is released and clean-install consumer smoke tests pass, product functionality freezes for the predeclared ten-task paired pilot. During the freeze, changes are limited to security, correctness, evidence-integrity, and pilot-blocking documentation fixes.

Post-pilot product priorities MUST be selected from observed adoption friction and retained evidence. Quantitative scope claims remain unpublished until deterministic v2 records pass the publication policy.

## Alternatives considered

- **Continue single-contract gating for measurement:** rejected because it can disagree with repository enforcement.
- **Count only requested-contract successes:** rejected because it hides meaningful failures and creates survivorship bias.
- **Treat exercised additions as granted authority:** rejected because partial exercise is not the denominator.
- **Assign conflicting expanded paths a precedence:** rejected because silent precedence would make the partition method non-reproducible.
- **Publish path lists by default:** rejected because counts and digests provide reproducibility with less repository disclosure.
- **Reinterpret v1 receipts as v2:** rejected because that would rewrite historical semantics.
- **Require numeric precision for every publishable record:** rejected because open authority and negative outcomes can be valid observations without a meaningful precision denominator.
- **Build an evidence service or dashboard now:** rejected until the pilot demonstrates that collection, analysis, or adoption needs justify it.

## Conformance and test impact

The dependent implementation MUST add:

- canonical candidate-set and routing-decision digest vectors;
- shared-loader tests for invalid candidates, warnings under strict mode, the 10,000-candidate boundary, duplicate IDs, immutable base loading, and runner inertness;
- repository-routing measurement tests for requested and other-contract selection, denial, ambiguity, uncovered paths, renames, dirty-worktree exclusion, and empty committed diffs;
- finite-authority tests for partial exact create exercise, existing create-only paths, absent modify and `interface_only` paths, delete-only literals and wildcards, rename destinations, cross-contract deny, and cross-contract ambiguity;
- schema and adversarial tests for complete v2 provenance, path omission, explicit disclosure, partition failures, digest disagreement, and receipt/legacy disagreement;
- benchmark tests proving negative outcomes remain publishable but precision-ineligible;
- paired-run tests for task, revision, version, reviewer, timing, order, and blinding invariants; and
- compatibility tests proving v1 and sparse legacy records remain readable without acquiring v2 meaning.

## Reference implementation impact

Expected dependent changes are limited to shared routing/candidate loading, measurement, benchmark validation and summarization, the v2 schema, conformance fixtures, tests, pilot documentation, release notes, and lifecycle closure. The RFC itself grants no authority beyond its approved target.

MCP, semantic inference, IDE extensions, agent-specific core behavior, plugins, dashboards, hosted evidence, architecture-model authority, autonomous approval, trusted runner execution, and multi-contract precision remain deferred.
