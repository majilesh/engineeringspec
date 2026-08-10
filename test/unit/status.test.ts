import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { workflowStatus } from "../../src/cli/status.js";

function contract(id: string, target = "src/**", status = "approved"): string {
  return `---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ${id}
title: Status fixture
status: ${status}
owners: [{team: test}]
---

\`\`\`engineering-source-refs
- {id: SRC-1, type: document, ref: test}
\`\`\`

\`\`\`engineering-targets
- {id: TARGET-${id}, paths: [${target}], change_policy: modify}
\`\`\`

\`\`\`engineering-constraints
- id: CON-1
  level: must
  statement: Stay safe.
  enforcement: {kind: test, verifier_ref: VER-1}
\`\`\`

\`\`\`engineering-verification
- id: VER-1
  proves: [CON-1]
  kind: test
  runner: {type: command, argv: [definitely-must-not-run, secret-runner-payload]}
\`\`\`
`;
}

async function repository(specs: string[]): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "es-status-"));
  await mkdir(path.join(root, "specs"));
  await mkdir(path.join(root, "src"));
  for (const [index, source] of specs.entries()) await writeFile(path.join(root, "specs", `${index}.engineering-spec.md`), source);
  await writeFile(path.join(root, ".gitignore"), "ignored.txt\n");
  execFileSync("git", ["init", "-q", root]);
  execFileSync("git", ["-C", root, "add", "."]);
  execFileSync("git", ["-C", root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "fixture"]);
  return root;
}

describe("workflow status", () => {
  it("moves from implementation readiness to verification and ignores ignored files", async () => {
    const root = await repository([contract("ES-one")]);
    let report = await workflowStatus({ specDirectory: "specs", base: "HEAD", cwd: root, strict: true });
    expect(report).toMatchObject({ valid: true, workingState: { changed: 0 }, next: { stage: "implement" } });

    await writeFile(path.join(root, "ignored.txt"), "ignored\n");
    report = await workflowStatus({ specDirectory: "specs", base: "HEAD", cwd: root, strict: true });
    expect(report.workingState.changed).toBe(0);

    await writeFile(path.join(root, "src", "change.ts"), "export {};\n");
    report = await workflowStatus({ specDirectory: "specs", base: "HEAD", cwd: root, strict: true });
    expect(report).toMatchObject({ valid: true, workingState: { changed: 1, selected: 1, violations: 0 }, next: { stage: "verify" } });
    expect(report.selectedContracts).toEqual(["ES-one"]);
    expect(report.routedTargets).toEqual(["TARGET-ES-one"]);
    expect(JSON.stringify(report)).not.toContain("secret-runner-payload");
  });

  it("reports reviewer-owned closure for a lifecycle-only governance change", async () => {
    const root = await repository([contract("ES-one")]);
    const file = path.join(root, "specs", "0.engineering-spec.md");
    await writeFile(file, (await readFile(file, "utf8")).replace("status: approved", "status: implemented"));
    const report = await workflowStatus({
      specDirectory: "specs",
      base: "HEAD",
      cwd: root,
      strict: true,
      allowContractOnly: true,
    });
    expect(report).toMatchObject({
      valid: true,
      workingState: { changed: 1, selected: 0, violations: 0 },
      next: { stage: "close" },
      routing: { governance: { classification: "contract_only", lifecycleOnly: true } },
    });
  });

  it("fails closed for uncovered and ambiguous non-empty changes", async () => {
    const uncoveredRoot = await repository([contract("ES-one")]);
    await writeFile(path.join(uncoveredRoot, "outside.ts"), "export {};\n");
    const uncovered = await workflowStatus({ specDirectory: "specs", base: "HEAD", cwd: uncoveredRoot });
    expect(uncovered).toMatchObject({ valid: false, workingState: { violations: 1 }, next: { stage: "blocked" } });

    const ambiguousRoot = await repository([contract("ES-one"), contract("ES-two")]);
    await writeFile(path.join(ambiguousRoot, "src", "change.ts"), "export {};\n");
    const ambiguous = await workflowStatus({ specDirectory: "specs", base: "HEAD", cwd: ambiguousRoot });
    expect(ambiguous.valid).toBe(false);
    expect(ambiguous.routing.routes[0]?.decision).toBe("ambiguous");
    expect(ambiguous.next.stage).toBe("blocked");
  });

  it("reports explore, propose, and approve for clean repositories without authority", async () => {
    const implemented = await repository([contract("ES-old", "src/**", "implemented")]);
    expect((await workflowStatus({ specDirectory: "specs", base: "HEAD", cwd: implemented })).next.stage).toBe("explore");
    const draft = await repository([contract("ES-draft", "src/**", "draft")]);
    expect((await workflowStatus({ specDirectory: "specs", base: "HEAD", cwd: draft })).next.stage).toBe("propose");
    const proposed = await repository([contract("ES-proposed", "src/**", "proposed")]);
    expect((await workflowStatus({ specDirectory: "specs", base: "HEAD", cwd: proposed })).next.stage).toBe("approve");
    const ambiguousProposal = await repository([
      contract("ES-draft", "src/**", "draft"),
      contract("ES-proposed", "docs/**", "proposed"),
    ]);
    const pending = await workflowStatus({ specDirectory: "specs", base: "HEAD", cwd: ambiguousProposal });
    expect(pending.next.stage).toBe("explore");
    expect(pending.next.message).toContain("2 draft/proposed candidates");
  });
});
