# RFC 0008: Evidence integrity before the external pilot

- Status: Proposed
- Date: 2026-08-12
- Contract: `ES-evidence-integrity-before-pilot`

## Summary

Before external paired results are collected or published, strengthen the reference benchmark so impossible scope measurements fail validation, evidence provenance is distinct from completeness and publishability, experimental comparability metadata is explicit, and scope counts can be generated deterministically from immutable Git revisions. Resolve the existing `interface_only` and strict-mode contradiction, and complete agent-facing Unicode and Markdown rendering hardening.

This RFC does not add autonomous approval, execute specification runners, infer contracts, or create a hosted evidence service.

## Motivation

RC10 provides enough product surface to run an external pilot, but the evidence layer can currently accept internally inconsistent scope counts. It can also label a set of records `observed` when pair-comparability fields are missing. Those behaviors are compatible with legacy sparse records, but they are not strong enough for public claims.

Four distinct concepts must not be collapsed:

1. **Provenance:** whether retained records are observed or examples.
2. **Quality:** whether the required observations and pair identities are complete and comparable.
3. **Publishability:** whether the retained sample satisfies the declared publication policy.
4. **Authority breadth:** whether a finite concrete-path precision denominator can honestly represent the contract.

The reference format also defines `interface_only` as a path-writable intent label, while `ESG006` is currently a warning. Because strict mode fails warnings, recommended strict CI rejects every `interface_only` change even when a separately trusted interface verifier is used. The diagnostic should explain the limitation without contradicting the documented semantics.

## Terminology

- **Authorized changed path:** a unique expanded changed path allowed by the exact base-pinned contract for its Git change kind after deny-overrides.
- **Approved writable path:** a unique concrete base-tree path matched by a writable target, plus each authorized newly created path absent from the base tree.
- **Authority breadth:** `finite`, `open_create_namespace`, or `repository_wide`.
- **Complete evidence:** retained paired records contain all publication-required identity, comparability, execution-order, reviewer, scope, and outcome observations.
- **Publishable evidence:** complete observed evidence that passes all deterministic consistency and pair-comparability checks. Publishability never implies causality or generalizability.
- **Scope receipt:** an unsigned, deterministic, base/head-pinned JSON measurement produced without executing runners or reading workspace authority.

## Normative proposal

### 1. Reject impossible scope measurements

For `concrete-paths-v1`:

```text
authorizedChangedPaths = actualChangedPaths - unauthorizedPathsChanged
```

The reference benchmark MUST reject records when:

- `unauthorizedPathsChanged > actualChangedPaths`; or
- `authorizedChangedPaths > approvedWritablePaths`.

The summarizer MUST NOT cap an inconsistent value to one. Compatible valid legacy records remain accepted.

### 2. Separate provenance, quality, and publishability

`evidenceClass` remains the provenance field with compatible values `observed` and `example`.

Benchmark summaries MUST additionally report:

```json
{
  "interpretation": {
    "resultClass": "observed",
    "evidenceQuality": "complete",
    "publishable": true,
    "causalInferenceSupported": false
  }
}
```

`evidenceQuality` is `complete` only when every retained pair supplies publication-required fields on both conditions and all pair invariants pass. Otherwise it is `incomplete`.

`publishable` is true only when all runs are `observed`, evidence quality is complete, all deterministic validation passes, and authority breadth is explicitly classified. A publishable sample may still contain metrics whose interpretation is explicitly unavailable—for example, scope precision under an open create namespace. Publishability means the retained evidence can be reported with those limitations; it does not make every metric numeric. A publishable result remains descriptive for its retained sample and MUST NOT claim causality.

The CLI MUST support `benchmark --require-publishable`, returning non-zero when the summary is not publishable while still permitting compatible sparse records without that option.

### 3. Add reproducibility metadata

Benchmark records add optional, backward-compatible fields:

- `timeLimitSeconds`: positive finite number;
- `acceptanceReviewerId`: opaque non-empty identifier;
- `conditionSequence`: integer `1` or `2`.

Complete pairs MUST preserve the same time limit and acceptance reviewer and MUST contain the sequence set `{1, 2}`. The actual order is retained per pair rather than inferred from an overall pilot method.

Public examples and guidance MUST use opaque reviewer identifiers and MUST NOT publish private repository revisions, prompts, paths, or participant identities.

### 4. Represent open authority honestly

Scope records add:

```text
authorityBreadth:
  finite
  open_create_namespace
  repository_wide
```

- `repository_wide` applies when writable authority explicitly covers the repository or matches every concrete base-tree path.
- `open_create_namespace` applies when a writable wildcard target can authorize paths absent from the base tree but is not repository-wide.
- `finite` applies when writable authority is a finite set of literal paths for the measurement.

Only `finite` scope records can produce an interpretable precision score. Open-create and repository-wide runs remain in operational and safety summaries, but their precision is `null` with an explicit assessment. `catchAllTarget` remains readable for backward compatibility and maps to `repository_wide`.

### 5. Generate deterministic scope receipts

The reference CLI adds a read-only command equivalent to:

```sh
engineeringspec measure ES-change \
  --spec-dir docs/engineering-specs \
  --base <commit-ish> \
  --head <commit-ish> \
  --format json
```

The command MUST:

1. resolve base and head to immutable commit SHAs before measurement;
2. load and validate exactly one explicitly named `approved` contract from the base Git tree;
3. enumerate the concrete base tree and a committed base-to-head Git diff without including staged, unstaged, or untracked workspace state;
4. expand renames to old and new paths and count unique normalized repository-relative paths;
5. apply existing restricted-glob, change-policy, and deny-overrides semantics rather than reinterpreting authorization;
6. report approved, actual, authorized, and unauthorized counts, authority breadth, contract identity/revision/digest, resolved SHAs, and deterministic path-set digests without disclosing individual repository paths by default;
7. emit no runner command, runner environment, or runner payload; and
8. never execute a verifier, edit a contract, approve authority, or write unless an explicit output path is supplied.

Individual repository paths MAY be included only through an explicit disclosure option. The default receipt is suitable for embedding in a sanitized benchmark record but still requires normal repository and participant privacy review.

The receipt is unsigned measurement evidence, not authorization or proof that trusted repository checks passed. Benchmark records MAY embed the generated receipt. When both compatible legacy scope fields and a receipt are supplied, the reference summarizer MUST reject disagreements rather than choose one silently.

### 6. Make `ESG006` informational

The normative meaning of `interface_only` remains unchanged: it is a path-writable intent label, not AST/API/ABI enforcement.

Reference gate and router implementations MUST emit `ESG006` with severity `info` when `interface_only` authorizes a path. Strict mode MUST NOT fail solely because of this informational diagnostic. A separately trusted API, schema, or ABI verifier remains necessary when semantic compatibility matters.

No declaration inside an EngineeringSpec causes that verifier to execute.

### 7. Complete agent-facing rendering hardening

Shared agent-facing sanitization MUST remove the complete Unicode `Bidi_Control` set, including U+061C ARABIC LETTER MARK, in addition to terminal and newline controls.

Markdown renderers MUST NOT rely on backslash escaping for arbitrary data inside inline-code spans. They MUST choose a code-span delimiter longer than every run of backticks in the rendered value, or render the value through an equivalently safe construction. `prepare` and `review` MUST share the hardened primitives so their behavior cannot drift.

## Compatibility

- Existing minimal benchmark records remain accepted unless `--require-publishable` is used.
- `evidenceClass` retains its existing meaning as provenance.
- Existing `catchAllTarget` input remains readable.
- Existing valid finite `concrete-paths-v1` records retain their numeric interpretation.
- `interface_only` remains path-writable. The only semantic behavior change is that `ESG006` becomes informational, so strict execution no longer fails solely for the documented limitation.
- Scope receipts are additive and unsigned.

## Security considerations

- Measurement authority is loaded from the immutable base tree, never the workspace.
- Base and head identities are SHA-resolved before Git reads.
- Git operations use argument arrays, bounded output, and NUL-delimited parsing where path data is returned.
- Measurement never executes specification runners or trusted checks.
- A scope receipt cannot grant implementation authority and cannot replace `select`, `check`, or CI.
- Publishability is a deterministic evidence-quality policy, not a correctness or causality claim.
- Output hardening treats specification and repository-controlled strings as untrusted data.

## Alternatives

- **Cap impossible precision at one:** rejected because it hides contradictory records.
- **Make all new benchmark fields required:** rejected because it would break compatible historical inputs; strict publishability is opt-in and explicit.
- **Count wildcard strings as paths:** rejected because glob breadth is not comparable to concrete path counts.
- **Treat one exercised create path as finite authority:** rejected because the contract authorizes an open namespace.
- **Keep `ESG006` as a warning with an acknowledgement flag:** rejected because the format already defines `interface_only` as path-level intent and runners remain inert.
- **Build a hosted evidence platform:** rejected until external-pilot evidence identifies a need.

## Conformance changes

- Add a vector proving `interface_only` remains writable and `ESG006` is informational.
- Add strict routing coverage proving informational `ESG006` does not invalidate an otherwise valid route.
- Add benchmark fixtures for impossible authorized counts, incomplete observed evidence, publishability enforcement, condition-order invariants, open-create authority, and receipt/legacy disagreement.
- Add adversarial rendering fixtures containing U+061C, mixed bidi controls, HTML, newlines, ANSI escapes, and runs of backticks longer than the surrounding Markdown delimiter.
- Add Git-tree measurement tests for adds, deletes, modifications, renames, deny-overrides, exact-contract ambiguity, open-create namespaces, repository-wide targets, immutable base loading, and dirty-worktree exclusion.

## Reference implementation impact

Expected changes are limited to benchmark/schema code, a read-only measurement module and CLI command, gate/router diagnostic severity, shared agent-facing rendering helpers, conformance/tests, and corresponding documentation. `src/cli/program.ts` command-registration refactoring, MCP, plugins, dashboards, hosted services, architecture-derived authority, autonomous approval, and trusted execution remain deferred.
