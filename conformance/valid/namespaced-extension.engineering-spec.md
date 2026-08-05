---
{spec_format: engineering-spec, spec_format_version: "0.1", spec_revision: 1, id: ES-extension, title: Extension, status: draft, owners: [{team: test}]}
---
```engineering-source-refs
[{id: SRC-1, type: other, ref: test}]
```
```engineering-targets
[{id: TARGET-1, paths: [src/**], change_policy: observe}]
```
```engineering-contracts
[{id: CONTRACT-1, kind: policy, path: policy.rego}]
```
```engineering-verification
[{id: VER-1, proves: [CONTRACT-1], kind: policy, runner: {type: external, reference: policy-service}}]
```
```engineering-x-acme-risk
classification: medium
```
