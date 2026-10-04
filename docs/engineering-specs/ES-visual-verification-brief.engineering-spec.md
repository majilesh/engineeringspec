---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-visual-verification-brief
title: Visual Verification Brief
status: implemented
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
---

# Visual Verification Brief

Provide an offline, interactive HTML explanation of a checked change: its trusted-base authority, changed-path routing, applicable constraints, declared verifier identities, and supplied verification evidence. Help reviewers identify blocked paths and missing evidence without mistaking scope authorization for implementation correctness.

This is a contract-only proposal. It grants no implementation authority until reviewed with `status: approved` and merged into the trusted base. No runtime, renderer, schema, fixture, documentation, or generated Action changes accompany this proposal.

## Source intent

```engineering-source-refs
- id: SRC-REVIEW
  type: document
  ref: src/cli/review.ts
  title: Existing deterministic complete-state review and trusted-base contract projection
- id: SRC-EVIDENCE
  type: document
  ref: src/evidence/receipt.ts
  title: Existing bound evidence envelope and verification states
- id: SRC-BOUNDARY
  type: document
  ref: docs/agent-control-plane.md
  title: Separation of reviewed authority from runtime execution and evidence collection
- id: SRC-EXPLORER
  type: document
  ref: src/catalogue/catalogue.ts
  title: Existing read-only HTML presentation precedent
- id: SRC-WORKFLOW
  type: document
  ref: AGENTS.md
  title: Reviewed authority before implementation and separately trusted verification
```

## Target surfaces

```engineering-targets
- id: TARGET-MODEL
  component: visual-verification-projection
  paths:
    - src/query/verificationBrief.ts
  change_policy: create
- id: TARGET-RENDERER
  component: standalone-html-renderer
  paths:
    - src/cli/verificationBrief.ts
  change_policy: create
- id: TARGET-INTEGRATION
  component: additive-review-html-output
  paths:
    - src/cli/program.ts
    - src/cli/review.ts
    - src/index.ts
  change_policy: modify
- id: TARGET-SCHEMA
  component: versioned-presentation-contract
  paths:
    - schemas/verification-brief-0.1.schema.json
  change_policy: create
- id: TARGET-TESTS
  component: projection-rendering-and-cli-tests
  paths:
    - test/unit/verification-brief.test.ts
    - test/integration/verification-brief.test.ts
    - test/conformance/verification-brief.test.ts
  change_policy: create
- id: TARGET-FIXTURES
  component: visual-brief-conformance-inputs
  paths:
    - conformance/verification-brief/cases.json
  change_policy: create
- id: TARGET-EXISTING-TESTS
  component: existing-review-compatibility
  paths:
    - test/unit/review.test.ts
    - test/integration/cli.test.ts
  change_policy: modify
- id: TARGET-RFC
  component: reviewed-presentation-semantics
  paths:
    - rfcs/0015-visual-verification-brief.md
  change_policy: create
- id: TARGET-DOCS
  component: feature-usage-and-limitations
  paths:
    - docs/visual-verification-brief.md
  change_policy: create
- id: TARGET-CURRENT-DOCS
  component: command-discovery-and-release-notes
  paths:
    - docs/cli-reference.md
    - README.md
    - CHANGELOG.md
  change_policy: modify
- id: TARGET-ACTION
  component: generated-cli-bundle-consistency
  paths:
    - action/cli.mjs
  change_policy: modify
- id: TARGET-CLOSE
  component: exact-contract-lifecycle-close
  paths:
    - docs/engineering-specs/ES-visual-verification-brief.engineering-spec.md
  change_policy: modify
```

## Proposed design and acceptance criteria

### Interface and data flow

Add `review --format html`, with an optional repeatable `--evidence <path>` input for HTML only. Preserve existing review inputs, trusted configuration, selectors, complete-state evaluation, and enforcement exit codes. Reject evidence options with other formats instead of silently ignoring them. Emit HTML to stdout; documentation redirects it outside the evaluated Git worktree. Do not add an output writer, server, browser launcher, or automatic publication.

Build one review using the existing `buildReview`/`workflowStatus` pipeline. Derive a versioned presentation model named `engineering-spec-verification-brief`, version `0.1`, from that review and the applicable trusted-base contracts. Do not route again with a smaller candidate set. Reuse existing review data where possible; any additional projection fields must be additive and leave existing meanings intact. RFC 0015 must document the model, trust boundaries, CLI compatibility, and conformance cases before dependent runtime implementation.

The model identifies the base SHA, head SHA, complete-state change digest, evaluation scope, authorization result, enforcement mode/outcome, classification, diagnostics, and original next action. Each displayed contract includes its repository-relative source path, ID, revision, and semantic digest. Preserve exact identifiers, paths, policy terms, and evidence state names.

### Review experience

The page has a summary, changed-path table, obligation-to-verifier relationship view, evidence checklist, diagnostics, and provenance panel. Include search and filters for routing and evidence state, collapsible details, light/dark themes, and print styling. Use short active sentences and consistent terms without claiming ASD-STE100 compliance. Do not introduce model-generated interpretations, external services, or API keys.

Render every routing decision, including selected, standing, exempt, ungoverned, protected unauthorized, denied, ambiguous, and uncovered. Distinguish authorization from advisory enforcement success, contract-only governance, and no changed paths. Partial checks (staged, no-worktree, or explicit path inputs) must be visibly marked as partial; they must not imply coverage of omitted work.

Show actual relationship edges from target applicability and verifier `proves` declarations. Preserve contract identity when constraint or verifier IDs repeat in different contracts. Include contract-wide constraints, constraints without verifiers, and verifiers proving multiple constraints. Where denied or ambiguous paths have no applicable approved obligation projection, show that limitation and the original claims rather than inventing coverage. A declared coverage result is never a test-pass count or correctness score.

### Evidence handling

Use the existing evidence envelope and `readEvidenceFile` binding validation. Each supplied envelope binds to the same evaluated base SHA, contract ID/revision/semantic digest, change digest, and declared verifier IDs. Handle multiple contracts using separate envelopes, never by globally matching verifier IDs. Evidence may address any declared verifier of a selected contract; only relevant obligations appear in the brief. Reject duplicate contract envelopes and duplicate verifier entries rather than silently choosing a result. Unreadable, oversized, malformed, stale, undeclared, or mismatched inputs fail closed with a clear diagnostic and nonzero exit.

Keep the existing states `declared`, `mapped`, `attempted`, `passed`, `failed`, `rejected`, and `not_run`. A declaration alone is displayed as declared with no evidence supplied. Missing evidence is not a failed check. Display supplied states as reported assertions: matching bindings are not signatures, authenticity checks, artifact-content verification, or proof that a verifier ran. No evidence state changes scope authorization or grants approval. Never fetch, open, hash, execute, or embed a supplied artifact; show its locator/digest as escaped inert text. Do not expose runner argv, environment, or command payloads.

### Offline and safe presentation

Generate a standalone HTML file with all required CSS and script embedded and no network dependencies, telemetry, remote fonts, or external images. All core report content must be readable without JavaScript. Enhancements must work with keyboard navigation and preserve visible status text without relying on color. Support narrow screens, long paths, large reports, and reduced-motion preferences; diagrams need equivalent text relationships.

Treat repository and evidence text as untrusted. Escape HTML and JSON/script boundaries, neutralize display control characters, use safe DOM text operations, and prohibit executable URLs, dynamic code evaluation, and event-handler injection. Include a restrictive content security policy permitting only the generated inline assets by hash, with connections and external resources disabled. Do not turn repository paths or evidence artifact locators into active external links. The brief can contain private paths and constraint text; document that sharing requires review, with no automatic upload.

## Constraints

```engineering-constraints
- id: CON-AUTHORITY
  level: must
  statement: The brief must project the existing trusted-base repository-wide review without changing routing, selection, governance, enforcement, permissions, or lifecycle semantics; workspace content, renderer state, and supplied evidence grant no authority.
  applies_to: [TARGET-MODEL, TARGET-INTEGRATION, TARGET-RENDERER]
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-PROVENANCE
  level: must
  statement: Preserve base and change identity, contract revision and semantic digest, evaluation completeness, every route decision, classification, diagnostics, and next action; advisory success and partial evaluation must not imply authorization or complete verification.
  applies_to: [TARGET-MODEL, TARGET-INTEGRATION, TARGET-RENDERER, TARGET-SCHEMA]
  enforcement: { kind: test, verifier_ref: VER-CONFORMANCE }
- id: CON-RELATIONSHIPS
  level: must
  statement: The obligation view must derive edges from trusted declarations, namespace IDs by contract, preserve missing-verifier and multi-proof relationships, and never infer correctness or impact from visual coverage.
  applies_to: [TARGET-MODEL, TARGET-RENDERER]
  enforcement: { kind: test, verifier_ref: VER-PROJECTION }
- id: CON-EVIDENCE
  level: must
  statement: Validate supplied evidence against exact checked authority and change identity with the existing reader, reject duplicates and invalid input, preserve evidence states, and label reported passes as supplied assertions rather than independently verified execution.
  applies_to: [TARGET-MODEL, TARGET-INTEGRATION, TARGET-RENDERER]
  enforcement: { kind: test, verifier_ref: VER-EVIDENCE }
- id: CON-INERT
  level: must_not
  statement: The feature must not execute specification runners or trusted verifiers, resolve evidence artifacts, read artifact contents, fetch references, invoke a model, send telemetry, launch a browser, mutate contracts, or publish a brief.
  applies_to: [TARGET-MODEL, TARGET-INTEGRATION, TARGET-RENDERER]
  enforcement: { kind: test, verifier_ref: VER-SECURITY }
- id: CON-RENDER-SAFETY
  level: must
  statement: Escape all untrusted content and script boundaries, neutralize unsafe display controls, omit runner payloads, prohibit active artifact URLs, and apply a restrictive hash-based content security policy with no external resources or dynamic code evaluation.
  applies_to: [TARGET-RENDERER, TARGET-MODEL]
  enforcement: { kind: test, verifier_ref: VER-SECURITY }
- id: CON-USABILITY
  level: must
  statement: The standalone brief must expose readable content without JavaScript, accessible keyboard filters, textual relationship equivalents, light and dark themes, print and narrow-screen layouts, and status labels that do not depend on color; wording must distinguish scope authorization from verification and avoid compliance or productivity claims.
  applies_to: [TARGET-RENDERER, TARGET-DOCS, TARGET-CURRENT-DOCS]
  enforcement: { kind: review, reviewer_role: product-accessibility-maintainer }
- id: CON-COMPATIBILITY
  level: must
  statement: Existing text, JSON, Markdown, GitHub output, review selectors and exit behavior must remain compatible; the new HTML model must be schema-versioned and deterministic for identical inputs, with no nondeterministic generation time or random identity.
  applies_to: [TARGET-MODEL, TARGET-INTEGRATION, TARGET-SCHEMA, TARGET-EXISTING-TESTS]
  enforcement: { kind: test, verifier_ref: VER-CLI }
- id: CON-RFC
  level: must
  statement: RFC 0015 must document the presentation and evidence semantics before dependent runtime changes, with matching conformance cases for no changes, governance, complete and partial checks, all routing outcomes, advisory enforcement, evidence bindings, and renderer injection boundaries.
  applies_to: [TARGET-RFC, TARGET-FIXTURES, TARGET-TESTS, TARGET-SCHEMA]
  enforcement: { kind: review, reviewer_role: standards-maintainer }
- id: CON-BOUNDED-SCOPE
  level: must_not
  statement: This feature must not change core format 0.1, repository configuration, existing evidence or receipt schemas, dependency or package versions, Action inputs or enforcement behavior, trusted verifier execution, CI workflows, adoption generation, the public website, or model-specific integrations; it must not add video, audio, hosted services, cryptographic attestation, inferred architecture, or telemetry.
  applies_to: [TARGET-MODEL, TARGET-RENDERER, TARGET-INTEGRATION, TARGET-SCHEMA, TARGET-DOCS, TARGET-CURRENT-DOCS, TARGET-ACTION]
  enforcement: { kind: review, reviewer_role: security-maintainer }
- id: CON-BUNDLE
  level: must
  statement: The committed Action bundle may change only as deterministic regeneration of the reviewed CLI source and must pass the existing bundle consistency check without changing Action authorization or execution policy.
  applies_to: [TARGET-ACTION]
  enforcement: { kind: test, verifier_ref: VER-REPOSITORY }
- id: CON-CLOSE
  level: must
  statement: Only the exact approved-to-implemented lifecycle transition may accompany verified implementation; this proposed workspace contract grants no permission and must not be approved or widened and spent in the same change.
  applies_to: [TARGET-CLOSE]
  enforcement: { kind: review, reviewer_role: repository-maintainer }
```

## Verification

```engineering-verification
- id: VER-PROJECTION
  kind: test
  proves: [CON-RELATIONSHIPS]
  runner: { type: reference, reference: Deterministic projection unit tests with multi-contract repeated IDs and missing and shared proof edges }
- id: VER-EVIDENCE
  kind: test
  proves: [CON-EVIDENCE]
  runner: { type: reference, reference: Bound evidence tests for all states and stale or mismatched authority or change identity plus duplicates and malformed or oversized input }
- id: VER-SECURITY
  kind: security
  proves: [CON-INERT, CON-RENDER-SAFETY]
  runner: { type: reference, reference: Injection and inert-runner tests covering HTML and script closing tags and controls and artifact URLs and offline CSP }
- id: VER-CONFORMANCE
  kind: test
  proves: [CON-AUTHORITY, CON-PROVENANCE]
  runner: { type: reference, reference: Schema-validated conformance cases retaining routing outcomes and incomplete-evaluation labels without changing authority }
- id: VER-CLI
  kind: test
  proves: [CON-COMPATIBILITY]
  runner: { type: reference, reference: Compiled CLI integration tests comparing HTML and existing review decisions and exits with repeatable evidence input }
- id: VER-REPOSITORY
  kind: test
  proves: [CON-BUNDLE]
  runner: { type: reference, reference: Separately trusted lint and typecheck and complete tests and conformance and build and package-content and generated Action checks plus complete-working-state authority check }
- id: VER-ACCESSIBILITY
  kind: human_review
  proves: [CON-USABILITY]
  runner: { type: manual, reference: Browser review of no-JavaScript content and keyboard interaction and narrow layouts and themes and print with representative long and large reports }
- id: VER-STANDARDS
  kind: human_review
  proves: [CON-RFC]
  runner: { type: manual, reference: Maintainer review of RFC 0015 and its matching conformance inventory before dependent runtime implementation }
- id: VER-BOUNDARY
  kind: human_review
  proves: [CON-BOUNDED-SCOPE, CON-CLOSE]
  runner: { type: manual, reference: Security and repository maintainer review of additive presentation-only scope and exact lifecycle close }
```

## Rollout

```engineering-rollout
strategy: manual
steps:
  - Review and merge this contract-only proposal with status approved before runtime implementation.
  - Run next and work for ES-visual-verification-brief from the updated trusted base and stop if implementation is blocked.
  - Write and review RFC 0015 and the conformance inventory before dependent runtime changes.
  - Implement the versioned projection and evidence binding and then the standalone renderer and additive CLI integration.
  - Run separately trusted checks and compiled CLI scenarios and browser accessibility and injection review.
  - Generate all sample briefs outside the evaluated worktree and review their content before sharing.
  - Regenerate the Action bundle and verify consistency and complete-working-state routing before the exact lifecycle close.
rollback:
  actions:
    - Revert the additive HTML integration and feature files if review exposes incorrect or unsafe explanations.
    - Preserve all prior authorization and evidence semantics and existing review formats.
  owner: EngineeringSpec maintainers
```

## Follow-up evaluation

After shipping, compare existing text review with the visual brief using fresh-user tasks that ask participants to identify allowed and blocked paths, relevant constraints, and missing evidence. Record accuracy, time, and confusion without telemetry or inferred success. Choose later export or narration work from those observations; no user-comprehension improvement is claimed by this proposal.
