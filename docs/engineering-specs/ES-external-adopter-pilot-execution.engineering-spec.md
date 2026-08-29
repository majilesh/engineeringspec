---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-external-adopter-pilot-execution
title: Prepare and run the external-adopter evidence pilot
status: approved
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
base_revision: "9caf291bf9fb3343e0875c6c3832a10fb8c9573f"
supersedes:
  - ES-precode-brief-evidence-pilot
---

# Prepare and run the external-adopter evidence pilot

Repair the missing public pilot materials, then recruit external adopters and retain reproducible paired-task observations using the benchmark and measure behavior already published in RC17. This contract grants no product-development or release authority.

## Source intent

```engineering-source-refs
- id: SRC-1
  type: document
  ref: benchmarks/README.md
  title: Published RC17 paired agent-impact benchmark overview and broken pilot links
- id: SRC-2
  type: document
  ref: docs/engineering-specs/ES-precode-brief-evidence-pilot.engineering-spec.md
  title: Superseded mixed product-and-pilot proposal
- id: SRC-3
  type: document
  ref: docs/engineering-specs/ES-evidence-integrity-before-pilot.engineering-spec.md
  title: Implemented immutable measurement and evidence-integrity authority
- id: SRC-4
  type: document
  ref: docs/engineering-specs/ES-risk-stratified-pilot-evidence.engineering-spec.md
  title: Implemented risk-stratified paired-evidence authority
- id: SRC-5
  type: document
  ref: docs/engineering-specs/ES-rc17-release.engineering-spec.md
  title: Implemented RC17 release-preparation authority
- id: SRC-6
  type: other
  ref: external-adoption-evidence-mode-2026-08-29
  title: Maintainer direction to freeze feature work and gather external-adopter evidence
```

## Target surfaces

```engineering-targets
- id: TARGET-PILOT
  component: public-external-adopter-pilot-kit
  paths:
    - benchmarks/README.md
    - benchmarks/pilot-guide.md
    - benchmarks/pilots/**
  change_policy: modify
- id: TARGET-CONTRACT
  component: pilot-contract-lifecycle
  paths:
    - docs/engineering-specs/ES-external-adopter-pilot-execution.engineering-spec.md
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-PUBLIC-KIT
  level: must
  statement: Repair every participant-facing link from benchmarks/README.md and provide a self-contained public pilot guide and pilot kit usable from a clean checkout and from the exact public @engineeringspec/cli@0.1.0-rc.17 package, without relying on private repository files or maintainer-only context.
  applies_to: [TARGET-PILOT]
  enforcement: { kind: review, reviewer_role: evidence-reviewer }
- id: CON-EXISTING-COMMANDS
  level: must
  statement: The protocol must use the existing engineeringspec benchmark and engineeringspec measure commands, the existing agent-impact schema, and existing RC17 semantics; it may document invocations, inputs, validation, and interpretation but must not add or change benchmark, measurement, routing, lifecycle, or PermissionTicket semantics.
  applies_to: [TARGET-PILOT]
  enforcement: { kind: test, verifier_ref: VER-PROTOCOL }
- id: CON-PAIRED-PROTOCOL
  level: must
  statement: Each task must run baseline and engineeringspec conditions from the same immutable repository base with the same task-prompt digest, agent and model versions, harness, permissions, trusted checks, time limit, acceptance criteria, and reviewer identity; record condition order, distinct committed heads, environment differences, amendments, and any departure from the protocol.
  applies_to: [TARGET-PILOT]
  enforcement: { kind: review, reviewer_role: evidence-reviewer }
- id: CON-CONSENT-PRIVACY
  level: must
  statement: Participation must be voluntary and consented by the participant and repository owner where distinct; instructions must forbid secrets, credentials, personal data, proprietary source, raw private prompts, and unsanitized private paths from retained or submitted artifacts, require participant review before submission, and document sanitization and any consent withdrawal before evidence is merged.
  applies_to: [TARGET-PILOT]
  enforcement: { kind: review, reviewer_role: privacy-reviewer }
- id: CON-RETENTION
  level: must
  statement: Define a reproducible submission and retention path under benchmarks/pilots for consent-safe protocol metadata, paired run records, measurement receipts, trusted-check outcomes, review outcomes, amendments, limitations, and provenance sufficient for an independent reviewer to rerun the existing summarizer and trace each observation to immutable inputs without retaining private repository content.
  applies_to: [TARGET-PILOT]
  enforcement: { kind: test, verifier_ref: VER-EVIDENCE }
- id: CON-ADVERSE-EVIDENCE
  level: must
  statement: Retain and count failed, slower, amended, onboarding-blocked, protocol-deviating, excluded, and inconclusive runs; corrections must be append-only or explicitly versioned, exclusions must preserve the original observation and reason, and no outcome may be discarded because it is unfavorable.
  applies_to: [TARGET-PILOT]
  enforcement: { kind: review, reviewer_role: evidence-reviewer }
- id: CON-RECRUITMENT
  level: must
  statement: Recruit two to five consenting external users or repositories and target at least ten paired tasks where practical across the retained sample; record recruitment, refusal, withdrawal, onboarding failure, and sample shortfall without fabricating completion or silently substituting maintainer-only dogfood.
  applies_to: [TARGET-PILOT]
  enforcement: { kind: review, reviewer_role: evidence-reviewer }
- id: CON-CLAIMS
  level: must_not
  statement: Do not make causal, productivity, correctness, safety, adoption, conversion, or general-population claims without retained supporting evidence; all reporting must be descriptive of the retained sample, disclose sample size and missing data, distinguish observed records from examples, and state limitations and inconclusive or negative findings.
  applies_to: [TARGET-PILOT]
  enforcement: { kind: test, verifier_ref: VER-EVIDENCE }
- id: CON-NO-PRODUCT-WORK
  level: must_not
  statement: This authority must not modify src, tests, conformance, schemas, RFCs, package or lock identity, workflows, Actions, dependencies, integrations, skills, site, release guidance, consumers, or any runtime behavior; it must not add MCP, ACP, Context Plane, hosted services, telemetry, RC18 work, feature work, release work, new benchmark semantics, or unrelated cleanup.
  applies_to: [TARGET-PILOT, TARGET-CONTRACT]
  enforcement: { kind: test, verifier_ref: VER-ROUTING }
- id: CON-RUNNER-INERTNESS
  level: must
  statement: EngineeringSpec verification runners remain inert declarations; pilot instructions may identify separately trusted commands for humans or harnesses to run but must not introduce automatic command execution during parsing, validation, inspection, coverage, routing, or PermissionTicket generation.
  applies_to: [TARGET-PILOT]
  enforcement: { kind: review, reviewer_role: maintainer }
- id: CON-CLOSE
  level: must
  statement: Keep this contract approved while recruitment or evidence collection is active; after the public kit, retained observations, separately trusted checks, and post-pilot evidence and privacy review are complete, close it only through the exact approved to implemented monotonic lifecycle transition in a separately reviewed change.
  applies_to: [TARGET-CONTRACT]
  enforcement: { kind: review, reviewer_role: maintainer }
```

## Verification

```engineering-verification
- id: VER-PROTOCOL
  proves: [CON-EXISTING-COMMANDS, CON-PAIRED-PROTOCOL]
  kind: test
  runner:
    type: reference
    reference: From clean checkout and a clean public RC17 install, follow the documented protocol and confirm existing benchmark and measure command invocations are valid without source or configuration changes
- id: VER-EVIDENCE
  proves: [CON-RETENTION, CON-ADVERSE-EVIDENCE, CON-RECRUITMENT, CON-CLAIMS]
  kind: test
  runner:
    type: reference
    reference: Validate retained JSON against benchmarks/agent-impact.schema.json and run engineeringspec benchmark on the complete retained record set, including --require-publishable only for evidence explicitly reported as publishable
- id: VER-ROUTING
  proves: [CON-NO-PRODUCT-WORK]
  kind: test
  runner:
    type: reference
    reference: engineeringspec check --spec-dir docs/engineering-specs --base origin/main --strict reports implementation routing with zero violations for the complete working state
- id: VER-REVIEW
  proves: [CON-PUBLIC-KIT, CON-CONSENT-PRIVACY, CON-ADVERSE-EVIDENCE, CON-RECRUITMENT, CON-CLAIMS, CON-RUNNER-INERTNESS, CON-CLOSE]
  kind: human_review
  runner:
    type: manual
    reference: Maintainer, privacy, and evidence reviewers confirm participant usability, consent-safe retention, adverse-outcome preservation, sample accounting, claim discipline, and exact lifecycle closure
```

## Rollout

```engineering-rollout
strategy: canary
steps:
  - Merge this proposal as a contract-only change; it grants no implementation authority while proposed.
  - Review and approve the exact contract in a separate contract-only change before repairing participant materials or collecting repository evidence.
  - Repair the public pilot guide and kit, then verify every linked instruction from a clean checkout and exact public RC17 installation.
  - Recruit two to five external users or repositories, obtain consent, predeclare comparable paired tasks, and retain every observed outcome under the documented privacy and provenance rules.
  - Target at least ten paired tasks where practical; report any shortfall, withdrawal, failure, amendment, exclusion, or inconclusive result explicitly.
  - Obtain separate evidence and privacy review before publishing any conclusion or performing the exact approved to implemented lifecycle close.
rollback:
  actions:
    - Stop recruitment and mark the pilot paused if consent, privacy, comparability, or retention requirements cannot be met.
    - Preserve already consented and sanitized observations, including negative results, while withdrawing any unsupported summary or claim.
    - Remove or correct broken participant instructions without changing the immutable observed records they produced.
  owner: EngineeringSpec maintainers
```

## Non-goals

No runtime feature, benchmark or measurement semantic change, schema change, RFC, MCP, ACP, Context Plane, hosted service, telemetry, release, RC18 work, consumer modification, dependency change, or unrelated cleanup is authorized.
