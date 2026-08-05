---
{spec_format: engineering-spec, spec_format_version: "0.1", spec_revision: 1, id: ES-review, title: Human review, status: proposed, owners: [{person: reviewer}]}
---
```engineering-source-refs
[{id: SRC-1, type: adr, ref: ADR-1}]
```
```engineering-targets
[{id: TARGET-1, paths: [docs/**], change_policy: modify}]
```
```engineering-constraints
[{id: CON-1, level: should, statement: A maintainer should review the decision.}]
```
```engineering-verification
[{id: VER-1, proves: [CON-1], kind: human_review, runner: {type: manual}}]
```
