#!/usr/bin/env node
// Codex hook adapter for `engineeringspec guard` (RFC 0014 §9).
// A guardrail, not an enforcement boundary: merge-time CI remains authoritative.
//   PreToolUse (matcher "apply_patch"): denies patches touching paths outside approved authority.
//   Stop: reports complete-state `check` failures, including shell-made writes, to stderr.
// ENGINEERINGSPEC_CLI: command to run (default "engineeringspec"). ENGINEERINGSPEC_GUARD_FAIL_CLOSED=1
// denies when the guard itself cannot run; otherwise such errors are reported and the call proceeds.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

const event = JSON.parse(readFileSync(0, "utf8") || "{}");
const cli = (process.env.ENGINEERINGSPEC_CLI ?? "engineeringspec").split(" ").filter(Boolean);
const failClosed = process.env.ENGINEERINGSPEC_GUARD_FAIL_CLOSED === "1";
const run = (args, input) => spawnSync(cli[0], [...cli.slice(1), ...args], { cwd: event.cwd ?? process.cwd(), input, encoding: "utf8" });
const deny = (reason) => {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason } }));
  process.exit(0);
};

/** Paths from an apply_patch envelope: Add/Update/Delete File headers and Move to targets. */
export function patchPaths(patch) {
  const paths = [];
  for (const line of String(patch).split(/\r?\n/u)) {
    const match = /^\*\*\* (Add|Update|Delete) File: (.+)$/u.exec(line) ?? /^\*\*\* (Move) to: (.+)$/u.exec(line);
    if (!match) continue;
    const kind = match[1] === "Add" || match[1] === "Move" ? "added" : match[1] === "Delete" ? "deleted" : "modified";
    paths.push({ path: match[2].trim(), kind });
  }
  return paths;
}

if (event.hook_event_name === "Stop") {
  const result = run(["check", "--format", "json"]);
  if (result.status === 1) process.stderr.write("EngineeringSpec check failed for the complete working state; revert out-of-scope changes before finishing.\n");
  process.exit(0);
}

if (event.tool_name !== "apply_patch") process.exit(0); // Shell commands are covered by the Stop check and CI.
const paths = patchPaths(event.tool_input?.command ?? "");
if (paths.length === 0) process.exit(0);
const result = run(["guard", "--stdin", "--format", "json"], JSON.stringify({ paths }));
if (result.error || (result.status !== 0 && result.status !== 1)) {
  const message = `EngineeringSpec guard could not run: ${result.error?.message ?? result.stderr ?? "unknown error"}`;
  if (failClosed) deny(message);
  process.stderr.write(`${message}\n`);
  process.exit(0);
}
const verdict = JSON.parse(result.stdout || "{}");
if (verdict.verdict === "deny") deny(`Outside approved EngineeringSpec authority: ${(verdict.reasons ?? []).join("; ")}. Stop and request a reviewed authority amendment.`);
if (verdict.verdict === "warn") process.stderr.write(`EngineeringSpec (advisory, not enforced): ${(verdict.reasons ?? []).join("; ")}\n`);
process.exit(0);
