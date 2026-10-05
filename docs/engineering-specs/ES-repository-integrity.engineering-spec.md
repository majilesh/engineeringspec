---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-repository-integrity
title: Generate shared project facts and enforce repository integrity
status: approved
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
---

# Generate shared project facts and enforce repository integrity

This proposal grants no implementation authority until a reviewed contract-only change approves it on the merged trusted base. Load `engineeringspec work ES-repository-integrity` before implementation.

## Problem and dependency map

Do not manually maintain the same fact in five places when one place can generate or validate the other four.

Exploration found a clean workspace at package release 0.1.0-rc.19, no approved implementation ticket, an existing Action bundle freshness check, a site catalogue generator, and release-readiness tests tied to particular RC identities. Extend those mechanisms rather than adding a second evaluator or a new framework.

| Fact | Authority | Dependent surfaces and proposed treatment |
| --- | --- | --- |
| Package release, installation identity, Node support, repository and homepage | package.json | Validate lockfile roots; generate docs/generated/version.md, site/generated/project-state.json and action/compatibility.json; check current public installation snippets. |
| Immutable Action anchor | src/adoption/releases.ts | Validate current Action examples and generated compatibility metadata; retain reviewed historical anchors. Never derive an anchor from the current implementation commit. |
| Format semantics and security boundaries | SPEC.md | Validate schemas, constants and conformance through existing checks. Package release is independent of format version. |
| Schema structure, field enums and identifiers | schemas/engineering-spec-0.1.schema.json and schemas/profiles/ | Check consistency with SPEC.md and src/model/constants.ts; generate reference facts without changing semantics. |
| CLI commands and options | src/cli/program.ts | Derive command metadata from the built CLI command definition; statically check README, docs, website and integration examples. |
| Authority decisions | Existing core evaluator and routing modules | CLI, bundled Action, integrations and Visual Verification consume those decisions. Integrity tooling must not implement alternative authority logic. |
| Catalogue generation | scripts/generate-site.mjs | Check generated site/catalogue.json and site/explorer.html with deterministic output or explicitly isolated volatile fields. |
| Action bundle generation | scripts/build-action.mjs | Reuse check:action; metadata must distinguish bundled package version, Action runtime and reviewed anchor version. |
| Product terminology and claims | Documented glossary and positioning rules in docs/REPOSITORY_INVARIANTS.md | Mechanically flag defined forbidden or unsupported claims with explicit reviewed historical exceptions. Do not claim automated semantic proof of prose. |

Before dependent edits, inventory all current public surfaces, examples, integrations, release workflows, package contents, security guidance and historical material. Record explicit current-versus-historical rules. Historical release notes, RFCs, pilot records and approved contracts must retain their recorded identities.

## Implementation boundaries

```engineering-source-refs
- id: SRC-GUIDANCE
  type: document
  path: AGENTS.md
  title: Repository lifecycle and trusted checks
- id: SRC-STANDARD
  type: document
  path: SPEC.md
  title: Normative semantics and compatibility boundaries
- id: SRC-REQUEST
  type: other
  ref: user-request-2026-10-05-repository-consistency
  title: Repository consistency architecture and Repository Integrity CI request
```

```engineering-targets
- id: TARGET-TOOLING
  paths:
    - scripts/generate-project-state.mjs
    - scripts/check-repository-integrity.mjs
    - scripts/generate-site.mjs
    - scripts/build-action.mjs
    - engineering/repository-consistency.json
  change_policy: modify
- id: TARGET-PACKAGE
  paths: [package.json, package-lock.json]
  change_policy: modify
- id: TARGET-CI
  paths: [.github/workflows/ci.yml, .github/workflows/release.yml, .github/workflows/pages.yml]
  change_policy: modify
- id: TARGET-GENERATED
  paths:
    - docs/generated/**
    - site/generated/**
    - action/compatibility.json
    - site/catalogue.json
    - site/explorer.html
  change_policy: modify
- id: TARGET-PUBLIC
  paths:
    - README.md
    - docs/REPOSITORY_INVARIANTS.md
    - docs/cli-reference.md
    - docs/getting-started.md
    - docs/agent-integration.md
    - docs/first-change-tutorial.md
    - docs/lifecycle.md
    - docs/maintaining-specs.md
    - docs/production-gate.md
    - docs/troubleshooting.md
    - docs/upgrading.md
    - site/index.html
    - skills/engineering-spec/SKILL.md
    - integrations/**/README.md
    - CHANGELOG.md
  change_policy: modify
- id: TARGET-TESTS
  paths: [test/unit/repository-integrity.test.ts, test/unit/release-readiness.test.ts]
  change_policy: modify
- id: TARGET-CLOSURE
  paths: [docs/engineering-specs/ES-repository-integrity.engineering-spec.md]
  change_policy: modify
```

New exact paths above are intentional: the repository's modify policy permits creation. Use .mjs for repository scripts, matching the existing generators and supported Node 20 execution; the current build includes src/**/*.ts only.

```engineering-constraints
- id: CON-FACTS
  level: must
  statement: Generate shared release facts from package.json; document every authoritative source and dependent surface. Generated files must carry the notice "This file is generated. Do not edit manually." using a comment or JSON metadata field. Check mode is read-only, deterministic, and fails on missing or stale output.
  enforcement: { kind: test, verifier_ref: VER-INTEGRITY }
- id: CON-CATEGORIES
  level: must
  statement: Provide check:versions, check:docs, check:links, check:examples, check:schemas, check:conformance, check:generated, check:positioning and aggregate check:release scripts. The aggregate reports Version consistency, Specification/schema compatibility, Conformance corpus, CLI documentation, README commands, Website commands, Example contracts, GitHub Action metadata, Generated content, Terminology, Broken links, Security invariants and Public claims. Print success only after each actual check passes; accumulate failures and exit nonzero. Declare coverage and limitations for each category.
  enforcement: { kind: test, verifier_ref: VER-INTEGRITY }
- id: CON-CI
  level: must
  statement: Add one CI job displayed as Repository Integrity on every pull request, push and merge group; run the same aggregate before npm publication. Preserve existing trusted-base enforcement, audit, provenance, tag binding, credentials and permissions. Release checks must not publish or modify dist-tags.
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-INERT
  level: must_not
  statement: Do not execute commands extracted from documentation or specification runners. Only explicitly coded repository-owned checks may execute. Check examples through strict validation, not execution of their declared verifiers. CLI documentation inspection must not run documented commands or contact external services.
  enforcement: { kind: test, verifier_ref: VER-INTEGRITY }
- id: CON-SCOPE
  level: must_not
  statement: Change no normative semantics, schemas, core evaluator, parser, routing, CLI API, exit codes, integration hooks or Visual Verification decision logic. Introduce no dependencies, release bump or publication. Any semantic issue found requires a separate RFC and approved contract with matching conformance fixtures.
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-HISTORY
  level: must
  statement: Preserve historical versions, Action pins, experiments and claims with explicit narrow exceptions. Current guidance is checked against canonical facts; generated compatibility metadata distinguishes an older immutable Action anchor from the current package. Do not treat every historical RC occurrence as drift or silently refresh experimental evidence.
  enforcement: { kind: test, verifier_ref: VER-INTEGRITY }
- id: CON-LINKS
  level: must
  statement: Deterministically check local links, fragments and repository-owned public URL mappings offline. External link liveness is a separately invoked network check with explicit timeout, redirect and error handling; report it as unverified unless executed. Do not print Broken links success implying external verification when only local links were checked.
  enforcement: { kind: test, verifier_ref: VER-INTEGRITY }
- id: CON-CLAIMS
  level: must
  statement: Document authoritative positioning, glossary, security invariants, limitations and release checklist. Automated terminology and public-claim rules have stated bounded coverage; existing security tests and conformance remain required. Human review assesses prose, claims and security boundaries; regex checks must not be described as proofs of semantic or security correctness.
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-VERIFY
  level: must
  statement: Run separately trusted repository checks and the complete-working-state strict check against origin/main before closure; inspect actual changed paths. Report observed evidence, compatibility and security assessment. Close only through finish after required checks and reviews; never manufacture receipts.
  enforcement: { kind: test, verifier_ref: VER-REPOSITORY }
```

```engineering-verification
- id: VER-INTEGRITY
  kind: test
  proves: [CON-FACTS, CON-CATEGORIES, CON-INERT, CON-HISTORY, CON-LINKS]
  runner:
    type: reference
    reference: Integrity regression tests inject release drift, stale generated output, unknown CLI commands/options, invalid example contracts, schema mismatch, stale Action metadata, broken local links and forbidden claims; valid historical fixtures pass. Verify generators are idempotent, check mode writes nothing, hostile documented/spec commands remain inert and aggregate failures exit nonzero.
- id: VER-REPOSITORY
  kind: test
  proves: [CON-VERIFY]
  runner:
    type: reference
    reference: npm ci; npm run lint; npm run typecheck; npm test; npm run test:conformance; npm run build; npm run check:action; npm run package:check; npm run check:release after implementation; repository-local CLI validate docs/engineering-specs --strict and check --spec-dir docs/engineering-specs --base origin/main --strict
- id: VER-REVIEW
  kind: human_review
  proves: [CON-CI, CON-SCOPE, CON-CLAIMS]
  runner:
    type: manual
    reference: Maintainer reviews authoritative-source map, category coverage, historical exceptions, offline versus external link evidence, immutable Action compatibility, unchanged normative behavior, security boundaries and full diff.
```

## Rollout and compatibility

Merge this proposal through contract-only governance review, then approve it on the trusted base before implementation. Re-run next and work against that base. Implement additive repository maintenance tooling, generated metadata and CI checks; no public runtime API or format change is intended. Reject silent skips, unexplained exclusions and false green categories. Stop and obtain a separately approved amendment if inventory reveals required writes outside these paths.

The intended security effect is earlier detection of drift without adding execution to validation or authority evaluation. The checks do not prove software correctness, malicious-code absence, runtime safety or correctness of the reviewed contract boundary.

After independent checks and review, use finish for the exact lifecycle close. Roll back an implementation by reverting its maintenance tooling, generated surfaces and CI additions together; retain historical release records and existing enforcement.
