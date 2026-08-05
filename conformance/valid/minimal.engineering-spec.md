---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-minimal
title: Minimal
status: draft
owners: [{ team: conformance }]
---
~~~engineering-source-refs
- { id: SRC-1, type: other, ref: fixture }
~~~
~~~engineering-targets
- { id: TARGET-1, paths: [src/**], change_policy: modify }
~~~
~~~engineering-contracts
- { id: CONTRACT-1, kind: json_schema, path: schema.json }
~~~
~~~engineering-verification
- { id: VER-1, proves: [CONTRACT-1], kind: schema_check, runner: { type: reference, reference: schema gate } }
~~~
