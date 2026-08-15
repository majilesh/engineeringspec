---
{spec_format: engineering-spec, spec_format_version: "0.1", spec_revision: 1, id: ES-product-item, title: Product item, status: draft, owners: [{team: test}], profiles: [{name: productspec, version: "0.1"}]}
---
```engineering-source-refs
[{id: SRC-1, type: productspec, path: conformance/invalid-semantics/product.product-spec.md, item_ids: [AC-404]}]
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
