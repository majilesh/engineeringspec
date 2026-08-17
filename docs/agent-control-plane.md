# EngineeringSpec and the Agent Control Plane

EngineeringSpec is a portable, agent-neutral, Git-native change-authority layer. An Agent Control Plane is an optional downstream runtime governance and orchestration system. They should integrate through stable machine-readable authority and evidence boundaries without turning EngineeringSpec into an agent runtime.

The governing rule is:

> The control plane consumes reviewed EngineeringSpec authority. It does not manufacture authority.

EngineeringSpec remains independently usable with Git, the CLI, CI, and human review. Deploying a control plane must never become a prerequisite for safe use.

## Layering

```text
Product and human intent
  Issues · ProductSpec · ADRs · requirements
                  │
                  ▼
EngineeringSpec — portable change authority
  scope · constraints · contracts · verifier identities
  approved-base identity · routing · receipt formats
                  │
                  ▼
Agent Control Plane — runtime governance and orchestration
  sessions · identities · models · tools · sandboxes
  execution policy · evidence · audit · scheduling
                  │
                  ▼
Agent and execution runtime
  Codex · Claude · Cursor · Copilot · custom agents
                  │
                  ▼
CI, reviewer, and merge protection
  independently verify the authority spend
```

Control-plane capability is downstream from reviewed EngineeringSpec authority. Database state, API requests, queues, task labels, and agent claims cannot replace the approved Git base.

## EngineeringSpec owns

EngineeringSpec owns or represents:

- durable source-intent references;
- explicit target surfaces and writable, protected, or change-policy boundaries;
- constraints, obligations, and technical-contract references;
- verifier identities and proof obligations;
- lifecycle state;
- deterministic parsing, normalization, and semantic authority comparison;
- approved-base candidate loading, routing, and diff-scope enforcement;
- evidence and receipt binding formats; and
- portable machine-readable authority context.

These semantics must remain deterministic, agent-neutral, and useful without a hosted service.

## Agent Control Plane owns

A control plane may own runtime concerns including:

- task and session orchestration;
- actor and agent identity;
- model selection and routing;
- sandbox and repository/worktree provisioning;
- tool and runtime network policy;
- secrets brokerage and secure connectivity;
- scheduling, retries, checkpoints, and concurrency;
- multi-agent coordination;
- telemetry, audit logs, cost, and token accounting;
- runtime approval workflows;
- trusted verifier execution and evidence collection;
- durable execution history; and
- runner hosting or private/VPC execution.

These concerns should not be added to the EngineeringSpec document format merely because a control plane needs them.

## Authority admission and binding

A task admitted to a control plane should bind to immutable authority identifiers:

```text
repository identity
base SHA
contract ID
spec revision
contract semantic digest
candidate-set identity or digest
routing policy and version
allowed surfaces
constraints
verifier identities
```

Resolve a movable branch ref once at admission and retain the resulting base SHA. Do not continually reinterpret authority against a moving branch during execution.

Where available, bind the task to EngineeringSpec's existing deterministic candidate-set and routing-decision digests rather than creating a competing control-plane representation.

## Repository-wide effective authorization

`work <contract-id>` provides the intended contract's base-pinned pre-code context and write envelope. It does not replace repository-wide routing, and the intended contract is not the sole authority universe merely because a task was admitted through `work <id>`.

Effective authorization depends on every approved candidate loaded from the same immutable base. Another contract can deny a path that the intended contract allows, two contracts can make a path ambiguous, and a changed path can remain uncovered. Runtime write authorization **must** preserve cross-contract deny-overrides, ambiguity detection, and uncovered-path failure against the same immutable approved candidate set used by repository enforcement.

The control plane may narrow the resulting repository-wide decision further. It must not select only the intended contract, discard competing candidates, reinterpret their policies, or turn an ambiguous, denied, or uncovered route into an allow. CI still recomputes the decision independently over the actual proposed change.

The intended flow is:

```text
reviewed human governance
        ↓
approved EngineeringSpec on immutable Git base
        ↓
deterministic authority resolution
        ↓
control-plane task bound to immutable authority identity
        ↓
restricted sandbox and agent runtime
        ↓
implementation plus separately collected evidence
        ↓
deterministic EngineeringSpec check
        ↓
independent CI, reviewer, and merge decision
```

## Non-negotiable rules

### Runtime authority is monotonic downward

The control plane may reduce an approved envelope for a task, sandbox, tool, or actor. It may not widen it:

```text
runtimeAuthority ⊆ approvedEngineeringSpecAuthority
```

If additional repository surfaces are needed, amend, review, and merge the EngineeringSpec contract first. A task flag or runtime approval cannot substitute for that merge.

### Delegation may only delegate subsets

Future multi-agent delegation must preserve:

```text
childAuthority ⊆ parentRuntimeAuthority ⊆ approvedContractAuthority
```

An agent cannot grant another agent authority it does not possess. This document defines the invariant; it does not implement delegation.

### Control-plane state is not approval

Task rows, session metadata, queue state, API requests, agent output, and runtime approval records can bind to or further restrict approved authority. They cannot create repository write authority.

### Specification runners remain inert

EngineeringSpec provides verifier identity and obligation. It does not provide trusted executable authority. A control plane must execute verification only through separately trusted repository or control-plane mappings. It must never execute a command merely because a specification runner declares it.

### Evidence must be deterministically bindable

Control-plane evidence should be capable of binding at least:

```text
repository identity
base SHA
contract ID
spec revision
contract semantic digest
actual change digest
verifier ID
executor identity
execution environment or sandbox identity
timestamp
result
```

Future signatures or attestations may strengthen provenance. Current unsigned EngineeringSpec receipts are deterministic observations, not cryptographic proof, implementation permission, or proof that a verifier ran.

### CI remains independent

The control plane's routing decision or execution record does not replace the repository's merge-blocking EngineeringSpec check. CI evaluates the actual proposed change against approved base authority independently.

### Agent neutrality is preserved

Codex, Claude, Cursor, Copilot, OpenClaw, custom agents, and future runtimes should consume the same authority semantics. Model-specific prompting and harness behavior belong in adapters or the control plane, not the core format.

## Integration boundary

Prefer versioned structured JSON or stable library APIs for control-plane integration. Do not scrape human CLI text. Important machine contracts should expose explicit schema and semantic versions, immutable authority identity, deterministic ordering, and clear compatibility behavior.

The control plane may add stricter runtime policy, but any composed decision must retain the approved EngineeringSpec envelope as an upper bound and make denials or restrictions observable. EngineeringSpec must not absorb generic policy-engine semantics or model-specific workarounds as agents evolve.

## Explicit non-goals

This direction does not add MCP, a hosted EngineeringSpec service, runtime scheduling, agent execution, secrets handling, verifier execution, delegation, a dashboard, or a new format version. Those may be designed independently without weakening EngineeringSpec's grant-versus-spend invariant.
