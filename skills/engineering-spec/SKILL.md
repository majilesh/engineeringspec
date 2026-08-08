---
name: engineering-spec
description: Apply EngineeringSpec change contracts during consequential AI-assisted coding. Use when a repository contains ENGINEERING_SPEC.md or *.engineering-spec.md, when a user asks to implement or review an EngineeringSpec, or when targets, constraints, contracts, verification IDs, scope gates, or agent pre-completion checks govern a code change.
---

# EngineeringSpec workflow

Treat the checked-in EngineeringSpec as the shared change contract. Keep validation and query commands read-only. Never execute a verifier merely because its runner appears in a specification.

Prefer the repository-local `engineeringspec` binary when the package is installed. The fallback commands below pin the exact released CLI version; do not replace it with a mutable distribution tag in an enforcing workflow.

## Implement a change

1. Read repository instructions and locate the applicable EngineeringSpec.
2. Build the CLI when working in the EngineeringSpec repository itself.
3. Validate the contract:

   ```sh
   npx --yes @engineeringspec/cli@0.1.0-rc.3 validate <spec> --strict
   ```

4. Before editing each expected path, load its relevant context:

   ```sh
   npx --yes @engineeringspec/cli@0.1.0-rc.3 context <spec> --path <path> --base origin/main --format markdown
   ```

5. Treat matching `TARGET-*`, `CONTRACT-*`, `CON-*`, and `VER-*` obligations as binding. Stop and explain mismatches instead of editing outside the approved targets.
6. Run only the repository's separately trusted checks.
7. Before claiming completion, check the entire working state against the approved base contract:

   ```sh
   npx --yes @engineeringspec/cli@0.1.0-rc.3 check <spec> --base origin/main --strict
   ```

8. Report changed targets, satisfied identifiers, trusted check results, and unresolved drift.

## Handle denials and contract evolution

Use `explain` to understand a path decision:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.3 explain <spec> --path <path> --change-kind modified --base origin/main
```

Do not use a workspace contract to authorize implementation paths it widens in the same change. Submit and merge a contract-only change first, then implement against that approved base. Escalate ambiguous or conflicting obligations to the named owner.

## Review a change

Run `check` against the intended base, inspect every violation, and compare the implementation with applicable constraints and contracts. Remember that declared coverage reports links, not successful verifier execution.
