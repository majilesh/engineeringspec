---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-engineeringspec-blog-launch
title: Launch the EngineeringSpec blog
status: implemented
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
---

# Launch the EngineeringSpec blog

Add a first-class blog to engineeringspec.org and publish the supplied long-form article about change authority in an agentic software-development lifecycle. Keep the site static, preserve the existing product experience, and present the article as EngineeringSpec analysis rather than as a claim about Uber's internal controls.

This contract grants no implementation authority while `draft` or `proposed`.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: other
  ref: user-supplied-blog-draft-2026-08-25
  title: When 70% of Pull Requests Come From Agents, Who Decides What They're Allowed to Change?
- id: SRC-2
  type: document
  ref: https://aie-wf.sentry.dev/talks/aiewf-117-agentic-sdlc-at-uber
  title: Agentic SDLC at Uber — AI Engineer World's Fair 2026 session
- id: SRC-3
  type: document
  ref: site/index.html
  title: Existing engineeringspec.org visual language and navigation
```

## Target surfaces

```engineering-targets
- id: TARGET-home
  component: site-homepage-blog-entry
  paths:
    - site/index.html
  change_policy: modify
- id: TARGET-blog-index
  component: blog-index
  paths:
    - site/blog/index.html
  change_policy: create
- id: TARGET-article
  component: change-authority-article
  paths:
    - site/blog/change-authority-agentic-sdlc/index.html
  change_policy: create
```

## Constraints

```engineering-constraints
- id: CON-STATIC
  level: must
  statement: The blog index and article must remain dependency-free static HTML and CSS that work when the site directory is served as the document root, with no client-side framework, command execution, persistence, authentication, analytics, or external runtime dependency.
  applies_to: [TARGET-blog-index, TARGET-article]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-NAVIGATION
  level: must
  statement: The homepage must expose a clear Blog navigation entry, and the blog index and article must provide working navigation back to the homepage and between the blog index and article using deployment-safe paths.
  applies_to: [TARGET-home, TARGET-blog-index, TARGET-article]
  enforcement: { kind: test, verifier_ref: VER-STATIC }
- id: CON-ARTICLE
  level: must
  statement: The article must preserve the supplied headline, core argument, evidence-versus-authority distinction, layer comparison, approved-authority lifecycle, deterministic path-scope example, reviewer framing, and closing disclaimer while applying only copy edits required for web readability, accuracy, or house style.
  applies_to: [TARGET-article]
  enforcement: { kind: review, reviewer_role: editorial-maintainer }
- id: CON-ATTRIBUTION
  level: must
  statement: Claims attributed to Uber must link to the cited public Agentic SDLC talk or another directly supporting public source, and the article must state that EngineeringSpec neither claims Uber uses EngineeringSpec nor infers the absence of undisclosed internal controls from the public presentation.
  applies_to: [TARGET-article]
  enforcement: { kind: review, reviewer_role: editorial-maintainer }
- id: CON-DIAGRAM
  level: must
  statement: The article must include an accessible architecture graphic showing Context, Authority, Agent, Validation, CI, and Human Review, with EngineeringSpec visually limited to the authority and final-diff-verification boundary; the graphic must use semantic HTML and CSS rather than a generated or inline SVG.
  applies_to: [TARGET-article]
  enforcement: { kind: test, verifier_ref: VER-STATIC }
- id: CON-DESIGN
  level: must
  statement: New blog surfaces must extend the existing dark EngineeringSpec visual language, prioritize long-form reading, and remain usable without horizontal page scrolling at narrow mobile widths and at desktop widths.
  applies_to: [TARGET-blog-index, TARGET-article]
  enforcement: { kind: review, reviewer_role: design-maintainer }
- id: CON-METADATA
  level: must
  statement: The blog index and article must each provide route-specific title, description, canonical URL, Open Graph title, description, type, URL, and Twitter card metadata; the article metadata must describe the visible article rather than inherit homepage copy.
  applies_to: [TARGET-blog-index, TARGET-article]
  enforcement: { kind: test, verifier_ref: VER-STATIC }
- id: CON-ACCESSIBILITY
  level: must
  statement: The new pages must use semantic landmarks, a logical heading hierarchy, visible keyboard focus, sufficient text contrast, descriptive links, accessible table markup, and reduced-motion-safe presentation.
  applies_to: [TARGET-blog-index, TARGET-article]
  enforcement: { kind: review, reviewer_role: accessibility-reviewer }
- id: CON-EXISTING-SITE
  level: must
  statement: The homepage's existing primary headline, calls to action, feature cards, CLI example, specification link, explorer link, guide link, GitHub link, metadata, and responsive behavior must remain intact except for the bounded blog discovery addition.
  applies_to: [TARGET-home]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-NO-CLAIMED-DEPLOYMENT
  level: must_not
  statement: The implementation must not claim the production domain was updated unless the publishing workflow actually completed successfully, and it must not alter DNS, CNAME, release, package, CLI, specification, schema, catalogue generation, or deployment configuration.
  applies_to: [TARGET-home, TARGET-blog-index, TARGET-article]
  enforcement: { kind: review, reviewer_role: maintainer }
```

## Verification

```engineering-verification
- id: VER-STATIC
  proves: [CON-NAVIGATION, CON-DIAGRAM, CON-METADATA]
  kind: test
  runner:
    type: reference
    reference: Build the repository, serve site as the document root, request the homepage, blog index, and article routes, and inspect links, metadata, semantic diagram labels, and non-error responses without executing any specification-declared runner.
- id: VER-EDITORIAL
  proves: [CON-ARTICLE, CON-ATTRIBUTION, CON-EXISTING-SITE, CON-NO-CLAIMED-DEPLOYMENT]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer review of article fidelity, public-source attribution, disclaimer language, bounded homepage change, and publication evidence.
- id: VER-EXPERIENCE
  proves: [CON-STATIC, CON-DESIGN, CON-ACCESSIBILITY]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer review of dependency-free delivery, long-form readability, responsive layout, keyboard focus, contrast, landmarks, headings, links, table semantics, and reduced-motion behavior.
```

## Rollout

```engineering-rollout
strategy: manual
steps:
  - Review this contract-only proposal and amend its article, attribution, or site boundaries without editing dependent site files.
  - Change only this contract to approved and merge it to the trusted base before implementation begins.
  - Load the base-pinned work brief, add the homepage blog entry, blog index, article route, route-specific metadata, and semantic architecture graphic within the approved surfaces.
  - Run separately trusted repository checks and the complete-working-state strict check, then review the three site routes locally.
  - Publish through the repository's existing site workflow only after implementation review; report the production URL only when the workflow completes.
rollback:
  actions:
    - Revert the bounded homepage blog entry and the two blog routes through the normal reviewed Git workflow.
```
