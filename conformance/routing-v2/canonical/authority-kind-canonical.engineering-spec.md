---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-canon-kind
title: Authority kind
status: approved
owners:
  - team: platform
authority_kind: standing
expires_at: "2026-12-01T00:00:00Z"
---

# Authority kind

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
