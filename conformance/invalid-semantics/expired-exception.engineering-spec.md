---
{spec_format: engineering-spec, spec_format_version: "0.1", spec_revision: 1, id: ES-expired, title: Expired, status: approved, owners: [{team: test}]}
---
```engineering-source-refs
[{id: SRC-1, type: other, ref: test}]
```
```engineering-targets
[{id: TARGET-1, paths: [src/**], change_policy: modify}]
```
```engineering-constraints
[{id: CON-1, level: must, statement: Test, enforcement: {kind: test, verifier_ref: VER-1}}]
```
```engineering-verification
[{id: VER-1, proves: [CON-1], kind: test}]
```
```engineering-exceptions
[{id: EXC-1, constraint_ref: CON-1, reason: Legacy, approved_by: [owner], expires_at: "2020-01-01T00:00:00Z"}]
```
