---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 2
id: ES-checkout-simulation-demo
title: Replayable checkout simulation evidence
status: implemented
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
---

# Replayable checkout simulation evidence

Build a standalone, separately invoked checkout and bank simulator. After recovery completes, each successfully charged order must have exactly one receipt. The bank commits a charge before losing its response. The buggy retry recognizes the existing charge and skips writing the receipt. The fix reconciles that charge and writes the receipt idempotently.

1. Pin the workload version, starting state, virtual clock, scheduler, bank responses and fault window. Record the seed and ordered decisions. Run a fixed seed corpus and retain a failing schedule and trace.
2. Replay the failure in a fresh process. Require the same ordered events and verdict on the original revision. Replay the same external decisions against the fix, allow internal events to differ, then run the whole corpus. Reject incompatible replay inputs.
3. Inside the example, add an adapter that binds the reported verdict to the existing evidence envelope for the evaluated change, contract revision and declared verifier. Store run manifests and traces as external artifacts. Reject stale or mismatched bindings. Keep execution outside parsing, review and validation.
4. Present actual before/after artifacts, revisions, failed clause, bank and receipt events, replay instructions and corpus counts on a static walkthrough. Link to the generated offline Visual Verification Brief. Keep trace details in the walkthrough and preserve existing brief semantics.

Acceptance requires a detected missing receipt, repeatable failure, passing fixed replay, passing fixed corpus, and a negative binding test. Use real captured outputs and disclose the controlled dependencies. Changes to core evidence semantics require a separate RFC, conformance fixtures and approved scope.

```engineering-source-refs
- id: SRC-WORKFLOW
  type: document
  ref: docs/visual-verification-brief.md
```

```engineering-targets
- id: TARGET-DELIVERY
  component: checkout-simulation-demo
  paths:
    - examples/checkout-simulation/**
    - site/checkout-replay.html
  change_policy: create
- id: TARGET-AUDIT
  paths: [package.json, package-lock.json, vitest.config.ts]
  change_policy: modify
- id: TARGET-GENERATED
  paths: [action/cli.mjs, site/catalogue.json, site/explorer.html]
  change_policy: modify
```

```engineering-constraints
- id: CON-CI
  level: must
  statement: Resolve the high and critical dependency advisories using supported releases compatible with Node 20 and 22. Keep test coverage thresholds and CI gates intact. Limit test configuration changes to necessary runner compatibility. Regenerate catalogue outputs from the final lifecycle state and rebuild the Action only if its inputs change. Verify clean installation, audit, release integrity, Action consistency and the existing quality suite.
  applies_to: [TARGET-AUDIT, TARGET-GENERATED]
  enforcement: { kind: test, verifier_ref: VER-CI }
- id: CON-DELIVERY
  level: must
  statement: The demo must report actual externally generated run evidence and preserve read-only core verification and provider neutrality.
  applies_to: [TARGET-DELIVERY]
  enforcement: { kind: review, reviewer_role: repository-maintainer }
```

```engineering-verification
- id: VER-CI
  kind: test
  proves: [CON-CI]
  runner: { type: reference, reference: Repository audit and release integrity and Node 20 and 22 quality checks }
- id: VER-DELIVERY
  kind: human_review
  proves: [CON-DELIVERY]
  runner: { type: manual, reference: Review the acceptance evidence described above }
```
