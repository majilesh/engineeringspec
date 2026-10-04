# Visual Verification Brief

Review changed-path scope, applicable constraints, declared verifiers, and supplied evidence in one offline HTML page.

```sh
engineeringspec review --format html > /tmp/verification-brief.html
```

Open the saved file in a browser. Place it **outside the evaluated Git worktree** so it cannot become part of its own next review. All required styles and enhancements are embedded. No server, model API, external fonts or telemetry are required. Core content remains readable without JavaScript.

HTML uses existing review options, trusted-base decisions, selectors and enforcement exit codes. A blocked scope still produces a report and fails according to its enforcement mode. Invalid evidence or other input errors return a nonzero exit without a completed HTML document. Check generation errors and file contents before sharing an output file.

## Read the brief

- **Scope decision:** authorization is separate from enforcement. Advisory enforcement can pass while authorization is false. Contract-only governance and no changed paths grant no implementation permission.
- **Changed paths:** original routing decisions, selected targets, and positive and negative claims. Denied, ambiguous and uncovered paths retain their blockers.
- **Obligation map:** actual target applicability and declared links from constraints to verifier identities. Local IDs remain separate across contracts. Missing verifiers are visible; no proof relationship is inferred.
- **Evidence checklist:** declarations and supplied states. A declaration without evidence is `declared`, not a failed check. A supplied `passed` state is a reported assertion, not proof of execution or correctness.
- **Provenance:** trusted base, head, path-change digest, evaluation scope, contract paths, revisions and full evidence-binding digests. Routing claim digests retain their distinct lifecycle-independent meaning.

Search filters the path table and evidence checklist; obligations and diagnostics remain complete. Decision and evidence-state filters apply to their respective sections. Keyboard controls, textual status labels, light/dark themes, expandable details and print styles are included. Printing includes filtered entries and provenance.

## Supply evidence

```sh
engineeringspec review --format html \
  --evidence /tmp/payment-evidence.json \
  --evidence /tmp/customer-evidence.json \
  > /tmp/verification-brief.html
```

Each file uses the existing implementation-evidence envelope for one selected or standing contract:

```json
{
  "authority": {
    "baseSha": "<full checked base SHA>",
    "contractId": "ES-example",
    "specRevision": 1,
    "semanticDigest": "sha256:<full normalized contract digest>"
  },
  "changeDigest": "sha256:<checked path-change digest>",
  "verification": [
    {
      "verifierId": "VER-example",
      "state": "passed",
      "artifact": "results/tests.json",
      "digest": "sha256:<digest from your trusted evidence producer>",
      "note": "Reported by the separately trusted test process"
    }
  ]
}
```

Replace placeholders with actual checked identities. The page's embedded `verification-brief` JSON and provenance provide the contract identity. The library `buildVerificationBrief` returns the same versioned model, described by [its schema](../schemas/verification-brief-0.1.schema.json). Do not substitute a routing claim's lifecycle-independent digest for the full normalized contract digest.

Allowed states: `declared`, `mapped`, `attempted`, `passed`, `failed`, `rejected`, `not_run`. Attempted, passed and failed states require an artifact locator and lowercase SHA-256 digest. The brief does not read or hash artifacts, follow locators, authenticate producers, execute checks or verify signatures.

Inputs must be regular files of at most 1 MiB. Missing or mismatched bindings, unknown verifiers, invalid states, duplicate contract envelopes, duplicate verifier entries, malformed JSON and incomplete attempted/pass/fail entries are rejected. Supplied entries for declared verifiers outside the applicable obligation view are accepted and counted as outside that projection. `--evidence` is rejected with other output formats, even when quiet.

**The path-change digest binds changed paths and change kinds, not implementation bytes.** Editing contents while retaining the changed path set can retain that digest. Reported evidence cannot establish that current contents were tested. Run separately trusted verification and review its artifact provenance; this view preserves the current evidence format's limits.

## Complete and partial evaluation

The default uses the existing complete-working-state review. `--staged`, `--no-worktree`, and explicit `--changed` inputs are prominently labelled partial. Omitted changes are not covered. This is a static observation: regenerate after changes.

The report can expose private paths, constraints and evidence notes. Review it before sharing. Nothing is uploaded or published automatically. Repository paths and artifact locators remain escaped inert text under a restrictive content security policy.

See [RFC 0015](../rfcs/0015-visual-verification-brief.md) for the presentation boundary and [CLI reference](cli-reference.md) for review options. The brief grants no authority, executes no verifiers, and makes no measured productivity or ASD-STE100 compliance claim.
