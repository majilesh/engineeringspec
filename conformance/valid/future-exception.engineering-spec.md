---
{spec_format: engineering-spec, spec_format_version: "0.1", spec_revision: 1, id: ES-exception, title: Exception, status: approved, owners: [{team: test}]}
---
```engineering-source-refs
[{id: SRC-1, type: security_finding, ref: SEC-1}]
```
```engineering-targets
[{id: TARGET-1, paths: [src/**], change_policy: modify}]
```
```engineering-constraints
[{id: CON-1, level: must, statement: Use the current control., enforcement: {kind: none, reason: temporary migration}}]
```
```engineering-verification
[{id: VER-1, proves: [CON-1], kind: human_review, runner: {type: reference, reference: security review}}]
```
```engineering-exceptions
[{id: EXC-1, constraint_ref: CON-1, reason: Migration, approved_by: [security], expires_at: "2099-01-01T00:00:00Z"}]
```
