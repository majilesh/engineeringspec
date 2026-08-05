---
{spec_format: engineering-spec, spec_format_version: "0.1", spec_revision: 1, id: ES-digest, title: Digest, status: draft, owners: [{team: test}]}
---
```engineering-source-refs
[{id: SRC-1, type: document, path: intent.md, digest: "sha256:not-a-digest"}]
```
```engineering-targets
[{id: TARGET-1, paths: [src/**], change_policy: modify}]
```
```engineering-constraints
[{id: CON-1, level: should, statement: Test}]
```
```engineering-verification
[{id: VER-1, proves: [CON-1], kind: test}]
```
