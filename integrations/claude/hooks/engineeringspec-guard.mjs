#!/usr/bin/env node
// Claude Code hook adapter for `engineeringspec guard` (RFC 0014 §9).
// A guardrail, not an enforcement boundary: merge-time CI remains authoritative.
//   PreToolUse (matcher "Edit|Write|MultiEdit|NotebookEdit"): exit 2 blocks the edit.
//   Stop: runs the complete-state `check` so shell-made writes are caught before the turn ends.
// ENGINEERINGSPEC_CLI: command to run (default "engineeringspec"). ENGINEERINGSPEC_GUARD_FAIL_CLOSED=1
// blocks when the guard itself cannot run; otherwise such errors are reported and the edit proceeds.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

const event = JSON.parse(readFileSync(0, "utf8") || "{}");
const cli = (process.env.ENGINEERINGSPEC_CLI ?? "engineeringspec").split(" ").filter(Boolean);
const failClosed = process.env.ENGINEERINGSPEC_GUARD_FAIL_CLOSED === "1";
const run = (args, input) => spawnSync(cli[0], [...cli.slice(1), ...args], { cwd: event.cwd ?? process.cwd(), input, encoding: "utf8" });

function unavailable(result) {
  process.stderr.write(`EngineeringSpec guard could not run: ${result.error?.message ?? result.stderr ?? "unknown error"}\n`);
  process.exit(failClosed ? 2 : 0);
}

if (event.hook_event_name === "Stop") {
  // Avoid an endless loop when Claude is already continuing because of this hook.
  if (event.stop_hook_active) process.exit(0);
  const result = run(["check", "--format", "json"]);
  if (result.error || (result.status !== 0 && result.status !== 1)) unavailable(result);
  const report = JSON.parse(result.stdout || "{}");
  if (result.status === 1 && report.enforcement?.enforced !== false) {
    const reasons = (report.diagnostics ?? []).filter((item) => item.severity === "error").map((item) => `${item.code} ${item.message}`);
    process.stderr.write(`EngineeringSpec check failed for the complete working state:\n${reasons.join("\n")}\nRevert the out-of-scope changes or stop and request an authority amendment.\n`);
    process.exit(2);
  }
  process.exit(0);
}

const input = event.tool_input ?? {};
const file = input.file_path ?? input.notebook_path;
if (typeof file !== "string") process.exit(0); // Not a file edit: nothing to guard here.
const result = run(["guard", "--stdin", "--format", "json"], JSON.stringify({ paths: [{ path: file }] }));
if (result.error || (result.status !== 0 && result.status !== 1)) unavailable(result);
const verdict = JSON.parse(result.stdout || "{}");
if (verdict.verdict === "deny") {
  process.stderr.write(`EngineeringSpec: ${file} is outside the approved authority.\n${(verdict.reasons ?? []).join("\n")}\nDo not work around this; stop and request a reviewed authority amendment.\n`);
  process.exit(2);
}
if (verdict.verdict === "warn") process.stderr.write(`EngineeringSpec (advisory, not enforced): ${(verdict.reasons ?? []).join("; ")}\n`);
process.exit(0);
