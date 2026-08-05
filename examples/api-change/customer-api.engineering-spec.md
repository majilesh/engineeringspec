---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-customer-api
title: Add customer preferences response
status: proposed
owners: [{ team: customer-platform }]
---

```engineering-source-refs
- id: SRC-1
  type: document
  ref: customer-preferences-request
```

```engineering-targets
- id: TARGET-1
  paths: [src/api/customers/**]
  change_policy: interface_only
```

```engineering-contracts
- id: CONTRACT-1
  kind: openapi
  path: contracts/customer-api.openapi.yaml
  compatibility: backward_compatible
```

```engineering-verification
- id: VER-1
  proves: [CONTRACT-1]
  kind: schema_check
  runner: { type: reference, reference: OpenAPI compatibility gate }
```
