---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-brace-expansion-remediation
title: Remediate brace-expansion dependency advisories
status: implemented
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
---

# Remediate brace-expansion dependency advisories

Restore the high-severity dependency audit by updating vulnerable transitive brace-expansion packages within their existing compatible major versions. This contract-only change records maintainer authorization to resolve the dependency blocker before Visual Verification Brief implementation. Approval grants no implementation permission until merged into the trusted base.

## Source intent

```engineering-source-refs
- id: SRC-AUDIT
  type: other
  uri: https://github.com/majilesh/engineeringspec/actions/runs/37240279325
  title: Contract PR 157 audit failure on existing locked brace-expansion packages
- id: SRC-ADVISORY
  type: other
  uri: https://github.com/advisories/GHSA-qhr7-859c-m2p7
  title: Nested brace group recursion denial of service
- id: SRC-REWRITE
  type: other
  uri: https://github.com/advisories/GHSA-q2hr-2g5m-vwhr
  title: Quadratic brace rewrite denial of service
- id: SRC-COMMA
  type: other
  uri: https://github.com/advisories/GHSA-6j4f-fj2g-mc7p
  title: Comma group recursion denial of service
```

## Targets

```engineering-targets
- id: TARGET-LOCK
  paths: [package-lock.json]
  change_policy: modify
- id: TARGET-BUNDLE
  paths: [action/cli.mjs]
  change_policy: modify
- id: TARGET-NOTES
  paths: [CHANGELOG.md]
  change_policy: modify
- id: TARGET-CLOSE
  paths: [docs/engineering-specs/ES-brace-expansion-remediation.engineering-spec.md]
  change_policy: modify
```

## Constraints

```engineering-constraints
- id: CON-PATCH
  level: must
  statement: Update only brace-expansion and unavoidable lockfile metadata within the existing dependency graph and semver-compatible major lines, at minimum 1.1.21, 2.1.7, and 5.0.12 where installed; do not change direct dependency ranges, package identity, or upgrade Vitest.
  applies_to: [TARGET-LOCK]
  enforcement: { kind: review, reviewer_role: security-maintainer }
- id: CON-AUDIT
  level: must
  statement: A clean npm ci and npm audit --audit-level=high must succeed, with remaining moderate advisories reported honestly and no advisory suppression or audit-level weakening.
  applies_to: [TARGET-LOCK]
  enforcement: { kind: test, verifier_ref: VER-AUDIT }
- id: CON-COMPATIBILITY
  level: must
  statement: Existing lint, typecheck, full tests, conformance, build, demo, and package-content checks must pass; routing and target matching must preserve existing semantics.
  applies_to: [TARGET-LOCK, TARGET-BUNDLE]
  enforcement: { kind: test, verifier_ref: VER-REPOSITORY }
- id: CON-BUNDLE
  level: must
  statement: Regenerate the committed Action bundle from the unchanged reviewed source and updated dependency graph using the existing build script; the Action consistency check must pass and its execution or authorization behavior must not be widened.
  applies_to: [TARGET-BUNDLE]
  enforcement: { kind: test, verifier_ref: VER-BUNDLE }
- id: CON-SCOPE
  level: must_not
  statement: Do not change runtime source, core formats, schemas, CI configuration, Action inputs, package.json, trusted verifier policy, or feature implementation; specification runners remain inert.
  applies_to: [TARGET-LOCK, TARGET-BUNDLE, TARGET-NOTES, TARGET-CLOSE]
  enforcement: { kind: review, reviewer_role: repository-maintainer }
- id: CON-CLOSE
  level: must
  statement: After trusted checks and complete-working-state routing pass, only the exact approved-to-implemented lifecycle close may accompany this dependency implementation.
  applies_to: [TARGET-CLOSE]
  enforcement: { kind: review, reviewer_role: repository-maintainer }
```

## Verification

```engineering-verification
- id: VER-AUDIT
  kind: security
  proves: [CON-AUDIT]
  runner: { type: reference, reference: Separately trusted clean npm ci and high-severity npm audit }
- id: VER-REPOSITORY
  kind: test
  proves: [CON-COMPATIBILITY]
  runner: { type: reference, reference: Separately trusted lint and typecheck and full tests and conformance and build and demo and package-content checks plus complete-working-state check }
- id: VER-BUNDLE
  kind: test
  proves: [CON-BUNDLE]
  runner: { type: reference, reference: Existing generated Action bundle consistency check }
- id: VER-REVIEW
  kind: human_review
  proves: [CON-PATCH, CON-SCOPE, CON-CLOSE]
  runner: { type: manual, reference: Review compatible transitive patches and unchanged source and exact lifecycle close }
```

## Rollout

```engineering-rollout
strategy: manual
steps:
  - Merge this approved contract-only authority before changing dependencies.
  - Load next and work against the new trusted base and stop if implementation permission is absent.
  - Update only the affected compatible transitive packages and regenerate the Action bundle.
  - Run all separately trusted repository checks and audit and complete-working-state routing before exact lifecycle closure.
  - Merge the dependency implementation after all CI checks pass, then rebase and verify the Visual Verification Brief authority PR.
rollback:
  actions:
    - Revert dependency implementation if compatibility regresses and retain the audit failure visibly until another reviewed remedy exists.
  owner: EngineeringSpec maintainers
```
