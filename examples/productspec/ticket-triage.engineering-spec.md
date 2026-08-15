---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-ticket-triage
title: Ticket auto-triage pipeline
status: draft
owners: [{ team: platform-engineering }]
profiles: [{ name: productspec, version: "0.1" }]
---

Product requirements remain authoritative in the linked ProductSpec.

```engineering-source-refs
- id: SRC-1
  type: productspec
  path: examples/productspec/ticket-triage.product-spec.md
  revision: 3
  item_ids: [AC-1, EVAL-1]
```

```engineering-targets
- id: TARGET-1
  component: triage-worker
  paths: [src/workers/triage/**]
  change_policy: modify
```

```engineering-constraints
- id: CON-1
  level: must_not
  statement: Classifier code must not issue raw SQL.
  satisfies: [AC-1]
  enforcement: { kind: policy, adapter: semgrep, rule_ref: policies/no-raw-sql.yml }
```

```engineering-verification
- id: VER-1
  proves: [AC-1, CON-1]
  kind: static_analysis
  runner: { type: reference, reference: semgrep no-raw-sql rule }
- id: VER-2
  proves: [EVAL-1]
  kind: ai_eval
  definition_ref: SRC-1#EVAL-1
```
