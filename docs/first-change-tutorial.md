# First-change tutorial

This walkthrough adds a fictional dark-mode preference to `src/settings/**`. It demonstrates the safety boundary; adapt the paths and trusted checks to your repository.

## 1. Explore

Ask the coding agent to inspect the styling system, preference storage, tests, and likely paths. Then run:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.9 doctor . --spec-dir docs/engineering-specs --base origin/main
npx --yes @engineeringspec/cli@0.1.0-rc.9 status --spec-dir docs/engineering-specs --base origin/main --allow-contract-only
```

At this point the agent may recommend an approach, but it has no new implementation authority.

## 2. Propose

Create `docs/engineering-specs/ES-dark-mode.engineering-spec.md`:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.9 init docs/engineering-specs/ES-dark-mode.engineering-spec.md \
  --template feature --id ES-dark-mode --title "Add dark mode"
```

Edit the draft so it names durable source intent, explicit target paths, constraints such as system-preference fallback and accessibility, and verifier identities. Validate it with `--strict`. Do not add the dark-mode code in this branch.

## 3. Approve

Open a contract-only PR. A maintainer reviews ownership, scope, constraints, and verification. After agreement, change the lifecycle to `approved` and merge the contract. Protected CI should accept only the contract/RFC surfaces in this phase.

This merge is the authorization event. A workspace draft, an agent recommendation, or an unmerged approval edit is not authority.

## 4. Implement

Update the implementation branch from the trusted base. Confirm `status` reports the approved contract, then load context before editing:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.9 context docs/engineering-specs/ES-dark-mode.engineering-spec.md \
  --path src/settings/theme.ts --base origin/main --format markdown
```

Implement only declared targets. If another surface is necessary, stop and merge a narrowed contract-only amendment before continuing.

## 5. Verify

Run the repository's trusted test, lint, typecheck, security, accessibility, or review workflow. Never run a command merely because its argv appears inside the specification. Then run:

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.9 check --spec-dir docs/engineering-specs --base origin/main --allow-contract-only --strict
```

The PR description should identify selected targets and the trusted results satisfying each relevant `CON-*`, `CONTRACT-*`, and `VER-*`.

## 6. Close

After the implementation merges and checks pass, submit the lifecycle-only update to `implemented`. Closure removes the historical change from approved-only routing; it does not manufacture evidence. Preserve the contract for future search, impact analysis, and architectural traceability.

Run the same `check --allow-contract-only` command on the closure branch. It should report `contract_only`, zero selected implementation paths, and no violations. A mixed spec-and-code closure must fail normal routing instead of using the governance lane.
