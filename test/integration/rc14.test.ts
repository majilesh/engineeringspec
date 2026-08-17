import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { finishContract } from "../../src/cli/finish.js";
import { nextAction } from "../../src/cli/next.js";
import { workOnContract } from "../../src/cli/work.js";

const CONTRACT = `---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-rc14-test
title: RC14 integration
status: approved
owners: [{team: test}]
---

\`\`\`engineering-source-refs
- {id: SRC-1, type: other, ref: test}
\`\`\`
\`\`\`engineering-targets
- {id: TARGET-1, paths: [src/**], change_policy: modify}
\`\`\`
\`\`\`engineering-constraints
- {id: CON-1, level: must, statement: Safe, enforcement: {kind: test, verifier_ref: VER-1}}
\`\`\`
\`\`\`engineering-verification
- id: VER-1
  proves: [CON-1]
  kind: test
  runner: {type: command, argv: [must-never-run, secret-payload]}
\`\`\`
`;

async function repository(source = CONTRACT): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "es-rc14-"));
  await mkdir(path.join(root, "specs"));
  await mkdir(path.join(root, "src"));
  await writeFile(path.join(root, "specs", "change.engineering-spec.md"), source);
  await writeFile(path.join(root, "src", "change.ts"), "export const value = 1;\n");
  await writeFile(path.join(root, "engineering-spec.json"), JSON.stringify({ specDirectory: "specs", strict: true, trustedBase: "HEAD", trustedVerifiers: { "ES-rc14-test#VER-1": { argv: ["must-not-run"] } } }));
  execFileSync("git", ["init", "-q", root]);
  execFileSync("git", ["-C", root, "config", "engineeringspec.trustedBase", "HEAD"]);
  execFileSync("git", ["-C", root, "add", "."]);
  execFileSync("git", ["-C", root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "base"]);
  return root;
}

describe("RC14 minimum-ceremony workflow", () => {
  it("keeps next commands coherent across every lifecycle state", async () => {
    const none = await nextAction({ cwd: await repository(CONTRACT.replace("status: approved", "status: implemented")) });
    expect(none).toMatchObject({ workflowState: "explore", permission: "none", command: "Explore intent and identify explicit paths before proposing authority." });

    const draft = await nextAction({ cwd: await repository(CONTRACT.replace("status: approved", "status: draft")) });
    expect(draft).toMatchObject({ workflowState: "propose", permission: "none", command: "Complete and review the existing draft contract." });

    const proposed = await nextAction({ cwd: await repository(CONTRACT.replace("status: approved", "status: proposed")) });
    expect(proposed).toMatchObject({ workflowState: "approve", permission: "none", command: "Review and merge the existing contract-only proposal." });

    const approvedRoot = await repository();
    const approved = await nextAction({ cwd: approvedRoot });
    expect(approved).toMatchObject({ workflowState: "implement", permission: "implementation", command: "engineeringspec work ES-rc14-test" });

    const multipleRoot = await repository(CONTRACT.replace("status: approved", "status: draft"));
    await writeFile(
      path.join(multipleRoot, "specs", "other.engineering-spec.md"),
      CONTRACT.replaceAll("ES-rc14-test", "ES-rc14-other").replace("status: approved", "status: proposed"),
    );
    execFileSync("git", ["-C", multipleRoot, "add", "."]);
    execFileSync("git", ["-C", multipleRoot, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "multiple proposals"]);
    const multiple = await nextAction({ cwd: multipleRoot });
    expect(multiple).toMatchObject({ workflowState: "explore", permission: "none", command: "Explore intent and identify explicit paths before proposing authority." });

    const multipleApprovedRoot = await repository();
    await writeFile(
      path.join(multipleApprovedRoot, "specs", "other.engineering-spec.md"),
      CONTRACT.replaceAll("ES-rc14-test", "ES-rc14-other").replace("[src/**]", "[other/**]"),
    );
    execFileSync("git", ["-C", multipleApprovedRoot, "add", "."]);
    execFileSync("git", ["-C", multipleApprovedRoot, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "multiple approvals"]);
    const multipleApproved = await nextAction({ cwd: multipleApprovedRoot });
    expect(multipleApproved).toMatchObject({
      workflowState: "implement",
      permission: "none",
      command: "Choose the intended approved contract before requesting implementation permission.",
    });

    await writeFile(path.join(approvedRoot, "src", "change.ts"), "export const value = 2;\n");
    const verify = await nextAction({ cwd: approvedRoot });
    expect(verify).toMatchObject({ workflowState: "verify", permission: "none", command: "engineeringspec finish ES-rc14-test" });

    const closeRoot = await repository();
    await writeFile(
      path.join(closeRoot, "specs", "change.engineering-spec.md"),
      CONTRACT.replace("status: approved", "status: implemented"),
    );
    const close = await nextAction({ cwd: closeRoot });
    expect(close).toMatchObject({ workflowState: "close", permission: "none", command: "Review and merge the exact lifecycle-only closure." });

    for (const report of [none, draft, proposed, multiple, multipleApproved, verify, close]) {
      expect(report.command).not.toMatch(/^engineeringspec work\b/u);
    }
  });

  it("uses zero-flag trusted defaults and finishes with a safe monotonic close", async () => {
    const root = await repository();
    const next = await nextAction({ cwd: root });
    expect(next).toMatchObject({
      valid: true,
      analysisValid: true,
      workflowState: "implement",
      permission: "implementation",
      command: "engineeringspec work ES-rc14-test",
    });
    const work = await workOnContract({ contractId: "ES-rc14-test", cwd: root });
    expect(work).toMatchObject({ result: "ready", brief: { permission: "implementation" } });
    expect(JSON.stringify(work)).not.toContain("secret-payload");

    await writeFile(path.join(root, "src", "change.ts"), "export const value = 2;\n");
    const finish = await finishContract({ contractId: "ES-rc14-test", cwd: root, writeClosure: true });
    expect(finish).toMatchObject({ result: "ready", closureWritten: true, review: { classification: "implementation_with_monotonic_close" } });
    expect(finish.receipt).toMatchObject({ change: { completeWorkingState: true }, verification: [{ verifierId: "VER-1", state: "mapped" }] });
    expect(finish.pr?.body).toContain("Declared specification runners were not executed");
    expect(JSON.stringify(finish)).not.toContain("secret-payload");
    expect(await readFile(path.join(root, "specs", "change.engineering-spec.md"), "utf8")).toContain("status: implemented");
  });

  it("rejects external evidence for undeclared verifier identities", async () => {
    const root = await repository();
    await writeFile(path.join(root, "src", "change.ts"), "export const value = 2;\n");
    const evidence = path.join(await mkdtemp(path.join(os.tmpdir(), "es-evidence-")), "evidence.json");
    await writeFile(evidence, '{"authority":{},"changeDigest":"wrong","verification":[{"verifierId":"VER-UNKNOWN","state":"passed"}]}');
    await expect(finishContract({ contractId: "ES-rc14-test", cwd: root, evidence })).rejects.toThrow("authority binding");
  });

  it("distinguishes valid informational analysis from implementation permission", async () => {
    const root = await repository();
    await writeFile(path.join(root, "outside.ts"), "export const outside = true;\n");
    const next = await nextAction({ cwd: root });
    expect(next).toMatchObject({
      valid: true,
      analysisValid: true,
      workflowState: "blocked",
      permission: "none",
      command: "Resolve the reported routing or contract diagnostics.",
    });
    expect(next.command).not.toMatch(/^engineeringspec (?:work|finish)\b/u);
  });

  it("keeps generated output outside the checked tree and never stages a written close", async () => {
    const root = await repository();
    await writeFile(path.join(root, "src", "change.ts"), "export const value = 2;\n");
    await expect(finishContract({ contractId: "ES-rc14-test", cwd: root, output: "receipt.json" })).rejects.toThrow("outside the Git worktree");
    await expect(finishContract({ contractId: "ES-rc14-test", cwd: root, staged: true, writeClosure: true })).rejects.toThrow("never stages files");
  });
});
