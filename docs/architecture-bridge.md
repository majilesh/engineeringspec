# Architecture intent to engineering guardrails

EngineeringSpec can connect architecture metadata to engineering review without allowing an architecture model—or an AI interpretation of it—to authorise code changes.

## Initial Backstage adapter

The read-only adapter accepts bounded multi-document Backstage YAML. For `Component` entities it extracts:

- `metadata.name`
- `spec.owner`, `spec.system` and `spec.dependsOn`
- `engineeringspec.org/paths`
- `engineeringspec.org/standards`
- source-file and document provenance

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: revenue-api
  annotations:
    engineeringspec.org/paths: apps/api/**, packages/contracts/**
    engineeringspec.org/standards: OWASP-ASVS, PCI-DSS
spec:
  owner: team-revenue
  system: revenue
  dependsOn: [component:default/customer-data]
```

```sh
engineeringspec architecture catalog-info.yaml --format json
```

The output always declares `authority: read_only`.

## Threat model

Architecture sources may be stale, over-broad, compromised or inconsistent with the repository. Therefore imported paths:

- never enter routing or gate decisions;
- never mutate a contract;
- never execute a command or resolve a remote URI;
- retain source provenance;
- can only inform a human-reviewed, contract-only proposal.

The safe flow is architecture source → read-only map → impact discussion → reviewed contract-only PR → base-pinned implementation. Backstage is the first adapter because it supplies component ownership and dependency metadata with a small deterministic surface. C4/Structurizr, ArchiMate and bidirectional synchronization remain evidence-gated.

