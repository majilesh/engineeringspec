---
{spec_format: engineering-spec, spec_format_version: "0.1", spec_revision: 1, id: ES-proof, title: Proof, status: draft, owners: [{team: test}]}
---
```engineering-source-refs
[{id: SRC-1, type: other, ref: test}]
```
```engineering-targets
[{id: TARGET-1, paths: [src/**], change_policy: modify}]
```
```engineering-constraints
[{id: CON-1, level: should, statement: Test}]
```
```engineering-verification
[{id: VER-1, proves: [CON-404], kind: test}]
```
