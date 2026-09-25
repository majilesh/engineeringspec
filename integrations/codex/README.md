# Codex

Codex automatically reads repository `AGENTS.md` guidance. Keep the generated lifecycle block there and optionally install the portable [`engineering-spec` skill](../../skills/engineering-spec/SKILL.md).

Ask Codex to use `next`, then `work <contract-id>` before consequential edits, run separately trusted repository checks, and use `finish <contract-id>` before completion. The skill is guidance, not extra authority; base-pinned approved contracts remain the only implementation authority.

## Edit guard hook (RFC 0014, unreleased)

[`hooks/engineeringspec-guard.mjs`](hooks/engineeringspec-guard.mjs) handles `PreToolUse` for `apply_patch`. It reads the `*** Add/Update/Delete File:` and `*** Move to:` headers from `tool_input.command`, checks every path with `engineeringspec guard`, and returns `permissionDecision: "deny"` when any path is outside approved authority. On `Stop` it reports complete-state `check` failures to stderr but does not block. Shell commands are left to that check and to CI.

Copy the script into the repository (for example `.codex/hooks/`) and add to `.codex/hooks.json`:

```json
{
  "hooks": {
    "PreToolUse": [{ "matcher": "apply_patch", "hooks": [{ "type": "command", "command": "node .codex/hooks/engineeringspec-guard.mjs" }] }],
    "Stop": [{ "hooks": [{ "type": "command", "command": "node .codex/hooks/engineeringspec-guard.mjs" }] }]
  }
}
```

The adapter is a guardrail, not an enforcement boundary: agents can still write through tools the hook doesn't see, and merge-time CI routing stays authoritative. It denies only when the trusted-base `engineering-spec.json` enforces (`standard` or `controlled`); in `advisory` mode it prints a warning and lets the edit through. `ENGINEERINGSPEC_CLI` sets the command (default `engineeringspec`, for example `npx --no-install engineeringspec`). If the guard itself can't run, the edit proceeds with a warning; set `ENGINEERINGSPEC_GUARD_FAIL_CLOSED=1` to block instead.
