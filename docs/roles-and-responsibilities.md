# Roles and responsibilities

Small teams may combine roles, but the decisions remain distinct.

| Role | Responsible for | Must not assume |
|---|---|---|
| Product owner | Durable intent, outcomes, acceptance context | Product intent alone defines repository authorization |
| Enterprise/solution architect | Architectural constraints, standards, dependency context | An architecture model directly grants path authority |
| Engineering maintainer | Target ownership, contract approval, exceptions, lifecycle closure | Agent-generated scope is automatically safe |
| Coding agent/developer | Base-pinned context, in-scope implementation, evidence report | A draft or workspace edit is approved |
| Reviewer | Scope, constraints, compatibility, trusted evidence | Declared runner metadata proves a check ran |
| Platform/security team | Protected CI, immutable pins, policy adapters, audit expectations | Validation is a sandbox or execution engine |

## Separation that matters

The contract author may also implement, but approval must still occur through the trusted-base governance path before dependent code. Verification runner declarations are inert; a separately trusted workflow chooses and runs checks. Human review owns exceptions and ambiguous obligations.

## Architecture sources

Backstage, OpenAPI, C4/Structurizr, ArchiMate, standards, and dependency models can eventually propose targets and constraints with provenance. Their adapters should open a reviewable contract-only change. They must never silently translate model ownership into implementation authority.

