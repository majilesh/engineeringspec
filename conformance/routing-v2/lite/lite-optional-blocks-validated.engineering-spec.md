---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-lite-opt
title: Lite optional blocks
status: approved
owners:
  - team: platform
profiles:
  - name: lite
    version: "0.1"
---

# Lite optional blocks

```engineering-targets
- id: TARGET-1
  paths: [docs/**]
  change_policy: modify
```

```engineering-constraints
- id: CON-1
  level: must
  statement: Preserve behaviour.
  enforcement: { kind: test, verifier_ref: VER-MISSING }
```
