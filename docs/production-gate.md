# Production diff-scope gate checklist

EngineeringSpec’s `gate` is a **diff-scope gate** (path + change-type allowlist). It is not full change-control. Use this checklist so the gate is merge-blocking and not self-authorizing.

## Recommended pin (immutable Action)

Prefer a full commit SHA. The trust-hardened gate lives at:

```text
majilesh/engineeringspec@479d77818669db8a32c515ebfa2a0bb01ca51afb
```

After you cut a release tag, you may also use `majilesh/engineeringspec@v0.1.0-rc.2`, but SHA pins remain the stronger supply-chain default ([GitHub guidance](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions#using-third-party-actions)).

## Enforcing CI job

```yaml
engineering-spec:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0
    - uses: majilesh/engineeringspec@479d77818669db8a32c515ebfa2a0bb01ca51afb
      with:
        path: docs/engineering-specs
        strict: true
        gate-spec: docs/engineering-specs/ES-my-change.engineering-spec.md
        gate-base: origin/main
        gate-spec-from: base
        gate-require-status: approved
```

| Input | Enforcing value | Why |
|---|---|---|
| `gate-spec-from` | `base` | PR cannot widen its own targets |
| `gate-require-status` | `approved` | Draft contracts are not authorization |
| Action ref | full SHA | Avoid mutable `@main` |

## Make the check merge-blocking

A failing Action does **not** block merges by itself. In GitHub:

1. Open **Settings → Rules → Rulesets** (or branch protection for `main`).
2. Require the status check that corresponds to your job (for example `engineering-spec` or `CI / engineering-spec`).
3. Require the check to pass before merge.

Without this, the gate is advisory only.

## Protect the contract with CODEOWNERS

1. Approve the EngineeringSpec in a **separate PR** before implementation work.
2. Add CODEOWNERS so contract changes need maintainer review (see [examples/adopters/CODEOWNERS.example](../examples/adopters/CODEOWNERS.example) and this repo’s [`.github/CODEOWNERS`](../.github/CODEOWNERS)).
3. Protect `CODEOWNERS` itself with the same owners.
4. Keep implementation PRs on `gate-spec-from: base` so they are evaluated against the already-merged contract.

## What the gate does not prove

Continue running your repository’s normal tests, schema diffs, security scans, and policy checks. Declared `must` / `must_not` constraints, verification runners, evidence, and exceptions are **not** executed or authenticated by `gate`.

## CLI equivalent

```sh
npx @engineeringspec/cli@next gate docs/engineering-specs/ES-my-change.engineering-spec.md \
  --base origin/main \
  --spec-from base \
  --require-status approved
```

## Release / npm

- Action + git tag: `v0.1.0-rc.2` (when published) tracks package version `0.1.0-rc.2`.
- npm dist-tag: `npx @engineeringspec/cli@next` for release candidates.
