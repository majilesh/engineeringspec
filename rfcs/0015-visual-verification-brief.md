# RFC 0015: Visual Verification Brief

- Status: Accepted for implementation
- Contract: `ES-visual-verification-brief`, revision 1
- Authority: merged approval PR #157

## Summary

Add `review --format html` as an offline explanation of an existing review decision. An optional repeatable `--evidence <path>` supplies the existing bound evidence envelope. HTML and a library-accessible model project one checked review; neither creates authority nor executes verification.

## Motivation

A scope check and a declaration of verification obligations answer different questions. Reviewers need to see both without interpreting an authorized diff as proof of correctness. Existing review reports provide routing and applicable obligations; the existing evidence reader binds reported states to immutable authority and change identity.

## Normative proposal

### Command compatibility

The new HTML format MUST use existing review options and enforce the same exit outcome as the corresponding review. Evidence MUST be accepted only for HTML; unsupported combinations MUST fail as usage errors even with quiet output. Invalid evidence MUST fail before emitting a successful HTML document. HTML is emitted to stdout with no output writer, browser launch, or upload.

### Model and provenance

The model format is `engineering-spec-verification-brief`, version `0.1`. It MUST retain base SHA, head SHA, change digest, authorization, enforcement, classification, working-state counts, declared coverage, routes and their claims, sequencing, diagnostics, authority diffs, and next action. Evaluation scope is one of `complete_working_state`, `committed_and_staged`, `committed_only`, or `explicit_paths`. Only the first has `completeWorkingState: true`; no report claims omitted changes were checked.

Contracts for selected and standing routes MUST be read from the SAME base SHA as the review, without rerouting or narrowing the approved candidate set. Contract projections contain ID, revision, source path, title, status, target IDs and policies, relevant constraints and verifiers. The evidence-binding `semanticDigest` uses the normalized full contract digest, matching the existing implementation-evidence envelope. Routing claims retain their existing lifecycle-independent semantic digests unchanged; these are distinct identities and MUST NOT be interchanged.

Relationships are derived from actual target applicability and `proves` declarations, with contract ID plus local ID as identity. Constraints without `applies_to` are contract-wide. Verifiers may prove multiple constraints; unrelated proof references MUST NOT create fabricated visible constraint nodes. Blocked paths retain their positive and negative claims. A path without a selected or standing projection has no inferred obligation coverage.

### Evidence

One file represents one existing evidence envelope. Read only bounded regular files, at most 1 MiB per envelope. The existing reader MUST validate base SHA, contract ID, revision, full normalized semantic digest, change digest, verifier identities, states, and artifact/digest requirements. Reject duplicate contract envelopes and duplicate verifier entries. Evidence is allowed for every declared verifier of a displayed contract; the view shows relevant verifiers and discloses the count of supplied entries outside that projection.

Preserve `declared`, `mapped`, `attempted`, `passed`, `failed`, `rejected`, and `not_run`. No supplied entry defaults to `declared`, with `source: declaration`; supplied entries use `source: supplied`. A supplied pass is a reported assertion. Binding validation does not authenticate an executor, verify signatures, read or hash artifact bytes, or establish correctness. Artifact locations remain inert text. Evidence never changes authorization or enforcement exit outcome.

The existing routing change digest identifies changed paths and change kinds, not file contents. A content edit that retains the same path set can retain that digest. The brief MUST disclose this limitation and MUST NOT claim evidence binds the exact implementation bytes. Content-bound attestations require a separate design and are outside this increment.

### Rendering and accessibility

Generate a deterministic standalone document with embedded styles and fixed enhancement script. Hash-based CSP allows only those embedded assets; external connections, scripts, images, objects, frames, base URLs and forms are disabled. Never interpolate repository data into executable script or dynamic HTML. Escape all HTML attributes/text, script boundaries in embedded JSON, and unsafe display controls. Keep authoritative identifiers exact in the model; sanitize only display text.

All report content is server-rendered and available without JavaScript. Enhancements provide keyboard-accessible search and route/evidence filters, visible result counts, expand/collapse, and theme controls. Print removes controls and expands details. Relationship views include equivalent text, narrow layouts wrap long identifiers, and status always includes text. Do not execute declared runners or render their payloads. No external fonts, analytics, model calls, media generation, or automatic publication.

## Compatibility

No core format, receipt, repository configuration, routing, lifecycle, or existing review-output semantic changes. Add only library exports, a new model/schema, renderer and command format. Regenerate the Action bundle using its existing script. Existing JSON review output remains unchanged.

## Security considerations

Treat every contract string, path, diagnostic and evidence note as untrusted text. A report may disclose private paths and constraints; users must review it before sharing. Generated output must be placed outside the evaluated Git worktree to avoid including itself in a subsequent change digest. No artifact locator is followed. A brief is a static observation and must be regenerated after changes.

## Alternatives

Generic model-generated summaries lose deterministic provenance. Hosted dashboards and narration add execution, credentials and privacy concerns without evidence of user value. The existing text/Markdown report remains the default.

## Conformance changes

`conformance/verification-brief/cases.json` records presentation vectors for all routing decisions, no changes, governance, each evaluation scope, and advisory enforcement. Tests additionally require exact evidence bindings, duplicate rejection, repeated IDs across contracts, every evidence state, safe script boundaries, CSP hashes, no runner payloads, and static accessibility content.

## Reference implementation impact

`src/query/verificationBrief.ts` builds and projects the versioned model. `src/cli/verificationBrief.ts` renders HTML. `review --format html` invokes these after building one ordinary review. Existing `buildReview`, routing and evidence formats retain their behavior.
