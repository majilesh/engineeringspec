# EngineeringSpec 0.1 Draft Specification

This document is normative together with [`schemas/engineering-spec-0.1.schema.json`](schemas/engineering-spec-0.1.schema.json) and the conformance fixtures. The key words MUST, MUST NOT, SHOULD, and MAY are interpreted as requirements. The immutable public schema identifier is `https://engineeringspec.org/schemas/0.1/engineering-spec.schema.json`.

## Purpose and representations

An EngineeringSpec is a versioned change contract linking source intent, targets, authoritative technical contracts, constraints, proof obligations, rollout controls, and evidence. Markdown with YAML frontmatter and named YAML code blocks is the authoring representation. Canonical JSON is the machine representation.

Processors MUST use a CommonMark-compatible AST, preserve prose, retain diagnostic source locations, reject duplicate recognized blocks, and preserve unknown namespaced blocks named `engineering-x-<organization>-<name>`. They MUST NOT execute content during parsing or validation.

## Authoring document

Recognized names are `ENGINEERING_SPEC.md`, `*.engineering-spec.md`, and `*.engineeringspec.md`. Frontmatter fields and normalized model members are defined by the JSON Schema. Version 0.1 requires source refs, targets, verification, and at least one contracts or constraints block. Every recognized block occurs at most once.

The document MUST begin with YAML frontmatter containing:

- `spec_format: engineering-spec`
- supported `spec_format_version`
- a positive integer `spec_revision`
- an EngineeringSpec `id`
- a non-empty `title`
- a supported lifecycle `status`
- at least one owner

Lifecycle states are `draft`, `proposed`, `approved`, `implemented`, `superseded`, and `rejected`. `spec_format_version` identifies the standard; `spec_revision` identifies a revision of one contract. Processors MUST NOT infer either from the package version.

Recognized YAML blocks are:

- `engineering-source-refs`
- `engineering-targets`
- `engineering-decisions`
- `engineering-contracts`
- `engineering-constraints`
- `engineering-verification`
- `engineering-rollout`
- `engineering-evidence`
- `engineering-exceptions`

An unknown `engineering-x-<organization>-<name>` block is a namespaced extension and MUST be preserved. Other unknown `engineering-*` blocks MUST be preserved and produce a warning. Prose outside structured blocks MUST survive parsing and normalization.

## Semantic objects

Source references identify originating intent without copying it. Every source reference requires `id`, `type`, and at least one of `path`, `ref`, or `uri`. Local paths are repository-relative. The ProductSpec profile alone assigns additional meaning to `item_ids` such as `AC-*`, `EVAL-*`, and `SM-*`.

Target surfaces declare repositories, components, and relative paths or globs governed by a change policy. Policies are `modify`, `create`, `delete`, `read_only`, `interface_only`, and `observe`. Identical target paths with conflicting policies are invalid. Nested or overlapping globs with incompatible writable vs `read_only`/`observe` policies SHOULD warn; reference tooling gates MUST apply deny-overrides (any matching `read_only`/`observe` target blocks the path).

Target path patterns use a **restricted EngineeringSpec glob dialect** for authorization interoperability: literal path segments plus `*`, `**`, and `?` only. Leading `!` / `#`, extglob parentheses, brace expansion, character classes, backslashes, and parent-directory segments (`..`) are invalid (`ESPTH002`). Independent implementations MUST interpret this dialect identically; they MUST NOT silently adopt host-library extras.

Among non-forbidden matching targets, the reference gate uses **any-writable-allow** composition: if any matching writable policy permits the Git change kind, the path is allowed. Narrower writable policies such as `create` do not automatically intersect broader `modify` matches. Documents SHOULD avoid overlapping writable policies with incompatible intents.

`interface_only` is a **path-writable label** meaning “intended for interface-surface edits.” Reference tooling MUST NOT treat it as AST/API/ABI enforcement unless a separate adapter (for example OpenAPI or schema diff) is declared and run outside the path gate. The reference gate permits path writes under `interface_only` and emits warning `ESG006`.

Decisions record load-bearing choices and rationale. They are explanatory unless referenced by a contract, constraint, or verification obligation.

Contracts reference authoritative OpenAPI, AsyncAPI, JSON Schema, Protocol Buffers, GraphQL, migration, infrastructure, or policy artifacts. Every contract requires a path or URI. EngineeringSpec MUST NOT replace those formats with an embedded API or schema language.

Constraints use the levels `must`, `must_not`, `should`, `should_not`, and `escalate`. Absolute constraints default to error severity; advisory constraints default to warning severity. Enforcement may reference a policy adapter, verifier, contract, reviewer role, or an explicit `none`. When present, enforcement is kind-complete: `policy` requires `adapter` and `rule_ref`; `test` requires `verifier_ref`; `contract` requires `contract_ref`; `review` requires `reviewer_role`. An absolute constraint without enforcement is valid but warns. An `escalate` constraint requires named exception authorities.

Verification obligations identify what they prove and how evidence is expected. `proves` is a non-empty list of recognized internal or external IDs. Supported kinds are test, static analysis, schema check, policy, performance, security, AI evaluation, human review, and runtime observation. When a runner is present, `command` requires `argv`; `reference` and `external` require `reference`; `manual` may omit `reference`.

Evidence requirements name artifacts needed for approval or implementation. Exceptions reference one existing constraint, name approvers, and may expire. An expired exception is an error for approved or implemented specs and a warning for drafts.

IDs are case-sensitive, document-wide unique, and match `^[A-Z][A-Z0-9]*-[A-Za-z0-9][A-Za-z0-9._-]*$`. Standard prefixes are `ES-`, `SRC-`, `TARGET-`, `DEC-`, `CONTRACT-`, `CON-`, `VER-`, `EVIDENCE-`, and `EXC-`. External ProductSpec IDs are exempt.

All local paths MUST be relative, MUST NOT be drive-qualified or absolute, and MUST NOT escape the repository root. Technical definitions are referenced through mature formats rather than embedded mini-languages.

All IDs are globally unique within the document. Every target, contract, constraint, verifier, evidence, and exception reference MUST resolve **with the correct entity type**: `applies_to` → target; test `verifier_ref` / evidence `verifier_ref` → verifier; contract enforcement `contract_ref` → contract; exception `constraint_ref` → constraint. A present ID of the wrong type is invalid (`ESR008`). External source item identifiers resolve through their declared source reference and optional profile.

## Traceability and coverage

Traceability is many-to-many. A source item may be satisfied by contracts, constraints, and verifiers; a verifier may prove several obligations. Coverage tools MUST report source items, absolute constraints, contracts, and evidence requirements that lack proof or enforcement, plus dangling references.

Coverage is `complete`, `partial`, `unknown`, or `not_applicable`. These values describe **declared** proof/enforcement links (including `policy` and `review` enforcement), not that any verifier executed successfully. If an external source cannot be loaded, tools MUST report `unknown` rather than claim complete coverage. Advisory `should` / `should_not` constraints MAY be reported separately from required coverage.

## Verification and security

A verifier's `proves` array identifies source or engineering obligations. Command runners use an argv array, default to network denial, and remain inert. Human review uses manual or reference runners. AI evaluations reference a definition or external runner.

Validation MUST NOT run a command, make a network request, deploy, mutate a database, load secrets, or execute user-provided code. Declared runner environments are data and MUST NOT contain secrets. Any future executor is a separate trust boundary and command.

Input limits are 2 MiB per file, 512 KiB per structured block, YAML depth 50, and 10,000 items per block. YAML object construction, executable tags, unsafe prototype keys, and expansion attacks are rejected.

## ProductSpec profile

The optional `{name: productspec, version: "0.1"}` profile resolves local ProductSpec documents offline and checks revisions, SHA-256 digests, and `AC-*`, `EVAL-*`, and `SM-*` item IDs. Unavailable sources warn by default and error under strict external validation. Product requirements are not copied into the normalized model.

## Canonicalization and compatibility

Authoring snake_case keys map to camelCase. Conflicting snake_case and camelCase spellings of the same key in one object are invalid (`ESP009`) and MUST NOT silently prefer one spelling. Input that is not valid UTF-8 is invalid (`ESP010`). Each stable diagnostic code identifies one condition. Canonical JSON sorts object keys, preserves array order, normalizes prose line endings, adds defined safety defaults, excludes source locations unless requested, and never adds timestamps. SHA-256 digests cover canonical JSON bytes.

Before 1.0, patches fix implementations, minors add compatible fields or behavior, and breaking draft changes are prominent. Unsupported format versions are rejected; package versions never act as document revisions.

Object keys are ordered lexicographically by Unicode code point (ascending; not locale collation) in canonical JSON. Array order is preserved. Undefined implementation data and internal source locations are excluded unless source locations are explicitly requested. The canonical byte sequence ends with one newline. Digests are lowercase SHA-256 over those canonical JSON bytes, never the original Markdown.

Versioned schemas under `/schemas/0.1/` are immutable after release. Additive draft changes use a new schema and documented compatibility note rather than silently reinterpreting an existing field.

## Diagnostics and conformance

Diagnostics have a stable code, severity, message, file, optional source range, related locations, and optional hint. Parser failures, structural schema failures, reference failures, traceability gaps, unsafe paths, profile failures, security violations, and unsupported versions use distinct code families.

An implementation conforms to 0.1 when it accepts every valid fixture, rejects every invalid fixture with the required diagnostic codes, and produces byte-identical canonical JSON for expected outputs. Conformance does not require importing the TypeScript reference implementation.

## Repository discovery (reference tooling)

Document recognition for a single file is normative: `ENGINEERING_SPEC.md`, `*.engineering-spec.md`, and `*.engineeringspec.md`.

Recursive directory discovery, ignore files, and multi-document CLI aggregation are **reference-tooling behavior**, not normative document semantics. The TypeScript reference implementation:

- Discovers supported filenames under a path depth-first with deterministic sort order
- Skips `.git`, `node_modules`, `dist`, and `coverage` directories
- Honors an optional `.engineeringspecignore` at the discovery root using `minimatch` patterns
- Emits diagnostic `ESD001` when a directory or non-matching path yields no documents

Other implementations MAY provide equivalent discovery. They MUST NOT treat discovery policy as part of a document's canonical JSON or digest.

## Diff gate (reference tooling)

Comparing a repository diff to declared targets is **reference-tooling behavior**, not normative document semantics. The TypeScript reference implementation provides `engineeringspec gate`, a **diff-scope gate** (path and change-type allowlist), which:

- Accepts an EngineeringSpec plus either a git `--base`/`--head` range or explicit `--changed` paths
- Defaults `--spec-from base` when `--base` is set (Action default remains `base`); `workspace` remains available for drafting
- Resolves base/head to immutable commit SHAs **once**, then loads the contract and collects the diff against those SHAs
- May require `metadata.status` via `--require-status` (for example `approved`) in enforcing mode (`ESG005`)
- Collects diffs with null-delimited `git diff -z --name-status` and rejects unknown or malformed status records (`ESG004`)
- Treats paths matching no target as errors (`ESG001`)
- Applies **deny-overrides**: any matching `read_only` or `observe` target rejects the path (`ESG003`), even when a broader writable target also matches
- Enforces `change_policy` against added/modified/deleted/renamed files (`ESG002`)
- Treats `interface_only` as a path-writable label and emits `ESG006` (not interface/AST-aware; pair with a contract adapter for real surface checks)
- May write a durable unsigned `gate-receipt.json` via `--receipt` (spec digest, SHAs, changed-set digest, result) without claiming attestation
- Under `--strict`, MUST fail when the loaded contract has validation warnings (not only gate-produced warnings)
- MUST NOT execute verification runners or mutate the repository

The reference CLI also provides read-only agent helpers: `check` gates the complete working state and reports declared coverage, `context` selects obligations relevant to changed paths, and `explain` reports why a path is allowed or denied. Each command loads the contract from the approved base by default when `--base` is supplied. Agent context omits verifier runner payloads. Contract widening and its dependent implementation therefore require separate changes; an implementation MUST NOT authorize itself from a widened workspace contract.

Other implementations MAY provide equivalent gates. Gate results are not part of canonical JSON or digests. Making the gate merge-blocking requires configuring it as a required status check or ruleset in the host forge.
