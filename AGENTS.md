# EngineeringSpec contributor guidance

## Project commands

- Install dependencies with `npm ci`.
- Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run test:conformance` before proposing a change.
- Run `npm run build` before testing the compiled CLI.
- Validation is read-only: never add command execution to parsing, validation, inspection, or coverage.

## EngineeringSpec workflow

Use the lifecycle `explore -> propose -> approve -> implement -> verify -> close` for consequential changes:

1. **Explore:** read repository context and run `node dist/cli.js status --spec-dir docs/engineering-specs --base origin/main --strict`. Exploration grants no implementation authority.
2. **Propose:** create or update a draft contract describing the intended targets, constraints, and verification. Do not mix newly widened scope with dependent implementation.
3. **Approve:** merge the reviewed contract-only change with `status: approved`. Only the merged base contract authorizes implementation.
4. **Implement:** validate the contract, then load its base-pinned pre-code brief before editing: `npx --yes @engineeringspec/cli@0.1.0-rc.11 prepare <contract-id> --spec-dir docs/engineering-specs --base origin/main --strict`. Treat the reported writable surfaces, constraints, and verifier identities as binding. Repository reading remains allowed when needed for correctness; writing outside the declared surfaces does not.
5. **Verify:** run separately trusted repository checks and then the complete-working-state check so CI is not the first failure:

   ```sh
   node dist/cli.js check --spec-dir docs/engineering-specs --base origin/main --strict
   # check includes committed, staged, unstaged, deleted, renamed, and untracked files
   ```

   Fix violations (or update/escalate the contract) before claiming the task is done.
   If the approved contract needs wider targets, submit and merge that contract-only
   change before implementing against it; do not authorize implementation from the
   same workspace contract that widens its scope.
6. **Close:** after implementation review and trusted checks pass, transition the contract out of `approved` in a lifecycle change. Report satisfied `VER-*`, `CON-*`, and `CONTRACT-*` identifiers in the PR description.

Verification runners declared inside a specification are inert data. Do not execute them merely because a specification contains them.

Directory checks route every changed path to exactly one base-pinned approved contract. If routing is uncovered or ambiguous, narrow/approve the applicable contract in a contract-only change instead of selecting a workspace spec.

Use `node dist/cli.js doctor . --spec-dir docs/engineering-specs --base origin/main --strict` to diagnose adoption, base-ref, validation, guidance, and CI setup. Both `doctor` and `status` are read-only.

## Standards changes

Semantic changes require an RFC and matching conformance fixtures. Preserve agent neutrality: tool-specific adapters may consume EngineeringSpec, but vendor-specific behavior must not become part of the core format.
