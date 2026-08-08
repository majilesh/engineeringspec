---
{spec_format: engineering-spec, spec_format_version: "0.1", spec_revision: 1, id: ES-bad-parent-glob, title: Parent segment target glob, status: draft, owners: [{team: test}]}
---
```engineering-source-refs
[{id: SRC-1, type: other, ref: test}]
```
```engineering-targets
[{id: TARGET-1, paths: ["src/../secret/**"], change_policy: modify}]
```
```engineering-constraints
[{id: CON-1, level: must, statement: Safe., enforcement: {kind: test, verifier_ref: VER-1}}]
```
```engineering-verification
[{id: VER-1, proves: [CON-1], kind: test, runner: {type: reference, reference: tests}}]
```
