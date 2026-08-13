# RFC 0010: Risk-stratified pilot evidence

- Status: Proposed
- Date: 2026-08-13
- Contract: `ES-risk-stratified-pilot-evidence`

## Summary

Add optional, predeclared task-risk metadata to the paired agent-impact benchmark and report outcomes and ceremony cost separately for low-, medium-, and high-risk tasks. This lets the ten-task pilot test the narrower product hypothesis: EngineeringSpec may impose net cost on obvious small changes while earning that cost when scope is ambiguous, protected, or delegated to a more autonomous coding agent.

The field is backward-compatible for reading but required by the risk-stratified publication policy. Both conditions in a pair must carry the same tier. Historical records without a tier remain readable and visible as incomplete; the implementation must never infer a missing tier from observed duration, success, violations, paths, or corrections.

This RFC changes benchmark evidence metadata and summaries only. It does not add risk tiers to EngineeringSpec format 0.1, implementation authority, routing, governance, approval, target policies, scope receipts, or agent permissions. It makes no claim that EngineeringSpec improves productivity or correctness at any tier.

## Motivation

One aggregate result across tasks with materially different blast radii can hide the threshold the pilot exists to locate. A fixed contract-authoring cost can look extreme on a three-minute obvious fix and modest on a sixty-minute cross-component change. Averaging those tasks into one headline number obscures both outcomes.

The current benchmark already retains duration, tokens, contract authoring and review time, corrections, amendments, routing outcomes, and scope evidence. It does not retain a predeclared task-risk classification, so a later per-tier analysis would require an unaudited external join or, worse, post-hoc classification after outcomes are visible.

The pilot therefore needs a small evidence-model correction before observations begin:

1. define a bounded rubric based on blast radius and scope ambiguity;
2. record the tier identically on both conditions;
3. reject mismatched pairs;
4. preserve unclassified historical records without inventing a tier; and
5. publish aggregate and per-tier outcomes together.

Risk stratification is an experimental-analysis input, not a new governance policy. Pilot results may later inform a proposal for lower-ceremony workflows, but this RFC does not define or authorize those workflows.

## Terminology

- **Task risk tier:** the predeclared `low`, `medium`, or `high` classification attached to the common task before either paired condition begins.
- **Blast radius:** the plausible impact of an incorrect or out-of-scope change, including protected data, security, billing, deployment, schema, migration, and cross-service effects.
- **Scope ambiguity:** the degree to which more than one implementation surface or component boundary is plausibly relevant before exploration begins.
- **Tiered pair:** a valid baseline/EngineeringSpec pair whose two records carry the same task-risk tier.
- **Unclassified pair:** a compatible historical pair whose two records both omit the task-risk tier.
- **Absolute duration overhead:** EngineeringSpec duration minus baseline duration, in seconds, for one pair.
- **Relative duration overhead:** `(EngineeringSpec duration - baseline duration) / baseline duration`, for a pair whose baseline duration is greater than zero.
- **Human contract cost:** contract authoring and contract review seconds, reported separately rather than blended into agent duration.
- **Aggregate summary:** the existing summary across all retained records and pairs.
- **Tier summary:** a deterministic summary calculated from tiered pairs assigned to one tier.

## Normative proposal

### 1. Predeclare task risk

The task-risk tier MUST be chosen before either condition begins and MUST be retained with the task plan or equivalent pilot artifact. Classification MUST use the common task intent and repository context available before outcomes are observed. It MUST NOT use success, duration, token consumption, paths actually changed, gate results, review corrections, or any other observed condition result.

The public record need not disclose private task text or repository paths. The existing task-prompt digest, opaque task and pair identifiers, immutable base revision, and matching tier provide the privacy-safe binding. Pilot operators SHOULD retain the private predeclaration artifact under the participant's consent and audit procedure.

Changing a tier after either condition begins invalidates the pair for risk-stratified publication. An honestly retained correction MAY be documented as an excluded or incomplete observation, but the original tier and reason for correction must not be silently replaced.

### 2. Define the tier rubric

Classification uses plausible blast radius and pre-run scope ambiguity. Task size, estimated duration, developer seniority, desired outcome, and whether EngineeringSpec is expected to help MUST NOT determine the tier.

#### Low — obvious, contained surface

A task is `low` only when all of the following are true before either run:

- the likely implementation location is unambiguous and normally confined to one narrow surface;
- an incorrect change has a contained and readily reversible blast radius;
- the task is not adjacent to authentication, authorization, secrets, billing, financial calculation, persistent schema, migration, deployment, safety, privacy, or a cross-service contract; and
- delegated agent authority cannot plausibly affect a materially broader surface than the task itself.

Low-risk tasks are expected to reveal the workflow's fixed ceremony cost. Flat or negative ROI at this tier is a valid retained result and must not be excluded.

#### Medium — genuine surface ambiguity

A task is `medium` when it does not meet the high-risk criteria and at least one of the following is true:

- more than one implementation surface is genuinely plausible;
- the change normally spans multiple files or one internal component boundary;
- compatibility or integration behavior requires coordination across adjacent modules; or
- an incorrect change has a meaningful but bounded operational blast radius.

Ambiguity MUST be natural to the task and repository. Pilot operators must not manufacture extra components or artificially broaden a task to favor EngineeringSpec.

#### High — protected or broadly delegated surface

A task is `high` when at least one of the following is materially in scope or immediately adjacent:

- authentication, authorization, secrets, privacy, billing, financial calculation, safety, or destructive operations;
- persistent schemas, data migrations, deployment controls, infrastructure boundaries, or public/cross-service contracts;
- a change whose plausible mistake can affect multiple services, tenants, customers, repositories, or environments; or
- delegated or background agent execution with authority that could plausibly modify protected or unrelated surfaces without an explicit boundary.

High risk describes plausible impact or delegated authority, not implementation difficulty. A mechanically small change can be high risk.

When a task satisfies more than one tier, the highest applicable tier MUST be used. If classification remains genuinely disputed before execution, the pilot artifact MUST record the disagreement and resolution; unresolved tasks SHOULD be replaced rather than classified after outcomes.

### 3. Add compatible record metadata

Agent-impact benchmark records add:

```json
{
  "taskRiskTier": "low"
}
```

The only valid values are `low`, `medium`, and `high`. The field is optional for compatible parsing of historical records.

For every retained pair, either:

- both records MUST contain the same valid `taskRiskTier`; or
- both records MUST omit it and the pair is unclassified.

One present and one absent value is a mismatch and MUST fail pair validation. Different present values MUST fail pair validation. The implementation MUST NOT infer or copy a tier from the other condition during parsing.

`taskRiskTier` becomes part of pair comparability and missing-data reporting. It MUST NOT be inserted into scope receipts because it describes the experimental task, not repository-routing authority.

### 4. Preserve historical compatibility

Existing records that omit `taskRiskTier` MUST remain readable and summarizable without `--require-publishable`. Each missing record MUST increment `missingData.taskRiskTier`. A pair with both values absent contributes to the existing aggregate summary and to no tier summary.

Historical records MUST NOT be silently rewritten, assigned a default tier, or classified from their stored outcomes. Existing aggregate metrics and their interpretation remain unchanged except that risk-tier completeness is now visible.

Records with an invalid tier or a pair with mismatched presence or value MUST fail validation rather than being downgraded to unclassified.

### 5. Define tier summaries

The aggregate summary remains the primary compatibility surface. A new `tiers` array reports represented tiers in this exact order:

```text
low, medium, high
```

Tiers with no valid tiered pair are omitted. Each entry MUST identify its tier and report at least:

- task, pair, and run counts;
- the existing baseline and EngineeringSpec condition summaries for the tier's records;
- slower EngineeringSpec run count;
- amended EngineeringSpec run count;
- absolute duration overhead in seconds;
- relative duration overhead when calculable;
- the number of pairs excluded from relative overhead because baseline duration is zero;
- average EngineeringSpec contract authoring seconds;
- average EngineeringSpec contract review seconds; and
- existing outcome deltas, including success, scope violations, review corrections, tokens, unauthorized paths, and eligible scope precision.

Tier condition and outcome summaries MUST reuse the same validation and calculation semantics as the aggregate summary. Failed, slower, amended, denied, ambiguous, uncovered, other-contract-selected, open-authority, and metric-ineligible observations remain retained.

### 6. Calculate overhead without hiding task size

For each tiered pair:

```text
absoluteDurationOverheadSeconds = engineeringspec.durationSeconds - baseline.durationSeconds
```

The tier's absolute overhead is the arithmetic mean of pair-level absolute overhead values. Negative values are valid and mean the EngineeringSpec condition was faster for that pair.

When baseline duration is greater than zero:

```text
relativeDurationOverhead =
  (engineeringspec.durationSeconds - baseline.durationSeconds)
  / baseline.durationSeconds
```

The tier's relative overhead is the arithmetic mean of eligible pair-level ratios. It is reported as a numeric ratio, not silently converted to a percentage string. When no pair in the tier has positive baseline duration, the value is `null`. The summary MUST report how many pairs were excluded because baseline duration was zero.

The implementation MUST NOT divide aggregate average durations to manufacture the relative value; pair-level ratios prevent larger tasks from silently dominating the result.

Human contract cost MUST remain separate:

- average `contractAuthoringSeconds` for EngineeringSpec records when present;
- average `contractReviewSeconds` for EngineeringSpec records when present; and
- existing missing-data counts for omitted observations.

Human time MUST NOT be added to agent duration to create one blended headline number. Tokens likewise remain a separate outcome.

### 7. Publication policy

Under the risk-stratified pilot protocol, a record is complete for publication only when `taskRiskTier` is present in addition to the existing RC12 publication fields. Therefore:

- complete observed pairs with matching valid tiers may remain publishable when all other policy checks pass;
- historical or new pairs with both tiers absent remain readable but are incomplete and non-publishable under `--require-publishable`;
- mismatched or invalid tiers fail validation;
- negative routing outcomes remain publishable observations when otherwise complete, while metric eligibility remains governed by the v2 receipt; and
- a passing publication check remains a deterministic policy result, not proof of causality, correctness, adoption, or generalizability.

Public reporting MUST show the aggregate result and the per-tier result. It MUST state sample size and missing or zero-duration observations beside each comparison. It MUST preserve negative, slower, amended, failed, and inconclusive outcomes.

Tier results are descriptive for the retained sample. They MUST NOT be presented as proof that EngineeringSpec is faster, safer, more correct, more adopted, commercially successful, or appropriate for every task in that tier.

### 8. Separate empirical tiers from governance policy

`taskRiskTier` is benchmark metadata only. It MUST NOT:

- grant, deny, widen, or narrow an EngineeringSpec target;
- change approved statuses or base-pinned authority;
- influence `prepare`, `select`, `check`, `review`, routing, governance, or GitHub Action decisions;
- choose an approval workflow or number of PRs;
- authorize autonomous execution or merging;
- become a required EngineeringSpec format 0.1 field; or
- be inferred by an agent and treated as policy.

After the pilot, retained evidence MAY motivate a separate RFC for risk-sensitive ceremony. That future proposal must define its own trust boundary and conformance behavior and cannot inherit authority from this benchmark field.

### 9. Determinism and failure behavior

The reference summarizer MUST produce the same tier ordering and calculations for the same validated record set regardless of input file order.

Benchmark processing MUST fail without emitting a successful summary when:

- a record contains an unsupported task-risk value;
- paired conditions contain different tiers;
- only one condition contains a tier;
- existing pair comparability or measurement validation fails; or
- a numeric tier calculation encounters a non-finite input or output.

Zero baseline duration is not an error. It makes that pair ineligible only for relative-duration overhead and remains included in every other applicable metric.

Declared specification runners remain inert. No risk-tier operation executes a verifier, modifies a contract, changes Git state, or reads workspace content as authority.

## Compatibility

- EngineeringSpec format 0.1 is unchanged.
- Existing target policies, routing, governance, approved-base authorization, diagnostics, and runner inertness are unchanged.
- Scope receipt schemas 0.1 and 0.2 and concrete-paths-v1/v2 meanings are unchanged.
- Existing sparse and complete benchmark records remain readable without strict publication enforcement.
- Existing aggregate summary fields retain their meaning.
- Historical records without tiers remain unclassified; no migration or inference is performed.
- The GitHub Action, adoption workflow, agent skills, and integrations are unchanged.

## Security and privacy

- Tier metadata supplies no implementation authority and is never consulted by enforcement.
- Private task text, repository paths, participant identity, and proprietary risk rationale need not be published.
- The common task-prompt digest, opaque identifiers, immutable revisions, and same-tier pair invariant provide a privacy-safe public binding.
- Pilot operators retain the predeclaration artifact according to participant consent and withdrawal rules.
- A malicious or mistaken tier can bias analysis but cannot widen code authority. Predeclaration, reviewer oversight, highest-applicable-tier resolution, and publication of the rubric reduce this evidence-integrity risk.
- Benchmark summaries and receipts remain unsigned evidence and prove neither trusted-check execution nor correctness.

## Alternatives considered

- **Report only one aggregate result:** rejected because it hides fixed ceremony cost and risk-dependent effects.
- **Classify tasks after runs finish:** rejected because observed outcomes can bias the classification.
- **Infer tiers from changed paths or contract targets:** rejected because those are outcomes or enforcement artifacts, not the predeclared common task.
- **Store tiers only in prose:** rejected because structured pair validation and deterministic per-tier reporting would be impossible.
- **Make tiers mandatory for parsing:** rejected because it would break historical records.
- **Turn tiers into governance policy now:** rejected because the pilot exists to discover whether a meaningful threshold exists.
- **Blend human and agent time:** rejected because the costs affect adoption differently and a combined number hides that distinction.
- **Use ratio of aggregate average durations:** rejected because it weights task sizes differently from an average of pair-level relative overhead.

## Conformance changes

Add benchmark risk-tier vectors covering:

- valid low, medium, and high values;
- historical pairs with both tiers absent;
- invalid values;
- different tier values within a pair;
- one present and one absent tier;
- deterministic low/medium/high ordering across shuffled inputs;
- negative absolute and relative overhead;
- zero baseline duration and `null` relative overhead when no eligible denominator exists;
- missing tier publication failure;
- complete tiered publication success;
- preservation of failed, amended, slower, and negative-routing outcomes; and
- runner inertness and unchanged routing or governance behavior.

## Reference implementation impact

Expected changes are limited to the benchmark record interface and validator, agent-impact JSON schema, paired comparability checks, missing-data and publication-field policy, deterministic per-tier summaries, benchmark documentation, pilot guidance and templates, unit/integration/conformance fixtures, and honest zero-observation guidance where clarification is necessary.

No parser, EngineeringSpec schema, routing, governance, measurement receipt, Action, agent adapter, plugin, hosted service, inference, autonomous approval, or trusted execution change is authorized by this RFC.
