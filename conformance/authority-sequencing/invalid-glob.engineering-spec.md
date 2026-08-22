---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-invalid-maintenance-glob
title: Invalid maintenance glob
status: approved
owners: [{team: test}]
---

```engineering-source-refs
[{id: SRC-1, type: other, ref: conformance}]
```

```engineering-targets
[{id: TARGET-1, paths: [src/**], change_policy: modify}]
```

```engineering-authority-controls
mode: maintenance
suspensions:
  - contract_id: ES-feature
    spec_revision: 4
    semantic_digest: sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    paths: [src/**]
```

```engineering-constraints
[{id: CON-1, level: must, statement: Exact paths only., enforcement: {kind: test, verifier_ref: VER-1}}]
```

```engineering-verification
[{id: VER-1, proves: [CON-1], kind: test}]
```
