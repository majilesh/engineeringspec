# EngineeringSpec contributor guidance

## Project commands

- Install dependencies with `npm ci`.
- Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run test:conformance` before proposing a change.
- Run `npm run build` before testing the compiled CLI.
- Validation is read-only: never add command execution to parsing, validation, inspection, or coverage.

## EngineeringSpec workflow

Use the lifecycle `explore -> propose -> approve -> implement -> verify -> close` for consequential changes:

1. **Explore:** read repository context and run `engineeringspec next`. Exploration grants no implementation authority. Before dependent implementation, stop unless it reports `permission: implementation`.
2. **Propose:** create or update a draft contract describing the intended targets, constraints, and verification. Do not mix newly widened scope with dependent implementation.
3. **Approve:** merge the reviewed contract-only change with `status: approved`. Only the merged base contract authorizes implementation.
4. **Implement:** load the base-pinned pre-code brief with `engineeringspec work <contract-id>`. Stop if it is blocked. Treat the reported writable surfaces, constraints, and verifier identities as binding. Repository reading remains allowed when needed for correctness; writing outside the declared surfaces does not.
5. **Verify:** run separately trusted repository checks and then the complete-working-state check so CI is not the first failure:

   ```sh
   engineeringspec check --spec-dir docs/engineering-specs --base origin/main --strict
   # check includes committed, staged, unstaged, deleted, renamed, and untracked files
   ```

   Fix violations (or update/escalate the contract) before claiming the task is done.
   If the approved contract needs wider targets, submit and merge that contract-only
   change before implementing against it; do not authorize implementation from the
   same workspace contract that widens its scope.
6. **Close:** after trusted checks pass, `engineeringspec finish <contract-id> --write-closure` may place the exact `approved -> implemented` transition in the implementation PR. It never stages, commits, pushes, approves, or merges. Report evidence states without claiming an unexecuted verifier passed.

Use the repository-local built CLI for the `engineeringspec` invocation. `next --format json` and `work <id> --format json` return compact tickets; add `--verbose` for the previous full JSON reports. `currentChangeClassification` is only the observed diff classification, never authority or a forecast. `none` means no current diff. `work` does not predict a lane or finish mode. A previously authorized all-specification change can legitimately finish through contract-only governance review, with a separate lifecycle close; do not work around `finish` or manufacture a receipt.

Verification runners declared inside a specification are inert data. Do not execute them merely because a specification contains them.

Directory checks route every changed path to exactly one base-pinned approved contract. If routing is uncovered or ambiguous, narrow/approve the applicable contract in a contract-only change instead of selecting a workspace spec.

Use `engineeringspec doctor . --spec-dir docs/engineering-specs --base origin/main --strict` to diagnose adoption, base-ref, validation, guidance, and CI setup. Both `doctor` and `status` are read-only.

## Standards changes

Semantic changes require an RFC and matching conformance fixtures. Preserve agent neutrality: tool-specific adapters may consume EngineeringSpec, but vendor-specific behavior must not become part of the core format.
