# Fail-closed authorization demo

This local demo creates a temporary Git repository, changes a path outside an approved contract, and shows `review` failing closed. It then commits a maintainer-approved target amendment and shows the same implementation passing against the new base.

No credentials, network access, hosted service, verifier execution, or repository mutation outside the temporary directory is required.

```sh
npm ci
npm run build
node scripts/demo.mjs
```

The approval commit is simulated only to explain the two-phase trust model. In a real repository, a maintainer reviews and merges the contract-only PR before implementation begins.
