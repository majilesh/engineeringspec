---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-canon-budget
title: Change budget
status: approved
owners:
  - team: platform
change_budget:
  max_files: 20
  max_changed_lines: 400
---

# Change budget

```engineering-source-refs
- id: SRC-1
  type: other
  ref: fixture
```

```engineering-targets
- id: TARGET-1
  paths: [docs/**]
  change_policy: modify
```

```engineering-constraints
- id: CON-1
  level: must
  statement: Preserve behaviour.
  enforcement: { kind: test, verifier_ref: VER-1 }
```

```engineering-verification
- id: VER-1
  proves: [CON-1]
  kind: test
  runner: { type: reference, reference: suite }
```
