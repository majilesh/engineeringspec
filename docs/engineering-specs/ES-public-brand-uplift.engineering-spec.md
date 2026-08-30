---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-public-brand-uplift
title: Adopt the mark-first public identity and sharpen change-authority positioning
status: implemented
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
base_revision: "4ed6985c3d2c05e0a0e12848d46b8024a609d4e2"
---

# Adopt the mark-first public identity and sharpen change-authority positioning

Replace the legacy navy public presentation with the reviewed Forest, Cloud, Ink, Sora, and Inter identity; make the hexagonal EngineeringSpec mark the primary public face; and give the website and GitHub repository one precise explanation of the product: reviewed change authority before an AI coding agent writes code, followed by complete final-diff verification against that authority.

The positioning should address the team-scale failure mode highlighted by recent discussion of AI-assisted architectural drift: individually plausible generated changes can conflict, duplicate existing capability, or cross boundaries when reviewed only after a large diff exists. EngineeringSpec must answer the narrower authorization question it actually implements. It must not claim to analyse an entire codebase, generate architecture documentation, prevent all architectural drift, execute implementation, or prove correctness.

This proposal is contract-only. It grants no implementation, publication, or GitHub-settings authority while it remains unmerged or `proposed`.

## Source intent

```engineering-source-refs
- id: SRC-BRAND-KIT
  type: other
  ref: engineeringspec-mark-first-brand-kit-2026-08-30
  title: Reviewed mark-first EngineeringSpec brand kit and deterministic generators
- id: SRC-POSITIONING
  type: other
  ref: change-authority-positioning-review-2026-08-30
  title: Maintainer direction to adopt Change authority for AI coding agents consistently
- id: SRC-TALK
  type: other
  ref: scale-2026-beyond-vibe-coding-transcript
  title: Talk transcript on team-scale AI-assisted development and architectural inconsistency
- id: SRC-HOMEPAGE
  type: document
  ref: site/index.html
  title: Current navy EngineeringSpec homepage
- id: SRC-GUIDANCE
  type: document
  ref: README.md
  title: Current repository positioning, capability boundaries, and quick start
- id: SRC-RC17
  type: document
  ref: docs/engineering-specs/ES-rc17-launch-article.engineering-spec.md
  title: Approved RC17 editorial accuracy and evidence boundaries
```

## Target surfaces

```engineering-targets
- id: TARGET-BRAND
  component: public-brand-source-and-exports
  paths:
    - brand/**
  change_policy: modify
- id: TARGET-SITE
  component: static-public-site
  paths:
    - site/index.html
    - site/blog/**
    - site/spec/0.1/index.html
    - site/og.png
    - site/og.svg
    - site/favicon.ico
    - site/favicon-32.png
    - site/favicon-48.png
    - site/apple-touch-icon.png
    - site/manifest.webmanifest
    - site/assets/**
  change_policy: modify
- id: TARGET-EXPLORER
  component: generated-contract-explorer-presentation
  paths:
    - src/catalogue/catalogue.ts
    - test/unit/catalogue.test.ts
    - site/explorer.html
    - site/catalogue.json
  change_policy: modify
- id: TARGET-REPOSITORY
  component: github-repository-presentation
  paths:
    - README.md
    - package.json
  change_policy: modify
- id: TARGET-CONTRACT
  component: brand-uplift-contract-lifecycle
  paths:
    - docs/engineering-specs/ES-public-brand-uplift.engineering-spec.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-IDENTITY
  level: must
  statement: Public surfaces must use the reviewed mark-first identity with Forest #1E3A2F, Cloud #F4F6F4, Ink #12211B, Sora for display, Inter for body, the hexagonal mark, and the outlined EngineeringSpec wordmark; legacy navy #0B1020 and blue #72A7FF must not remain as a parallel product identity.
  applies_to: [TARGET-BRAND, TARGET-SITE, TARGET-EXPLORER, TARGET-REPOSITORY]
  enforcement: { kind: review, reviewer_role: brand-reviewer }
- id: CON-SIGNAL
  level: must
  statement: Signal Mint #62D6C2 may be used sparingly for verification cues and interaction on dark surfaces, and Signal Mint Dark #1F6F62 on light surfaces; mint must not recolor the official logo, become a second primary brand, or stand in automatically for generic success.
  applies_to: [TARGET-BRAND, TARGET-SITE, TARGET-EXPLORER]
  enforcement: { kind: review, reviewer_role: brand-reviewer }
- id: CON-MARK-FIRST
  level: must
  statement: The hexagonal mark or horizontal lockup must lead website navigation, README presentation, favicons, Open Graph assets, and repository-ready avatar and social-preview exports; the wombat and any AI lockup must not appear in default public, GitHub, favicon, or link-preview assets.
  applies_to: [TARGET-BRAND, TARGET-SITE, TARGET-REPOSITORY]
  enforcement: { kind: review, reviewer_role: brand-reviewer }
- id: CON-MASKABLE
  level: must
  statement: The maskable 512 icon must be a full-bleed opaque Forest tile with the mark inside the maskable safe region and no baked rounded rectangle; retain transparent 32 and 48 pixel favicons and treat 16 pixels only as a compatibility fallback.
  applies_to: [TARGET-BRAND, TARGET-SITE]
  enforcement: { kind: test, verifier_ref: VER-ASSETS }
- id: CON-TYPE
  level: must
  statement: Website typography must use locally served, Latin-subset WOFF2 builds of Sora and Inter with explicit system fallbacks, avoid render-blocking third-party font requests, and keep the outlined wordmark independent of font availability.
  applies_to: [TARGET-BRAND, TARGET-SITE, TARGET-EXPLORER]
  enforcement: { kind: test, verifier_ref: VER-STATIC }
- id: CON-POSITIONING
  level: must
  statement: The canonical public line must be Change authority for AI coding agents, supported by Reviewed authority before code. Final-diff verification after.; README, website metadata, hero copy, Open Graph copy, package description, and repository-ready social assets must use compatible language without competing taglines.
  applies_to: [TARGET-BRAND, TARGET-SITE, TARGET-REPOSITORY]
  enforcement: { kind: review, reviewer_role: editorial-maintainer }
- id: CON-PROBLEM
  level: must
  statement: >-
    Explain the team-scale problem in concrete engineering terms: prompts express intent, context informs implementation, and trusted checks assess results, but none independently records what an agent was allowed to change; reviewable pre-code authority should reduce the cost of discovering scope disagreements only after a large generated diff exists.
  applies_to: [TARGET-SITE, TARGET-REPOSITORY]
  enforcement: { kind: review, reviewer_role: editorial-maintainer }
- id: CON-AUTHORITY-ACCURACY
  level: must
  statement: Describe authority as an approved EngineeringSpec contract loaded from the trusted Git base, broad reading as distinct from bounded writing, scope amendments as separately reviewed authority, and final verification as complete-working-state routing against that authority; preserve runner inertness and the explore to propose to approve to implement to verify to close lifecycle.
  applies_to: [TARGET-SITE, TARGET-EXPLORER, TARGET-REPOSITORY]
  enforcement: { kind: test, verifier_ref: VER-ACCURACY }
- id: CON-NO-ARCHITECTURE-OVERCLAIM
  level: must_not
  statement: Do not claim EngineeringSpec currently analyses an entire codebase, creates a living architecture model, detects duplicate services or tables, generates feature designs, implements changes, prevents all architectural drift, verifies semantic conformance inside files, executes declared verifiers, or proves software correctness, security, quality, productivity, or safety.
  applies_to: [TARGET-BRAND, TARGET-SITE, TARGET-EXPLORER, TARGET-REPOSITORY]
  enforcement: { kind: review, reviewer_role: evidence-reviewer }
- id: CON-EVIDENCE
  level: must
  statement: Retain the public draft or release-candidate maturity, zero-observation external evidence status, and non-commercial invitation for criticism and paired external pilots; do not cite the talk's productivity claims as EngineeringSpec evidence or make adoption, conversion, Hacker News, star-growth, enterprise-readiness, or causal impact claims.
  applies_to: [TARGET-SITE, TARGET-REPOSITORY]
  enforcement: { kind: review, reviewer_role: evidence-reviewer }
- id: CON-RELEASE-IDENTITY
  level: must
  statement: Public installation commands, release links, package metadata, and capability descriptions must match the latest actually published EngineeringSpec release available on the trusted implementation base; no unreleased version may be presented as installable.
  applies_to: [TARGET-SITE, TARGET-REPOSITORY]
  enforcement: { kind: test, verifier_ref: VER-ACCURACY }
- id: CON-SITE-COHERENCE
  level: must
  statement: Homepage, blog index, existing articles, specification shell, and generated Explorer must form one responsive visual system with semantic landmarks, visible keyboard focus, reduced-motion support, readable code, and WCAG AA text and control contrast at desktop and narrow mobile widths; no existing public route or article may be dropped.
  applies_to: [TARGET-SITE, TARGET-EXPLORER]
  enforcement: { kind: test, verifier_ref: VER-STATIC }
- id: CON-EXPLORER-SAFETY
  level: must
  statement: Explorer restyling must remain a presentation-only change over the existing deterministic catalogue data and filtering behavior, preserve hostile-content escaping and runner inertness, and state that the view explains contracts but grants no authority.
  applies_to: [TARGET-EXPLORER]
  enforcement: { kind: test, verifier_ref: VER-TESTS }
- id: CON-GITHUB-HOME
  level: must
  statement: Public repository materials and links must continue to identify github.com/majilesh/engineeringspec as the project home; this increment must not imply an organisation migration, established company, commercial offering, customer base, or traction that does not exist.
  applies_to: [TARGET-BRAND, TARGET-SITE, TARGET-REPOSITORY]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-NO-PRODUCT-CHANGE
  level: must_not
  statement: This increment must not change EngineeringSpec format 0.1, schemas, parsing, validation, routing or governance decisions, PermissionTicket semantics, CLI behavior other than generated Explorer presentation, tests unrelated to that presentation, Action enforcement, workflows, dependencies, benchmark records or semantics, pilot records, release identity, or specification content.
  applies_to: [TARGET-BRAND, TARGET-SITE, TARGET-EXPLORER, TARGET-REPOSITORY, TARGET-CONTRACT]
  enforcement: { kind: test, verifier_ref: VER-ROUTING }
- id: CON-DETERMINISTIC-ASSETS
  level: must
  statement: Committed public raster and vector assets must be generated from reviewed sources, use stable dimensions and sRGB output where applicable, and reproduce byte-for-byte for non-PDF deliverables when regenerated in the documented environment.
  applies_to: [TARGET-BRAND, TARGET-SITE]
  enforcement: { kind: test, verifier_ref: VER-ASSETS }
- id: CON-CLOSE
  level: must
  statement: Merge this proposal and review an exact approved contract-only revision before any dependent brand, site, README, package, generated Explorer, or public GitHub-settings change; after implementation, separately trusted checks, brand, editorial, evidence, accessibility, and routing review must pass before the exact approved to implemented close.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: maintainer }
```

## Verification

```engineering-verification
- id: VER-STATIC
  proves: [CON-TYPE, CON-SITE-COHERENCE]
  kind: test
  runner:
    type: reference
    reference: Serve site as the document root and inspect every canonical static route at desktop and narrow mobile widths for successful responses, local font loading, metadata, semantic landmarks, keyboard focus, responsive behavior, reduced motion, readable code, contrast, and working navigation
- id: VER-ASSETS
  proves: [CON-MASKABLE, CON-DETERMINISTIC-ASSETS]
  kind: test
  runner:
    type: reference
    reference: Regenerate the reviewed brand sources twice, compare non-PDF output digests, inspect required raster dimensions, alpha behavior, maskable safe area, SVG parsing, WOFF2 validity, and Open Graph rendering, then compare committed public assets with the approved generator outputs
- id: VER-ACCURACY
  proves: [CON-AUTHORITY-ACCURACY, CON-RELEASE-IDENTITY]
  kind: test
  runner:
    type: reference
    reference: Compare all public workflow, authority, command, version, package, and capability statements with the trusted-base README, specification, RC17 release materials, CLI help, and approved contract behavior
- id: VER-TESTS
  proves: [CON-EXPLORER-SAFETY]
  kind: test
  runner:
    type: command
    argv: [npm, test]
    network: deny
  expected: { exit_code: 0 }
- id: VER-CONFORMANCE
  proves: [CON-NO-PRODUCT-CHANGE]
  kind: test
  runner:
    type: command
    argv: [npm, run, test:conformance]
    network: deny
  expected: { exit_code: 0 }
- id: VER-ROUTING
  proves: [CON-NO-PRODUCT-CHANGE]
  kind: test
  runner:
    type: reference
    reference: engineeringspec check --spec-dir docs/engineering-specs --base origin/main --strict reports implementation routing with zero violations for the complete working state
- id: VER-REVIEW
  proves: [CON-IDENTITY, CON-SIGNAL, CON-MARK-FIRST, CON-POSITIONING, CON-PROBLEM, CON-NO-ARCHITECTURE-OVERCLAIM, CON-EVIDENCE, CON-GITHUB-HOME, CON-CLOSE]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer, brand, editorial, evidence, and accessibility review of identity fidelity, claim discipline, route coherence, repository continuity, and exact lifecycle handling
```

## Rollout

```engineering-rollout
strategy: manual
steps:
  - Merge this contract-only proposal; it grants no dependent implementation authority while proposed.
  - Review and approve the exact targets, copy boundaries, asset source, and verification plan in a separate contract-only change on the trusted base.
  - Load the approved base-pinned work brief, replace the in-repository public brand assets, and update the README, package description, static site, existing article shells, specification shell, and generated Explorer presentation without changing their substantive behavior.
  - Regenerate and inspect all public outputs, run repository checks separately from specification-declared verifiers, and perform complete-working-state routing before review.
  - After the implementation lands, keep the project under majilesh and manually apply the approved mark avatar and GitHub social-preview asset in repository settings; do not use the wombat as the repository face.
  - Confirm the GitHub Pages deployment and live metadata before announcing the rebrand or reporting production availability, then close the contract only through the exact monotonic lifecycle transition.
rollback:
  actions:
    - Revert the public presentation through the normal reviewed Git workflow if identity, accessibility, accuracy, asset, routing, or deployment verification fails.
    - Restore the previous repository avatar and social preview through GitHub settings if the new exports render incorrectly, without changing repository ownership or product behavior.
  owner: EngineeringSpec maintainers
```

## Non-goals

This proposal does not migrate the project away from `majilesh`, create a company or GitHub organisation, publish to Hacker News, claim traction, add a mascot-led identity, add a hosted control plane, implement architecture analysis, generate architecture documentation, add model calls, change the EngineeringSpec format or runtime, collect evidence, release a package, or authorize dependent implementation from this workspace proposal.
