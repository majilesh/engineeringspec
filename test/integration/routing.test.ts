import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { selectSpecs } from "../../src/routing/select.js";

function runGit(root: string, args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
}

function document(options: { id: string; target: string; status?: string; policy?: string; runner?: string }): string {
  return `---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ${options.id}
title: ${options.id}
status: ${options.status ?? "approved"}
owners: [{team: test}]
---

# ${options.id}

\`\`\`engineering-source-refs
- id: SRC-1
  type: document
  ref: test
\`\`\`

\`\`\`engineering-targets
- id: TARGET-1
  paths: [${options.target}]
  change_policy: ${options.policy ?? "modify"}
\`\`\`

\`\`\`engineering-constraints
- id: CON-1
  level: must
  statement: Test constraint
  enforcement: {kind: test, verifier_ref: VER-1}
\`\`\`

\`\`\`engineering-verification
- id: VER-1
  proves: [CON-1]
  kind: test
  runner:
    type: command
    argv: [${options.runner ?? "echo"}, inert]
\`\`\`
`;
}

async function repository(policy = "modify"): Promise<{ root: string; baseSha: string; marker: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "es-routing-"));
  const marker = path.join(root, "runner-executed");
  await mkdir(path.join(root, "specs"));
  await mkdir(path.join(root, "src"));
  await writeFile(path.join(root, "specs", "change.engineering-spec.md"), document({ id: "ES-change", target: "src/**", policy, runner: marker }));
  await writeFile(path.join(root, "src", "a.ts"), "export {};\n");
  runGit(root, ["init", "-q"]);
  runGit(root, ["add", "."]);
  runGit(root, ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "base"]);
  return { root, baseSha: runGit(root, ["rev-parse", "HEAD"]), marker };
}

describe("Git-tree multi-spec routing", () => {
  it("accepts a strictly validated lifecycle-only change only when explicitly enabled", async () => {
    const { root, baseSha } = await repository();
    const file = path.join(root, "specs", "change.engineering-spec.md");
    await writeFile(file, (await readFile(file, "utf8")).replace("status: approved", "status: implemented"));

    const legacy = await selectSpecs({ directory: "specs", base: baseSha, cwd: root, strict: true });
    expect(legacy.valid).toBe(false);
    expect(legacy.governance.classification).toBe("implementation");
    expect(legacy.diagnostics.some((item) => item.code === "ESRT002")).toBe(true);

    const governance = await selectSpecs({ directory: "specs", base: baseSha, cwd: root, strict: true, allowContractOnly: true });
    expect(governance.valid).toBe(true);
    expect(governance.routes).toEqual([]);
    expect(governance.governance).toMatchObject({
      enabled: true,
      classification: "contract_only",
      lifecycleOnly: true,
      transitions: [{ path: "specs/change.engineering-spec.md", from: "approved", to: "implemented" }],
    });
  });

  it("keeps mixed changes and invalid workspace governance fail closed", async () => {
    const { root, baseSha } = await repository();
    const file = path.join(root, "specs", "change.engineering-spec.md");
    await writeFile(file, (await readFile(file, "utf8")).replace("status: approved", "status: implemented"));
    await writeFile(path.join(root, "outside.ts"), "export {};\n");
    const mixed = await selectSpecs({ directory: "specs", base: baseSha, cwd: root, strict: true, allowContractOnly: true });
    expect(mixed.valid).toBe(false);
    expect(mixed.governance.classification).toBe("implementation");
    expect(mixed.diagnostics.some((item) => item.code === "ESRT002")).toBe(true);

    await unlink(path.join(root, "outside.ts"));
    await writeFile(file, "# invalid\n");
    const invalid = await selectSpecs({ directory: "specs", base: baseSha, cwd: root, strict: true, allowContractOnly: true });
    expect(invalid.valid).toBe(false);
    expect(invalid.governance.classification).toBe("contract_only");
    expect(invalid.governance.workspaceErrors).toBeGreaterThan(0);
  });

  it("treats workspace governance warnings as failures only in strict mode", async () => {
    const { root, baseSha } = await repository();
    const file = path.join(root, "specs", "change.engineering-spec.md");
    const source = await readFile(file, "utf8");
    await writeFile(file, source.replace(
      "- id: TARGET-1\n  paths: [src/**]\n  change_policy: modify",
      "- id: TARGET-1\n  paths: [src/**]\n  change_policy: modify\n- id: TARGET-2\n  paths: [src/private/**]\n  change_policy: read_only",
    ));
    const loose = await selectSpecs({ directory: "specs", base: baseSha, cwd: root, allowContractOnly: true });
    const strict = await selectSpecs({ directory: "specs", base: baseSha, cwd: root, strict: true, allowContractOnly: true });
    expect(loose.valid).toBe(true);
    expect(loose.governance.workspaceWarnings).toBeGreaterThan(0);
    expect(strict.valid).toBe(false);
  });

  it("returns a valid not-applicable result after all base contracts close", async () => {
    const { root } = await repository();
    await writeFile(path.join(root, "specs", "change.engineering-spec.md"), document({ id: "ES-change", target: "src/**", status: "implemented" }));
    runGit(root, ["add", "."]);
    runGit(root, ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "close contract"]);
    const report = await selectSpecs({ directory: "specs", base: "HEAD", cwd: root, changed: [], strict: true });
    expect(report.valid).toBe(true);
    expect(report.changed).toEqual([]);
    expect(report.routes).toEqual([]);
    expect(report.coverage).toEqual({ status: "not_applicable", specs: [] });
    expect(report.candidates).toMatchObject([{ specId: "ES-change", status: "implemented", eligible: false }]);
  });

  it("loads candidates only from the resolved base and keeps runners inert", async () => {
    const { root, baseSha, marker } = await repository();
    await unlink(path.join(root, "specs", "change.engineering-spec.md"));
    await writeFile(path.join(root, "specs", "injected.engineering-spec.md"), document({ id: "ES-injected", target: "src/**" }));
    const report = await selectSpecs({
      directory: "specs",
      base: baseSha,
      cwd: root,
      changed: [{ path: "src/a.ts", kind: "modified" }],
      strict: true,
    });
    expect(report.valid).toBe(true);
    expect(report.candidates.map((item) => item.specId)).toEqual(["ES-change"]);
    expect(report.candidates[0]?.digest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(report.routes[0]?.selected?.specId).toBe("ES-change");
    await expect(readFile(marker, "utf8")).rejects.toThrow();
  });

  it("fails when any base candidate is invalid before status filtering", async () => {
    const { root } = await repository();
    await writeFile(path.join(root, "specs", "invalid.engineering-spec.md"), "# invalid\n");
    runGit(root, ["add", "."]);
    runGit(root, ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "invalid candidate"]);
    const report = await selectSpecs({
      directory: "specs",
      base: "HEAD",
      cwd: root,
      changed: [{ path: "src/a.ts", kind: "modified" }],
    });
    expect(report.valid).toBe(false);
    expect(report.routes).toEqual([]);
    expect(report.diagnostics.some((item) => item.severity === "error")).toBe(true);
  });

  it("treats routing warnings as failures only in strict mode", async () => {
    const { root } = await repository("interface_only");
    const options = { directory: "specs", base: "HEAD", cwd: root, changed: [{ path: "src/a.ts", kind: "modified" as const }] };
    const loose = await selectSpecs(options);
    const strict = await selectSpecs({ ...options, strict: true });
    expect(loose.valid).toBe(true);
    expect(loose.diagnostics.some((item) => item.code === "ESG006")).toBe(true);
    expect(strict.valid).toBe(false);
  });
});
