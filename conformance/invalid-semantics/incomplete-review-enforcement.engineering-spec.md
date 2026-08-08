---
{spec_format: engineering-spec, spec_format_version: "0.1", spec_revision: 1, id: ES-incomplete-review, title: Incomplete review enforcement, status: draft, owners: [{team: test}]}
---
```engineering-source-refs
[{id: SRC-1, type: other, ref: test}]
```
```engineering-targets
[{id: TARGET-1, paths: [docs/**], change_policy: modify}]
```
```engineering-constraints
[{id: CON-1, level: must, statement: Maintainer review required., enforcement: {kind: review}}]
```
```engineering-verification
[{id: VER-1, proves: [CON-1], kind: human_review, runner: {type: manual}}]
```
