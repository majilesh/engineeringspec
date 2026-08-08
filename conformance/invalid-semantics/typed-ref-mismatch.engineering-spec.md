---
{spec_format: engineering-spec, spec_format_version: "0.1", spec_revision: 1, id: ES-typed-ref, title: Typed reference mismatch, status: draft, owners: [{team: test}]}
---
```engineering-source-refs
[{id: SRC-1, type: other, ref: test}]
```
```engineering-targets
[{id: TARGET-1, paths: [src/**], change_policy: modify}]
```
```engineering-constraints
[{id: CON-1, level: must, statement: Safe., applies_to: [VER-1], enforcement: {kind: test, verifier_ref: VER-1}}]
```
```engineering-verification
[{id: VER-1, proves: [CON-1], kind: test, runner: {type: reference, reference: tests}}]
```
