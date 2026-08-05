---
{spec_format: engineering-spec, spec_format_version: "0.1", spec_revision: 1, id: ES-contract-only, title: Contract only, status: draft, owners: [{team: api}]}
---
```engineering-source-refs
[{id: SRC-1, type: github_issue, ref: acme/api#1}]
```
```engineering-targets
[{id: TARGET-1, paths: [api/**], change_policy: interface_only}]
```
```engineering-contracts
[{id: CONTRACT-1, kind: openapi, path: openapi.yaml, compatibility: backward_compatible}]
```
```engineering-constraints
[]
```
```engineering-verification
[{id: VER-1, proves: [CONTRACT-1], kind: schema_check, runner: {type: reference, reference: compatibility gate}}]
```
