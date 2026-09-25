# Production diff-scope gate checklist

EngineeringSpec’s `gate` is a **diff-scope gate** (path + change-type allowlist). It is not full change-control. Use this checklist so the gate is merge-blocking and not self-authorizing.

## Recommended pin (immutable Action)

Prefer a full commit SHA. This is the reviewed RC16 runtime anchor:

```text
majilesh/engineeringspec@ddf813e4e69d9b2f9a9eb3f0f241747746021cf3
```

Re-pin only to a separately reviewed immutable runtime anchor after changes to `action.yml` or Action-exercised gate semantics. The published `v0.1.0-rc.16` release-candidate tag is available, while the full reviewed SHA remains the stronger supply-chain default for production ([GitHub guidance](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions#using-third-party-actions)).

## Enforcing CI job

```yaml
engineering-spec:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0
    - uses: majilesh/engineeringspec@ddf813e4e69d9b2f9a9eb3f0f241747746021cf3
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

## Make the check merge-blocking

A failing Action does **not** block merges by itself. In **Settings → Rules → Rulesets** (or branch protection) for the default branch, enable all of the following:

| Setting | Why |
|---|---|
| **Require status checks to pass**, listing the job that runs this Action (for example `engineering-spec` or `CI / engineering-spec`) | Without it, the gate is advisory only. |
| **Require a pull request before merging** with **Require review from Code Owners** | CODEOWNERS entries block nothing unless this rule is on. |
| **Dismiss stale pull request approvals when new commits are pushed** | Stops an approval being reused after the change is widened. |
| **Require approval of the most recent reviewable push** | Stops the last pusher from approving their own final change. |

If you use merge queues, include a `merge_group` trigger on the workflow that runs this Action, or the check never runs for queued merges.

## Protect the gate's own files with CODEOWNERS

The check is only as strong as the files that configure it. `adopt --quickstart` generates these entries. For an existing repository, see [examples/adopters/CODEOWNERS.example](../examples/adopters/CODEOWNERS.example):

```text
/docs/engineering-specs/ @your-org/maintainers   # contracts and closure receipts
/.github/workflows/      @your-org/maintainers   # the workflow that runs the check
/.github/CODEOWNERS      @your-org/maintainers   # the ownership map itself
/engineering-spec.json   @your-org/maintainers   # mode, policy, and selection
```

`engineeringspec doctor` warns when any of these paths has no owner.

Keep implementation PRs on base-pinned directory routing, so that they are evaluated against already-merged approved contracts. Do not switch enforcing CI to `workspace` when a PR changes its own targets. That makes authorization self-widening. Land the reviewed contract-only PR first, then rebase or open the dependent implementation PR against that approved base.

When `gate-allow-contract-only` is enabled, the option is valid only with `gate-spec-dir`. It classifies a non-empty, strictly valid specification-directory-only diff. A mixed change or a cross-boundary rename returns to normal approved-base routing.

### Residual risk: the workflow runs from the pull request

For `pull_request` events, GitHub runs the workflow definition from the pull request's own branch. A pull request can therefore edit the workflow to skip or weaken the EngineeringSpec step while keeping the same job name, and the required check can still report success. (Deleting the workflow instead tends to leave the required check pending, not passing.) Code-owner review of `.github/workflows/` is the main mitigation, so treat workflow edits as sensitive.

Where that is not enough, and your GitHub plan supports it, run the check outside the pull request's control. One option is an organization-level ruleset that requires a centrally owned workflow; another is a check run by an externally hosted service. The exact options depend on your GitHub plan, so confirm them in GitHub's current rulesets documentation.

## What the gate does not prove

Continue running your repository’s normal tests, schema diffs, security scans, and policy checks. Declared `must` / `must_not` constraints, verification runners, evidence, and exceptions are **not** executed or authenticated by `gate`.

## CLI equivalent

```sh
npx --yes @engineeringspec/cli@0.1.0-rc.17 select docs/engineering-specs \
  --base origin/main --worktree --allow-contract-only --strict
npx --yes @engineeringspec/cli@0.1.0-rc.17 check --spec-dir docs/engineering-specs \
  --base origin/main --allow-contract-only --strict
```

Both commands resolve immutable SHAs before candidate discovery. Candidate specifications are loaded from the base Git tree and approved-only eligibility is the enforcing default.

## Release / npm

- `@engineeringspec/cli@0.1.0-rc.17` is published. npm dist-tag `next` identifies it, and `latest` still identifies `0.1.0-rc.15`. Enforcing commands above pin the exact version rather than either mutable dist-tag.
- The Action pin above is the reviewed RC16 runtime anchor. It predates RFC 0014, so it ignores `mode`, policy, selectors and receipts until a later release re-pins it.
- RFC 0014 features are on `main` and not yet in a published release.
