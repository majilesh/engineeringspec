---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-rc17-launch-article
title: Publish the RC17 change-authority launch article
status: proposed
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
base_revision: "9caf291bf9fb3343e0875c6c3832a10fb8c9573f"
---

# Publish the RC17 change-authority launch article

Add an engineering-led launch essay explaining the missing authority primitive for coding agents, the compact RC17 workflow, and the external evidence still required. Extend the existing static EngineeringSpec blog without duplicating its first article, widening product scope, or making unsupported claims.

This proposal grants no implementation or publication authority while `proposed`.

## Source intent

```engineering-source-refs
- id: SRC-BRIEF
  type: other
  ref: rc17-launch-article-brief-2026-08-29
  title: Maintainer brief for an engineering-led RC17 launch article and future Show HN landing page
- id: SRC-EXISTING-ARTICLE
  type: document
  ref: site/blog/change-authority-agentic-sdlc/index.html
  title: Existing change-authority article whose broad thesis must not be duplicated
- id: SRC-BLOG-INDEX
  type: document
  ref: site/blog/index.html
  title: Existing static blog index, metadata, navigation, and visual language
- id: SRC-RFC-0012
  type: document
  ref: rfcs/0012-compact-agent-ticket.md
  title: Compact agent PermissionTicket design and authority invariants
- id: SRC-RC17-NOTES
  type: document
  ref: CHANGELOG.md
  title: RC17 compact-ticket release notes
- id: SRC-RC17-RELEASE
  type: document
  ref: https://github.com/majilesh/engineeringspec/releases/tag/v0.1.0-rc.17
  title: Public EngineeringSpec 0.1.0-rc.17 prerelease
- id: SRC-RC17-NPM
  type: document
  ref: https://www.npmjs.com/package/@engineeringspec/cli/v/0.1.0-rc.17
  title: Public exact RC17 npm package
- id: SRC-GUIDANCE
  type: document
  ref: README.md
  title: Current grant-before-spend workflow and safety boundaries
- id: SRC-BENCHMARK
  type: document
  ref: benchmarks/README.md
  title: Existing paired agent-impact benchmark and evidence limitations
```

## Target surfaces

```engineering-targets
- id: TARGET-ARTICLE
  component: rc17-launch-article
  paths:
    - site/blog/give-coding-agents-permission-not-just-prompts/index.html
  change_policy: create
- id: TARGET-BLOG-INDEX
  component: blog-index-entry
  paths:
    - site/blog/index.html
  change_policy: modify
- id: TARGET-CONTRACT
  component: launch-article-contract-lifecycle
  paths:
    - docs/engineering-specs/ES-rc17-launch-article.engineering-spec.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-STATIC-PATTERN
  level: must
  statement: Implement the article as dependency-free static HTML and CSS by extending the existing blog pattern; preserve its visual language, navigation, typography, long-form structure, responsive behavior, visible focus, semantic landmarks, heading hierarchy, contrast, and reduced-motion behavior without adding a framework, dependency, analytics, telemetry, persistence, or external runtime requirement.
  applies_to: [TARGET-ARTICLE, TARGET-BLOG-INDEX]
  enforcement: { kind: test, verifier_ref: VER-STATIC }
- id: CON-IDENTITY
  level: must
  statement: Publish at /blog/give-coding-agents-permission-not-just-prompts/ with the visible title Give Coding Agents Permission, Not Just Prompts and a subtitle accurately describing reviewed Git history as bounded change authority consumed before coding and verified afterward; the article must remain editorially distinct from the existing broad agentic-SDLC article.
  applies_to: [TARGET-ARTICLE, TARGET-BLOG-INDEX]
  enforcement: { kind: review, reviewer_role: editorial-maintainer }
- id: CON-PROBLEM-FIRST
  level: must
  statement: Lead with the engineering problem rather than the release announcement and make the distinction central that context answers what the agent knows, validation answers whether the resulting change worked, and authority answers what the agent was allowed to change; explain that technically correct, test-passing code may still exceed approved scope.
  applies_to: [TARGET-ARTICLE]
  enforcement: { kind: review, reviewer_role: editorial-maintainer }
- id: CON-CONTRACT-MODEL
  level: must
  statement: Explain a versioned engineering change contract, immutable reviewed-base authority, broad repository reading for correctness, bounded writing, separately reviewed scope amendments, and the explore to propose to approve to implement to verify to close control loop without implying that prompts, workspace contracts, successful analysis, tests, or classification grant authority.
  applies_to: [TARGET-ARTICLE]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-RC17-WORKFLOW
  level: must
  statement: Show the concise next, work ES-session-refresh, implementation, and finish workflow; use only fields and semantics confirmed by RC17 for compact next and work PermissionTickets; identify exact trusted base, approved contract and revision, policy-bearing writable and protected paths, constraints, verifier identities, technical contracts, and stop conditions without exposing runner payloads or inventing JSON structure.
  applies_to: [TARGET-ARTICLE]
  enforcement: { kind: test, verifier_ref: VER-ACCURACY }
- id: CON-INDEPENDENT-FACTS
  level: must
  statement: State explicitly that permission and currentChangeClassification are independent; before edits, implementation permission may coexist with classification none because permission comes from reviewed trusted-base authority while classification describes the diff that currently exists and never grants or widens authority.
  applies_to: [TARGET-ARTICLE]
  enforcement: { kind: test, verifier_ref: VER-ACCURACY }
- id: CON-SCOPE-EXAMPLE
  level: must
  statement: Use a fictional session-refresh example whose approved writable paths are src/auth/session/** and test/auth/session/** and whose middleware, database, and infrastructure paths remain outside authority; if wider writes become necessary, require the agent to stop, explain the blocker, obtain and merge a separately reviewed authority amendment, and continue from the new trusted base.
  applies_to: [TARGET-ARTICLE]
  enforcement: { kind: review, reviewer_role: editorial-maintainer }
- id: CON-VERIFY-BOUNDARY
  level: must
  statement: Explain that finish and repository checks evaluate the complete Git state against approved authority and can identify selected, denied, uncovered, or ambiguous paths, contract-only governance, and implementation with exact monotonic close; do not imply that EngineeringSpec executes declared runners or proves software correctness, security, productivity, or acceptable implementation quality.
  applies_to: [TARGET-ARTICLE]
  enforcement: { kind: test, verifier_ref: VER-ACCURACY }
- id: CON-RC17-DELTA
  level: must
  statement: Keep the RC17 section brief and accurate by covering compact next and work defaults, verbose compatibility, executable blocker recovery, separate permission and current-change classification, aligned agent guidance, and unchanged trusted-base authority, routing, finish semantics, and runner inertness; do not reproduce the changelog or imply a new authorization mechanism.
  applies_to: [TARGET-ARTICLE]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-NON-GOALS
  level: must
  statement: Describe EngineeringSpec as an open, agent-neutral, Git-and-CI-oriented format and CLI/reference implementation that does not require an MCP server, ACP or hosted control plane, specific coding agent, context graph, or telemetry service; possible future integrations must not be presented as prerequisites or current features.
  applies_to: [TARGET-ARTICLE]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-EVIDENCE-HONESTY
  level: must
  statement: State plainly that there is not yet evidence that EngineeringSpec makes coding agents faster, more productive, safer, or more correct; describe the paired protocol at a high level using the same task, immutable base, agent and model, harness, permissions, and trusted checks, retain successful, failed, slower, amended, onboarding-blocked, scope-violating, and inconclusive runs, target at least ten paired tasks across two to five external users or repositories where practical, and make no causal or adoption claim.
  applies_to: [TARGET-ARTICLE]
  enforcement: { kind: review, reviewer_role: evidence-reviewer }
- id: CON-CTA
  level: must
  statement: End with a non-commercial invitation to repository maintainers for criticism, small external pilots, paired tasks, negative results, and alternative authority models; link to the GitHub repository, exact public RC17 prerelease, exact npm package or supported RC17 quickstart installation, and specification, but include a public pilot-guide link only if the participant guide and kit exist on the trusted implementation base and resolve publicly without error.
  applies_to: [TARGET-ARTICLE]
  enforcement: { kind: test, verifier_ref: VER-LINKS }
- id: CON-METADATA
  level: must
  statement: Add an accurate route-specific title, description, canonical URL, Open Graph title, description, type and URL, Twitter card metadata, and truthful article publication date using existing site conventions; reuse existing asset conventions and do not create or claim a new social image.
  applies_to: [TARGET-ARTICLE]
  enforcement: { kind: test, verifier_ref: VER-STATIC }
- id: CON-INDEX
  level: must
  statement: Add the new article to the existing blog index with accurate date, reading time, title, summary, and route while preserving the existing article and making both entries usable on desktop, mobile, keyboard, and reduced-motion settings.
  applies_to: [TARGET-BLOG-INDEX]
  enforcement: { kind: test, verifier_ref: VER-STATIC }
- id: CON-NO-HOMEPAGE
  level: must_not
  statement: Do not modify site/index.html; its existing Blog navigation already provides article discovery, so this increment does not need a homepage promotion surface.
  applies_to: [TARGET-ARTICLE, TARGET-BLOG-INDEX, TARGET-CONTRACT]
  enforcement: { kind: test, verifier_ref: VER-ROUTING }
- id: CON-NO-OTHER-WORK
  level: must_not
  statement: Do not modify runtime, CLI, schemas, specification format, RFCs, workflows, package or lock identity, tests, benchmark semantics or evidence, pilot materials, Action pins, dependencies, guidance, consumers, release identities, deployment configuration, or unrelated files; do not start RC18 or claim production publication without observed deployment evidence.
  applies_to: [TARGET-ARTICLE, TARGET-BLOG-INDEX, TARGET-CONTRACT]
  enforcement: { kind: test, verifier_ref: VER-ROUTING }
- id: CON-CLOSE
  level: must
  statement: After separately trusted checks, local route review, editorial and evidence review, and complete-state routing pass, close only this contract through the exact approved to implemented monotonic transition; do not combine proposal and dependent article implementation.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: maintainer }
```

## Verification

```engineering-verification
- id: VER-STATIC
  proves: [CON-STATIC-PATTERN, CON-METADATA, CON-INDEX]
  kind: test
  runner:
    type: reference
    reference: Serve site as the document root and inspect the blog index and new canonical article route at desktop and narrow mobile widths for non-error responses, metadata, semantic structure, focus behavior, responsive layout, reduced motion, and working navigation
- id: VER-ACCURACY
  proves: [CON-RC17-WORKFLOW, CON-INDEPENDENT-FACTS, CON-VERIFY-BOUNDARY]
  kind: test
  runner:
    type: reference
    reference: Compare every PermissionTicket field, command, classification, fail-closed outcome, and RC17 behavior stated in the article with RFC 0012, current RC17 tests and guidance, and an exact public @engineeringspec/cli@0.1.0-rc.17 installation
- id: VER-LINKS
  proves: [CON-CTA]
  kind: test
  runner:
    type: reference
    reference: Check all article and index links; require successful public GitHub, RC17 release, npm, and specification destinations and omit the pilot URL unless both participant-facing pilot files are live and publicly reachable
- id: VER-ROUTING
  proves: [CON-NO-HOMEPAGE, CON-NO-OTHER-WORK]
  kind: test
  runner:
    type: reference
    reference: engineeringspec check --spec-dir docs/engineering-specs --base origin/main --strict reports implementation routing with zero violations for the complete working state
- id: VER-EDITORIAL
  proves: [CON-IDENTITY, CON-PROBLEM-FIRST, CON-CONTRACT-MODEL, CON-SCOPE-EXAMPLE, CON-RC17-DELTA, CON-NON-GOALS, CON-EVIDENCE-HONESTY, CON-CLOSE]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer, editorial, and evidence review of technical accuracy, distinction from the existing article, restrained claims, external-adoption invitation, scope exclusions, and exact lifecycle close
```

## Rollout

```engineering-rollout
strategy: manual
steps:
  - Merge this contract-only proposal; it grants no implementation authority while proposed.
  - Review and approve this exact revision in a separate contract-only pull request before editing either site target.
  - Write the article at the canonical slug and add its blog-index entry while preserving the existing article and site pattern.
  - Verify the article against the exact public RC17 package, RFC 0012, retained benchmark boundaries, public links, static routes, responsive experience, and complete-state routing.
  - Obtain editorial and evidence review before merging or using the article as a Show HN landing page.
  - Report production availability only after the existing site publication path succeeds; close the contract only through the exact monotonic lifecycle transition.
rollback:
  actions:
    - Remove the new index entry and article route through the normal reviewed Git workflow if technical, editorial, evidence, or publication review fails.
    - Correct or withdraw any unsupported claim without changing product behavior, benchmark evidence, or release identities.
  owner: EngineeringSpec maintainers
```

## Non-goals

This proposal does not write the article, publish the site, change the homepage, alter RC17, start RC18, repair pilot documentation, collect pilot evidence, add product functionality, or authorize any non-blog surface.
