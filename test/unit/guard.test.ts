import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { guardChange } from "../../src/cli/guard.js";
import { guardVerdict } from "../../src/guard/guard.js";

const CLI = fileURLToPath(new URL("../../dist/cli.js", import.meta.url));
const ADAPTER = (vendor: string) => fileURLToPath(new URL(`../../integrations/${vendor}/hooks/engineeringspec-guard.mjs`, import.meta.url));

async function repository(mode: "standard" | "advisory"): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "es-guard-"));
  await mkdir(path.join(root, "specs"));
  await mkdir(path.join(root, "src"));
  await writeFile(path.join(root, "engineering-spec.json"), JSON.stringify({ specDirectory: "specs", strict: false, trustedBase: "HEAD", mode }));
  // The declared runner would create a file if anything executed it; the guard must not.
  await writeFile(path.join(root, "specs", "ES-a.engineering-spec.md"), `---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-a
title: A
status: approved
owners: [{team: t}]
---

\`\`\`engineering-source-refs
- {id: SRC-1, type: other, ref: fixture}
\`\`\`

\`\`\`engineering-targets
- {id: TARGET-1, paths: ["src/**"], change_policy: modify}
\`\`\`

\`\`\`engineering-constraints
- {id: CON-1, level: must, statement: Safe., enforcement: {kind: test, verifier_ref: VER-1}}
\`\`\`

\`\`\`engineering-verification
- {id: VER-1, proves: [CON-1], kind: test, runner: {type: command, argv: [touch, RUNNER-EXECUTED]}}
\`\`\`
`);
  execFileSync("git", ["-C", root, "init", "-q"]);
  execFileSync("git", ["-C", root, "add", "."]);
  execFileSync("git", ["-C", root, "-c", "user.name=T", "-c", "user.email=t@t", "commit", "-qm", "base"]);
  execFileSync("git", ["-C", root, "config", "engineeringspec.trustedBase", "HEAD"]);
  return root;
}

function adapter(vendor: string, root: string, event: Record<string, unknown>, env: Record<string, string> = {}) {
  return spawnSync(process.execPath, [ADAPTER(vendor)], {
    input: JSON.stringify({ cwd: root, ...event }),
    encoding: "utf8",
    env: { ...process.env, ENGINEERINGSPEC_CLI: `${process.execPath} ${CLI}`, ...env },
  });
}

describe("guard verdict", () => {
  it("denies only when enforced and warns in advisory mode", () => {
    const routes = [{ path: "lib/x.ts", kind: "added" as const, decision: "uncovered" as const, allows: [], denies: [], claims: [] }];
    const diagnostics = [{ code: "ESRT002", severity: "error" as const, message: "uncovered" }];
    expect(guardVerdict({ valid: false, routes, diagnostics, enforcement: { mode: "standard", outcome: "fail", enforced: true } }).verdict).toBe("deny");
    expect(guardVerdict({ valid: false, routes, diagnostics, enforcement: { mode: "advisory", outcome: "pass", enforced: false } }).verdict).toBe("warn");
    expect(guardVerdict({ valid: true, routes: [], diagnostics: [], enforcement: { mode: "legacy", outcome: "pass", enforced: true } }).verdict).toBe("allow");
  });

  it("evaluates proposed paths read-only and never executes declared runners", async () => {
    const root = await repository("standard");
    const before = execFileSync("git", ["-C", root, "status", "--porcelain"], { encoding: "utf8" });
    const result = await guardChange({ cwd: root, paths: [{ path: path.join(root, "src", "a.ts") }, { path: "lib/x.ts" }, { path: "/etc/hosts" }] });
    expect(result.verdict).toBe("deny");
    expect(result.paths.map((item) => [item.path, item.allow])).toEqual([["lib/x.ts", false], ["src/a.ts", true]]);
    expect(result.ignored).toEqual(["/etc/hosts"]);
    expect(execFileSync("git", ["-C", root, "status", "--porcelain"], { encoding: "utf8" })).toBe(before);
    expect(existsSync(path.join(root, "RUNNER-EXECUTED"))).toBe(false);
  });
});

describe("vendor hook adapters", () => {
  it("Claude Code: blocks out-of-scope edits with exit 2 and checks the complete state on Stop", async () => {
    const root = await repository("standard");
    const edit = (file: string) => adapter("claude", root, { hook_event_name: "PreToolUse", tool_name: "Edit", tool_input: { file_path: path.join(root, file) } });
    expect(edit("src/a.ts").status).toBe(0);
    const blocked = edit("lib/x.ts");
    expect(blocked.status).toBe(2);
    expect(blocked.stderr).toMatch(/outside the approved authority/u);
    expect(adapter("claude", root, { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "echo hi > lib/x.ts" } }).status).toBe(0);
    await mkdir(path.join(root, "lib"));
    await writeFile(path.join(root, "lib", "x.ts"), "export {};\n");
    expect(adapter("claude", root, { hook_event_name: "Stop", stop_hook_active: false }).status).toBe(2);
    expect(adapter("claude", root, { hook_event_name: "Stop", stop_hook_active: true }).status).toBe(0);
  });

  it("Codex: denies apply_patch envelopes that touch unauthorized paths", async () => {
    const root = await repository("standard");
    const patch = (body: string) => adapter("codex", root, { hook_event_name: "PreToolUse", tool_name: "apply_patch", tool_input: { command: `*** Begin Patch\n${body}\n*** End Patch` } });
    const allowed = patch("*** Update File: src/a.ts\n@@\n-a\n+b");
    expect(allowed.status).toBe(0);
    expect(allowed.stdout).toBe("");
    const denied = patch("*** Add File: src/ok.ts\n+x\n*** Add File: lib/x.ts\n+y");
    expect(JSON.parse(denied.stdout)).toMatchObject({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny" } });
  });

  it("Cursor: answers preToolUse with permission JSON and honors fail-closed", async () => {
    const root = await repository("standard");
    const write = (file: string, env: Record<string, string> = {}) => adapter("cursor", root, { hook_event_name: "preToolUse", tool_name: "Write", tool_input: { file_path: path.join(root, file) } }, env);
    expect(JSON.parse(write("src/a.ts").stdout)).toEqual({ permission: "allow" });
    expect(JSON.parse(write("lib/x.ts").stdout)).toMatchObject({ permission: "deny" });
    expect(JSON.parse(write("lib/x.ts", { ENGINEERINGSPEC_CLI: "/nonexistent/engineeringspec" }).stdout)).toMatchObject({ permission: "allow" });
    expect(JSON.parse(write("lib/x.ts", { ENGINEERINGSPEC_CLI: "/nonexistent/engineeringspec", ENGINEERINGSPEC_GUARD_FAIL_CLOSED: "1" }).stdout)).toMatchObject({ permission: "deny" });
  });

  it("never blocks in advisory repositories", async () => {
    const root = await repository("advisory");
    const edit = adapter("claude", root, { hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: path.join(root, "lib", "x.ts") } });
    expect(edit.status).toBe(0);
    expect(edit.stderr).toMatch(/advisory, not enforced/u);
  });
});
