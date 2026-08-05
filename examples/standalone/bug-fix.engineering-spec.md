---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-session-expiry
title: Preserve refresh-token validity
status: draft
owners: [{ team: identity-platform }]
---

# Session expiry bug fix

Keep issued refresh tokens valid through the access-token refresh window.

```engineering-source-refs
- id: SRC-1
  type: github_issue
  ref: acme/identity#418
```

```engineering-targets
- id: TARGET-1
  component: session-service
  paths: [src/session/**]
  change_policy: modify
```

```engineering-constraints
- id: CON-1
  level: must
  statement: Previously issued refresh tokens remain accepted until their recorded expiry.
  enforcement: { kind: test, verifier_ref: VER-1 }
```

```engineering-verification
- id: VER-1
  proves: [CON-1]
  kind: test
  runner: { type: reference, reference: session compatibility tests }
```
