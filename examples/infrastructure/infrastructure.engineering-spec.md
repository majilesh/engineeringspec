---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-worker-canary
title: Canary worker runtime upgrade
status: proposed
owners: [{ team: platform }]
---

# Worker runtime upgrade

```engineering-source-refs
- id: SRC-1
  type: adr
  path: docs/adr/ADR-027-worker-runtime.md
```

```engineering-targets
- id: TARGET-1
  component: worker-runtime
  paths: [infra/workers/**]
  change_policy: modify
```

```engineering-contracts
- id: CONTRACT-1
  kind: infrastructure
  path: infra/workers/main.tf
  compatibility: backward_compatible
```

```engineering-verification
- id: VER-1
  proves: [CONTRACT-1]
  kind: runtime_observation
  runner: { type: reference, reference: canary health dashboard }
```

```engineering-rollout
strategy: canary
observability: [worker_error_rate, worker_latency_p95]
rollback:
  max_minutes: 10
  actions: [restore previous task definition]
  owner: platform
```
