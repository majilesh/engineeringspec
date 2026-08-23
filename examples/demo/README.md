# Three-minute fail-closed demo

This local demo shows the difference between an agent's intended change and reviewed repository authority. It creates a temporary Git repository; your checkout is not modified.

Run it from this repository:

```sh
npm ci
npm run build
node scripts/demo.mjs
```

Watch the script's exact story unfold:

1. The approved contract permits the bounded surface `src/allowed.ts`.
2. The script creates `src/outside.ts`, which is not inside that authority, so review fails closed.
3. The script then simulates a separately committed maintainer amendment that adds that exact path to the trusted base.
4. The unchanged `src/outside.ts` implementation passes against the newly committed authority.

In a real repository, the authority amendment is independently reviewed and merged before implementation resumes. An agent cannot fix a denial by widening its own workspace contract and spending that change at once.

The script does not attempt a workspace-only self-widen: such mutable content is not trusted-base authority and cannot legitimately fix the failure. The demo proves deterministic path-scope routing and illustrates grant-before-spend for these fixture paths. It does **not** prove implementation correctness, sandbox or contain filesystem writes, execute verifier commands, or demonstrate semantic/AST compatibility.
