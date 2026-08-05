---
{spec_format: engineering-spec, spec_format_version: "0.1", spec_revision: 1, id: ES-contract, title: Contract, status: draft, owners: [{team: test}]}
---
```engineering-source-refs
[{id: SRC-1, type: other, ref: test}]
```
```engineering-targets
[{id: TARGET-1, paths: [src/**], change_policy: modify}]
```
```engineering-contracts
[{id: CONTRACT-1, kind: openapi}]
```
```engineering-verification
[{id: VER-1, proves: [CONTRACT-1], kind: schema_check}]
```
