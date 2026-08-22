---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-ONBOARDING-FRICTION-COLLAPSE
title: Collapse onboarding friction for EngineeringSpec
status: proposed
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
---

# Collapse onboarding friction for EngineeringSpec

Make the shortest safe EngineeringSpec journey the dominant first-user and coding-agent experience without changing authority, enforcement, lifecycle, format, or runtime behavior. The Phase-0 usability hypothesis is that a fresh developer can explain the product in one sentence, preview and apply adoption, create one bounded draft authority proposal, understand why implementation waits for reviewed authority, and understand the normal `next -> work -> finish` loop within 15 minutes, excluding human pull-request review latency. This proposal does not claim that the hypothesis has already been proven and grants no implementation authority.

## Source intent

```engineering-source-refs
- id: SRC-TRUSTED-MAIN
  type: other
  ref: 48316158a8c58ac22e13f9d5223c03311b5efff0
  title: Trusted main after RC16 publication lifecycle closure
- id: SRC-README
  type: document
  path: README.md
  title: Current repository introduction and quick start
- id: SRC-GETTING-STARTED
  type: document
  path: docs/getting-started.md
  title: Current first-adoption guide
- id: SRC-FIRST-CHANGE
  type: document
  path: docs/first-change-tutorial.md
  title: Current dark-mode first-change tutorial
- id: SRC-HOMEPAGE
  type: document
  path: site/index.html
  title: Current public homepage and quick-start example
- id: SRC-AGENT-SKILL
  type: document
  path: skills/engineering-spec/SKILL.md
  title: Current optional portable agent guidance
- id: SRC-DEMO
  type: document
  path: examples/demo/README.md
  title: Current local fail-closed demonstration guide
- id: SRC-AGENT-INSTRUCTIONS
  type: document
  path: AGENTS.md
  title: Repository-owned EngineeringSpec workflow guidance
- id: SRC-PRODUCTION-GATE
  type: document
  path: docs/production-gate.md
  title: Existing required-check and immutable-Action production guidance
- id: SRC-RC16-PUBLICATION
  type: document
  path: docs/engineering-specs/ES-RC16-PUBLICATION.engineering-spec.md
  title: Implemented RC16 publication authority and evidence boundary
```

## Target surfaces

```engineering-targets
- id: TARGET-POSITIONING
  component: first-impression-value-and-current-release-guidance
  paths:
    - README.md
    - site/index.html
  change_policy: modify
- id: TARGET-FIRST-USER-GUIDES
  component: advisory-first-adoption-and-first-governed-change
  paths:
    - docs/getting-started.md
    - docs/first-change-tutorial.md
  change_policy: modify
- id: TARGET-AGENT-SKILL
  component: optional-progressively-disclosed-agent-guidance
  paths:
    - skills/engineering-spec/SKILL.md
  change_policy: modify
- id: TARGET-DEMO-GUIDE
  component: three-minute-fail-closed-demonstration
  paths:
    - examples/demo/README.md
  change_policy: modify
- id: TARGET-CONTRACT
  component: onboarding-friction-authority-lifecycle
  paths:
    - docs/engineering-specs/ES-ONBOARDING-FRICTION-COLLAPSE.engineering-spec.md
  change_policy: modify
```

The inventory is intentionally narrow. `README.md` and `site/index.html` own the first public value proposition, visual mental model, current install path, and links into deeper material. `docs/getting-started.md` owns the first 15-minute advisory journey. `docs/first-change-tutorial.md` owns the concrete grant-versus-spend lesson. `skills/engineering-spec/SKILL.md` is optional packaging and discovery for agents, not an authority engine. `examples/demo/README.md` is the durable entry point for the existing temporary-repository fail-closed demonstration; the existing demo script already exercises denial followed by separately committed authority and remains read-only under this contract.

`AGENTS.md`, `docs/production-gate.md`, `docs/agent-integration.md`, `docs/cli-reference.md`, `docs/troubleshooting.md`, `SPEC.md`, `scripts/demo.mjs`, all CLI and routing source, schemas, packages, the Action, workflows, generated catalogue content, consumers, and Agent Control Plane repositories remain outside writable scope.

## Decisions

```engineering-decisions
- id: DEC-DOCS-ONLY-PHASE-ZERO
  title: Treat Phase 0 as documentation and productization work
  rationale: Current trusted RC16 already provides the composed workflow and fail-closed authority engine. The observed first-use friction is hierarchy, sequencing, positioning, and stale publication wording, so runtime, format, package, schema, Action, workflow, and release changes are unnecessary.
- id: DEC-AUTHORITY-FIRST-POSITIONING
  title: Lead with reviewed change authority
  rationale: The durable differentiator is that approved trusted-base contracts define what a change may do and the actual Git diff is independently evaluated against that authority. This is more precise than presenting the product mainly as a shared contract or a list of CLI primitives.
- id: DEC-SHORT-NORMAL-LOOP
  title: Make next, work, and finish the dominant agent loop
  rationale: The CLI already composes lower-level deterministic operations. Newcomers and coding agents should learn the short normal path first while advanced inspection, debugging, CI, and historical commands remain available through progressive disclosure.
- id: DEC-ADVISORY-THEN-PRODUCTION
  title: Separate first-use learning from production enforcement
  rationale: A newcomer may first preview adoption and understand one governed change in advisory mode. Production assurance still requires a required EngineeringSpec check, maintainer ownership of contracts, an immutable Action SHA, and a trusted base.
- id: DEC-MEASURE-HYPOTHESIS
  title: Measure onboarding rather than claiming success
  rationale: The 15-minute objective is a Phase-0 usability hypothesis. A lightweight manual or local/private study across 5 to 10 fresh users or repositories should identify comprehension, setup, authority-amendment, and false-block friction without telemetry or repository-data upload.
```

## Constraints

```engineering-constraints
- id: CON-POSITIONING
  level: must
  statement: Current-facing positioning must lead with "Change authority for AI coding agents" or an equally precise formulation, explain that maintainers review what an agent may change before code is written and the final Git diff is independently evaluated against approved trusted-base authority, and avoid claims that EngineeringSpec prevents local writes or guarantees correct code.
  applies_to: [TARGET-POSITIONING, TARGET-FIRST-USER-GUIDES, TARGET-AGENT-SKILL]
  enforcement: { kind: review, reviewer_role: product-documentation-maintainer }
- id: CON-COMPARISON
  level: must
  statement: "Any comparison with Git or agent platforms must remain factual: Git records what changed, agent platforms may record what an agent did, and EngineeringSpec records reviewed change authority and evaluates whether the resulting diff stayed inside it; the guidance must not disparage or misrepresent adjacent tools."
  applies_to: [TARGET-POSITIONING, TARGET-FIRST-USER-GUIDES]
  enforcement: { kind: review, reviewer_role: product-documentation-maintainer }
- id: CON-FIRST-TIME-MENTAL-MODEL
  level: must
  statement: The primary onboarding path must teach adopt, bounded prospective authority proposal, human review and trusted-base approval, next, work, coding within returned writable surfaces, repository-owned checks, finish, implementation pull request, and the exact monotonic close as one visual or equivalently scannable intent-to-authority-to-diff-to-verification flow.
  applies_to: [TARGET-POSITIONING, TARGET-FIRST-USER-GUIDES]
  enforcement: { kind: review, reviewer_role: product-documentation-maintainer }
- id: CON-README-HIERARCHY
  level: must
  statement: README content above the fold must focus on what EngineeringSpec is, why reviewed authority exists, one short mental model, one current install or adoption command, the next-to-work-to-finish loop, and links to Getting Started, production enforcement, and advanced CLI or reference material; a dense inventory of advanced commands must not dominate first use.
  applies_to: [TARGET-POSITIONING]
  enforcement: { kind: review, reviewer_role: product-documentation-maintainer }
- id: CON-GETTING-STARTED-FLOW
  level: must
  statement: The primary Getting Started flow must end after preview adoption, apply adoption, propose one small explicit-path change, open and merge the reviewed authority pull request, run next, run work, code, run finish, and open the implementation pull request; doctor, status, production enforcement, diagnostics, and lower-level commands must be secondary links unless needed to resolve failure.
  applies_to: [TARGET-FIRST-USER-GUIDES]
  enforcement: { kind: review, reviewer_role: product-documentation-maintainer }
- id: CON-GRANT-BEFORE-SPEND
  level: must
  statement: The first-change tutorial must optimize the dark-mode-style example for grant versus spend, use prospective explicit paths for the clean new change, show PR 1 as reviewed authority and PR 2 as implementation plus the exact approved-to-implemented close, state that no third closure pull request is normally needed, and retain --from-diff only as advanced import-existing-work guidance.
  applies_to: [TARGET-FIRST-USER-GUIDES]
  enforcement: { kind: review, reviewer_role: security-maintainer }
- id: CON-AGENT-LOOP
  level: must
  statement: Primary agent guidance must say to run next, stop unless permission is implementation, run work for the named contract, edit only returned writable surfaces while allowing broader repository reading for correctness, run separately trusted repository checks, run finish, and never infer, widen, approve, or manufacture authority.
  applies_to: [TARGET-AGENT-SKILL, TARGET-FIRST-USER-GUIDES, TARGET-POSITIONING]
  enforcement: { kind: review, reviewer_role: security-maintainer }
- id: CON-SKILL-BOUNDARY
  level: must
  statement: The Skill must remain optional integration and discovery over repository instructions and the CLI, make the short normal loop dominant, and must not reproduce routing or authorization logic, grant authority, claim enforcement, or become a second authorization path.
  applies_to: [TARGET-AGENT-SKILL]
  enforcement: { kind: review, reviewer_role: security-maintainer }
- id: CON-PROGRESSIVE-DISCLOSURE
  level: must
  statement: prepare, select, review, check, context, explain, coverage, gate, normalize, catalogue, transition, replay, and benchmark must remain supported and discoverable under advanced CLI, CI or enforcement, debugging, historical inspection, or reference concepts, but must not dominate the first-user path; useful technical material moved from an introductory surface must retain a sensible durable home or link.
  applies_to: [TARGET-POSITIONING, TARGET-FIRST-USER-GUIDES, TARGET-AGENT-SKILL]
  enforcement: { kind: review, reviewer_role: product-documentation-maintainer }
- id: CON-ADVISORY-PRODUCTION-BOUNDARY
  level: must
  statement: First-use guidance must distinguish TRY as adoption preview, advisory understanding, and a first governed change from PRODUCTION as a required EngineeringSpec check plus contract-directory maintainer ownership, immutable Action SHA, and trusted base; it must not imply advisory mode provides merge-blocking assurance or weaken existing production enforcement guidance.
  applies_to: [TARGET-POSITIONING, TARGET-FIRST-USER-GUIDES]
  enforcement: { kind: review, reviewer_role: security-maintainer }
- id: CON-DEMO-STORY
  level: must
  statement: The demo guide must present a roughly three-minute fail-closed story in which approved authority covers src/settings, an intended settings change is allowed, an additional src/auth change fails closed, authority is not edited and spent in the same implementation pull request, and the implementation succeeds only after separately reviewed authority exists; it must remain a differentiator demonstration rather than a complete CLI tutorial.
  applies_to: [TARGET-DEMO-GUIDE]
  enforcement: { kind: review, reviewer_role: product-documentation-maintainer }
- id: CON-RC16-CURRENT
  level: must
  statement: Current-facing guidance in scope must treat @engineeringspec/cli@0.1.0-rc.16 and v0.1.0-rc.16 as published, use the exact RC16 package where shown, preserve npm latest at RC15 as a registry fact when relevant, and remove stale claims that RC16 publication or exact npx availability is pending.
  applies_to: [TARGET-POSITIONING, TARGET-FIRST-USER-GUIDES, TARGET-AGENT-SKILL]
  enforcement: { kind: test, verifier_ref: VER-STATIC-GUIDANCE }
- id: CON-SECURITY-INVARIANTS
  level: must
  statement: Guidance must preserve that authority comes only from approved trusted-base contracts, workspace drafts grant no implementation authority, a change cannot widen and spend its own authority in the same pull request, uncovered and ambiguous paths fail closed, denial overrides allowance, only the exact monotonic close may accompany implementation, runners remain inert, Git remains the authority source, production Action usage remains immutable-SHA-pinned, and historical replay grants no current authority.
  applies_to: [TARGET-POSITIONING, TARGET-FIRST-USER-GUIDES, TARGET-AGENT-SKILL, TARGET-DEMO-GUIDE]
  enforcement: { kind: review, reviewer_role: security-maintainer }
- id: CON-ACCURATE-LIMITATIONS
  level: must
  statement: Current guidance must keep factual answers discoverable that EngineeringSpec is not an agent sandbox, IDE, model router, filesystem containment system, generic verifier execution engine, or AST-level policy engine; declared runners are inert, interface_only is path-level rather than AST or API enforcement, agents cannot approve workspace drafts, two pull requests enforce grant before spend, broad globs require human authority-quality review, and Skills are optional.
  applies_to: [TARGET-POSITIONING, TARGET-FIRST-USER-GUIDES, TARGET-AGENT-SKILL]
  enforcement: { kind: review, reviewer_role: security-maintainer }
- id: CON-USABILITY-HYPOTHESIS
  level: must
  statement: The implementation must present the 15-minute first-use objective as an unproven Phase-0 hypothesis excluding human pull-request review latency, not as measured product performance or a guarantee.
  applies_to: [TARGET-POSITIONING, TARGET-FIRST-USER-GUIDES]
  enforcement: { kind: review, reviewer_role: product-documentation-maintainer }
- id: CON-USABILITY-PLAN
  level: must
  statement: The guidance must define a lightweight validation plan for 5 to 10 fresh users or repositories measuring time to understand the one-line value, adoption dry-run, successful scaffold, documents opened, commands and setup errors, grant-versus-spend explanation, first draft authority, amendment rate, false-block or confusion points, and first implementation-ready state after approval; measurement must be manual or local/private with no telemetry or repository source or spec upload.
  applies_to: [TARGET-FIRST-USER-GUIDES]
  enforcement: { kind: review, reviewer_role: product-documentation-maintainer }
- id: CON-DOCUMENTATION-ONLY
  level: must_not
  statement: This authority must not add CLI commands, change runtime, routing, replay, lifecycle states, approval behavior, verifier execution, format, schema, package or lock identity, Action or Action pin, workflow, generated catalogue, stable release status, RC17 features, MCP, TUI, IDE plugin, hosted service, signed receipts, consumer state, or Agent Control Plane state; inability to meet the measured goal through documentation requires a separate reviewed authority decision.
  applies_to: [TARGET-POSITIONING, TARGET-FIRST-USER-GUIDES, TARGET-AGENT-SKILL, TARGET-DEMO-GUIDE, TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: security-maintainer }
- id: CON-PUBLIC-OSS-DISCIPLINE
  level: must_not
  statement: Public artifacts must not contain private prompts, conversation transcripts, private reviewer notes, internal deliberation, commercial strategy, unpublished launch tactics, or private scoring; public guidance may contain only durable technical and product facts.
  applies_to: [TARGET-POSITIONING, TARGET-FIRST-USER-GUIDES, TARGET-AGENT-SKILL, TARGET-DEMO-GUIDE, TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: repository-maintainer }
- id: CON-EXACT-CLOSE
  level: must
  statement: After implementation and separately trusted verification complete, the implementation pull request may change this exact revision only from approved to implemented without changing any other contract content; proposal and approval remain separate contract-only lifecycle changes.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: repository-maintainer }
- id: CON-RUNNERS-INERT
  level: must_not
  statement: Specification-declared runners are inert data and must not be executed merely because they appear in this contract.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: repository-maintainer }
```

## Verification

```engineering-verification
- id: VER-GUIDANCE-REVIEW
  proves: [CON-POSITIONING, CON-COMPARISON, CON-FIRST-TIME-MENTAL-MODEL, CON-README-HIERARCHY, CON-GETTING-STARTED-FLOW, CON-GRANT-BEFORE-SPEND, CON-AGENT-LOOP, CON-SKILL-BOUNDARY, CON-PROGRESSIVE-DISCLOSURE, CON-ADVISORY-PRODUCTION-BOUNDARY, CON-DEMO-STORY, CON-USABILITY-HYPOTHESIS]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer review of the first-user hierarchy, current release wording, short agent loop, demo narrative, and preserved homes for advanced material
- id: VER-SECURITY-REVIEW
  proves: [CON-SECURITY-INVARIANTS, CON-ACCURATE-LIMITATIONS, CON-DOCUMENTATION-ONLY, CON-PUBLIC-OSS-DISCIPLINE, CON-EXACT-CLOSE, CON-RUNNERS-INERT]
  kind: security
  runner:
    type: manual
    reference: Security-maintainer review that wording preserves trusted-base authority, grant before spend, fail-closed behavior, immutable production identity, inert runners, accurate limitations, and excluded surfaces
- id: VER-STATIC-GUIDANCE
  proves: [CON-RC16-CURRENT]
  kind: test
  runner:
    type: reference
    reference: Repository-owned link, current-version, stale-publication-wording, and documentation consistency checks
- id: VER-USABILITY-PLAN
  proves: [CON-USABILITY-PLAN]
  kind: human_review
  runner:
    type: manual
    reference: Review the documented 5-to-10-user or repository local/private observation plan and confirm it adds no telemetry or source/spec upload
- id: VER-REPOSITORY-CHECKS
  proves: [CON-DOCUMENTATION-ONLY, CON-EXACT-CLOSE]
  kind: test
  runner:
    type: reference
    reference: Separately trusted lint, typecheck, complete tests, conformance, build, package-content audit, npm audit, strict catalogue validation, git diff checks, and complete-working-state routing
```

## Fresh-user validation plan

After the documentation implementation is reviewed, recruit 5 to 10 people or fresh repositories that have not used EngineeringSpec. Observe or collect locally and privately, without product telemetry or repository-content upload:

- time to restate the one-line value proposition accurately;
- time to complete adoption dry-run and successful scaffold;
- documents opened, commands attempted, and CLI or setup errors before success;
- ability to explain grant versus spend and why implementation waits for trusted approval;
- time to create the first bounded draft authority;
- authority amendment rate and false-block or confusion points; and
- time from approved authority to the first implementation-ready state.

Record human review latency separately and exclude it from the 15-minute first-use hypothesis. Preserve failures and confusion rather than converting this Phase-0 plan into a success claim. Any need for runtime or format changes discovered by the study requires a new proposal and reviewed authority.

## Rollout

```engineering-rollout
strategy: manual
steps:
  - Review this proposed documentation-only authority and its exact target inventory without changing onboarding surfaces.
  - Approve and merge this exact revision in a separate lifecycle-only pull request before implementation begins.
  - Start implementation from the new trusted base and run work for ES-ONBOARDING-FRICTION-COLLAPSE before editing.
  - Reorder and clarify only the authorized current-facing documentation while preserving security invariants, advanced reference paths, immutable production guidance, and the CLI as the sole authority engine.
  - Run separately trusted repository checks, strict catalogue validation, stale-current-guidance review, complete-working-state routing, and maintainer security and product-documentation review.
  - Include only the exact approved-to-implemented close with the documentation implementation if the complete state is classified implementation_with_monotonic_close; otherwise close later through a lifecycle-only pull request.
rollback:
  actions:
    - Revert misleading documentation changes while leaving runtime, schemas, packages, Action, workflows, release identities, consumers, and Agent Control Plane untouched.
    - Restore previously accurate advanced material or links if progressive disclosure makes required technical detail undiscoverable.
    - Obtain separately reviewed authority before responding to measured friction with runtime, format, package, workflow, or integration changes.
  owner: EngineeringSpec maintainers
```

## Non-goals

New CLI commands, runtime behavior, routing or replay changes, new lifecycle states, automatic approval, agent sandboxing, verifier execution, format or schema changes, package or lock changes, Action or workflow changes, telemetry, MCP, TUI, IDE plugins, hosted SaaS, signed receipts, stable `0.1.0`, RC17 features, release or dist-tag operations, consumer updates, Agent Control Plane changes, and private launch strategy are outside this authority.
