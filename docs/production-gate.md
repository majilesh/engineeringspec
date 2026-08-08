# Production diff-scope gate checklist

EngineeringSpec’s `gate` is a **diff-scope gate** (path + change-type allowlist). It is not full change-control. Use this checklist so the gate is merge-blocking and not self-authorizing.

## Recommended pin (immutable Action)

Prefer a full commit SHA. Reviewed agent-first implementation tip through PR #14:

```text
majilesh/engineeringspec@cecc34d97d581163a4dbd9be0cc2789555196d89
```

Re-pin to this repository’s reviewed merge tip after each change to `action.yml` or gate semantics. `majilesh/engineeringspec@v0.1.0-rc.3` is the corresponding release-candidate tag after publication; SHA pins remain the stronger supply-chain default ([GitHub guidance](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions#using-third-party-actions)).

## Enforcing CI job

```yaml
engineering-spec:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0
    - uses: majilesh/engineeringspec@cecc34d97d581163a4dbd9be0cc2789555196d89
      with:
        path: docs/engineering-specs
        strict: true
        gate-spec: docs/engineering-specs/ES-my-change.engineering-spec.md
        gate-base: origin/main
        gate-spec-from: base
        gate-require-status: approved
        gate-receipt: gate-receipt.json
```

| Input | Enforcing value | Why |
|---|---|---|
| `gate-spec-from` | `base` | PR cannot widen its own targets |
| `gate-require-status` | `approved` | Draft contracts are not authorization |
| `gate-receipt` | path | Durable unsigned audit artifact |
| Action ref | full SHA | Avoid mutable `@main` |

If you use GitHub merge queues, include a `merge_group` trigger on the workflow that runs this Action (or the check will never run for queued merges).

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

Do not switch enforcing CI to `workspace` when a PR changes its own targets. That makes authorization self-widening. Land the reviewed contract-only PR first, then rebase or open the dependent implementation PR against that approved base.

## What the gate does not prove

Continue running your repository’s normal tests, schema diffs, security scans, and policy checks. Declared `must` / `must_not` constraints, verification runners, evidence, and exceptions are **not** executed or authenticated by `gate`.

## CLI equivalent

```sh
npx @engineeringspec/cli@next gate docs/engineering-specs/ES-my-change.engineering-spec.md \
  --base origin/main \
  --require-status approved \
  --receipt gate-receipt.json
```

With `--base` set, the CLI defaults to `--spec-from base` and resolves immutable SHAs before loading the contract and collecting the diff. Upload `gate-receipt.json` as a CI artifact (unsigned; not an attestation).

## Release / npm

- Action + git tag: `v0.1.0-rc.3` (when published) tracks package version `0.1.0-rc.3`.
- npm dist-tag: `npx @engineeringspec/cli@next` for release candidates.
