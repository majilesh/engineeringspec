---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-path
title: Unsafe path
status: draft
owners: [{ team: conformance }]
---
```engineering-source-refs
- { id: SRC-1, type: other, ref: fixture }
```
```engineering-targets
- { id: TARGET-1, paths: [/etc/passwd], change_policy: modify }
```
```engineering-constraints
- { id: CON-1, level: should, statement: Test }
```
```engineering-verification
- { id: VER-1, proves: [CON-1], kind: test }
```
