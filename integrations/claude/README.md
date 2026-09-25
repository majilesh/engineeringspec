# Claude Code

Use a one-line `CLAUDE.md` containing `@AGENTS.md`. This prevents a second, drifting policy copy. Claude should follow the shared `next -> work <contract-id> -> separately trusted repository checks -> finish <contract-id>` journey. `propose` remains available for draft generation and `review` for deterministic explanation.

Do not grant tool permission to specification-declared runner payloads merely because they appear in context.

## Edit guard hook (RFC 0014)

[`hooks/engineeringspec-guard.mjs`](hooks/engineeringspec-guard.mjs) blocks edits outside approved authority before they happen:

- **`PreToolUse`** on `Edit`, `Write`, `MultiEdit` and `NotebookEdit` runs `engineeringspec guard` for the target file and exits `2` on a denial. Claude sees the reason and should stop and ask for an authority amendment.
- **`Stop`** runs the complete-state `engineeringspec check` and exits `2` while the working state is out of scope. This catches files written through shell commands. It respects `stop_hook_active` to avoid loops.

Copy the script into the repository (for example `.claude/hooks/`) and add to `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Edit|Write|MultiEdit|NotebookEdit", "hooks": [{ "type": "command", "command": "node ${CLAUDE_PROJECT_DIR}/.claude/hooks/engineeringspec-guard.mjs" }] }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "node ${CLAUDE_PROJECT_DIR}/.claude/hooks/engineeringspec-guard.mjs" }] }
    ]
  }
}
```

The adapter is a guardrail, not an enforcement boundary: agents can still write through tools the hook doesn't see, and merge-time CI routing stays authoritative. It denies only when the trusted-base `engineering-spec.json` enforces (`standard` or `controlled`); in `advisory` mode it prints a warning and lets the edit through. `ENGINEERINGSPEC_CLI` sets the command (default `engineeringspec`, for example `npx --no-install engineeringspec`). If the guard itself can't run, the edit proceeds with a warning; set `ENGINEERINGSPEC_GUARD_FAIL_CLOSED=1` to block instead.
