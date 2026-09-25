# Cursor

The generated `.cursor/rules/engineering-spec.mdc` is always applied and delegates to `AGENTS.md`. Keep project-specific workflow rules in `AGENTS.md`; keep the Cursor file as a thin discovery adapter.

Use the shared `next -> work <contract-id> -> separately trusted repository checks -> finish <contract-id>` journey from `AGENTS.md`. `review --format markdown` remains available when a lower-level human-readable report is useful.

## Edit guard hook (RFC 0014)

[`hooks/engineeringspec-guard.mjs`](hooks/engineeringspec-guard.mjs) handles `preToolUse` for `Write` and `Delete`. It answers `{"permission":"allow"|"deny"}` with a message for both the user and the agent, and it always prints valid JSON, because Cursor treats invalid JSON as a denial. Cursor's `stop` hook cannot block, so run `engineeringspec check` before finishing, and rely on CI.

Copy the script into the repository (for example `.cursor/hooks/`) and add to `.cursor/hooks.json`:

```json
{
  "version": 1,
  "hooks": {
    "preToolUse": [{ "command": "node .cursor/hooks/engineeringspec-guard.mjs" }]
  }
}
```

The adapter is a guardrail, not an enforcement boundary: agents can still write through tools the hook doesn't see, and merge-time CI routing stays authoritative. It denies only when the trusted-base `engineering-spec.json` enforces (`standard` or `controlled`); in `advisory` mode it prints a warning and lets the edit through. `ENGINEERINGSPEC_CLI` sets the command (default `engineeringspec`, for example `npx --no-install engineeringspec`). If the guard itself can't run, the edit proceeds with a warning; set `ENGINEERINGSPEC_GUARD_FAIL_CLOSED=1` to block instead.
