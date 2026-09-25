#!/usr/bin/env node
// Cursor hook adapter for `engineeringspec guard` (RFC 0014 §9).
// A guardrail, not an enforcement boundary: merge-time CI remains authoritative.
//   preToolUse (Write, Delete): answers {"permission":"allow"|"deny"} before the edit.
// Cursor's stop hook cannot block, so shell-made writes are left to `engineeringspec check` and CI.
// ENGINEERINGSPEC_CLI: command to run (default "engineeringspec"). ENGINEERINGSPEC_GUARD_FAIL_CLOSED=1
// denies when the guard itself cannot run. Cursor treats invalid JSON as a denial, so every path prints JSON.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

const event = JSON.parse(readFileSync(0, "utf8") || "{}");
const cli = (process.env.ENGINEERINGSPEC_CLI ?? "engineeringspec").split(" ").filter(Boolean);
const failClosed = process.env.ENGINEERINGSPEC_GUARD_FAIL_CLOSED === "1";
const answer = (permission, message) => {
  process.stdout.write(JSON.stringify({ permission, ...(message ? { user_message: message, agent_message: message } : {}) }));
  process.exit(0);
};

const input = event.tool_input ?? {};
const file = input.file_path ?? input.path ?? input.target_file;
if (typeof file !== "string") answer("allow");
const kind = event.tool_name === "Delete" ? "deleted" : undefined;
const result = spawnSync(cli[0], [...cli.slice(1), "guard", "--stdin", "--format", "json"], {
  cwd: event.cwd ?? process.cwd(),
  input: JSON.stringify({ paths: [{ path: file, ...(kind ? { kind } : {}) }] }),
  encoding: "utf8",
});
if (result.error || (result.status !== 0 && result.status !== 1)) {
  answer(failClosed ? "deny" : "allow", `EngineeringSpec guard could not run: ${result.error?.message ?? result.stderr ?? "unknown error"}`);
}
const verdict = JSON.parse(result.stdout || "{}");
if (verdict.verdict === "deny") answer("deny", `${file} is outside approved EngineeringSpec authority: ${(verdict.reasons ?? []).join("; ")}. Stop and request a reviewed authority amendment.`);
answer("allow", verdict.verdict === "warn" ? `EngineeringSpec (advisory, not enforced): ${(verdict.reasons ?? []).join("; ")}` : undefined);
