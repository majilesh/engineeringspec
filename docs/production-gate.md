# Production diff-scope gate checklist

EngineeringSpec’s `gate` is a **diff-scope gate** (path + change-type allowlist). It is not full change-control. Use this checklist so the gate is merge-blocking and not self-authorizing.

## Recommended pin (immutable Action)

Prefer a full commit SHA. This is the sanitized equivalent of the reviewed RC12 Action implementation merge:

```text
majilesh/engineeringspec@e2d485cfeeb4ce745a57293db089ff70cc4648de
```

Re-pin to this repository’s reviewed merge tip after each change to `action.yml` or gate semantics. `majilesh/engineeringspec@v0.1.0-rc.13` is the corresponding release-candidate tag after publication; SHA pins remain the stronger supply-chain default ([GitHub guidance](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions#using-third-party-actions)).

## Enforcing CI job

```yaml
engineering-spec:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0
    - uses: majilesh/engineeringspec@e2d485cfeeb4ce745a57293db089ff70cc4648de
      with:
        path: docs/engineering-specs
        strict: true
        gate-spec-dir: docs/engineering-specs
        gate-base: origin/main
        gate-require-status: approved
        gate-allow-contract-only: true
```

| Input | Enforcing value | Why |
|---|---|---|
| `gate-spec-dir` | `docs/engineering-specs` | Discover every candidate from the approved base tree |
| `gate-require-status` | `approved` | Draft contracts are not authorization |
| `gate-allow-contract-only` | `true` | Strictly validate spec-directory-only governance without routing it as implementation |
| Action ref | full SHA | Avoid mutable `@main` |

Use the compatible single-spec `gate-spec` input when an unsigned `gate-receipt` is required; directory routing does not currently emit a combined receipt.

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
4. Keep implementation PRs on base-pinned directory routing so they are evaluated against already-merged approved contracts.

Do not switch enforcing CI to `workspace` when a PR changes its own targets. That makes authorization self-widening. Land the reviewed contract-only PR first, then rebase or open the dependent implementation PR against that approved base.

When `gate-allow-contract-only` is enabled, protect both the specification directory and workflow with required maintainer review. The option is valid only with `gate-spec-dir`. It classifies a non-empty, strictly valid specification-directory-only diff; a mixed change or cross-boundary rename returns to normal approved-base routing.

## What the gate does not prove

Continue running your repository’s normal tests, schema diffs, security scans, and policy checks. Declared `must` / `must_not` constraints, verification runners, evidence, and exceptions are **not** executed or authenticated by `gate`.

## CLI equivalent

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.13 select docs/engineering-specs \
  --base origin/main --worktree --allow-contract-only --strict
npx --yes @engineeringspec/cli@0.1.0-rc.13 check --spec-dir docs/engineering-specs \
  --base origin/main --allow-contract-only --strict
```

Both commands resolve immutable SHAs before candidate discovery. Candidate specifications are loaded from the base Git tree and approved-only eligibility is the enforcing default.

## Release / npm

- Action + git tag: `v0.1.0-rc.13` (when published) tracks package version `0.1.0-rc.13`.
- npm dist-tag: `next` identifies the current release candidate; enforcing commands above pin exact version `0.1.0-rc.13`.
