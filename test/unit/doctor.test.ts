import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CURRENT_ACTION_SHA } from "../../src/adoption/releases.js";
import { codeOwnersFor, diagnoseRepository } from "../../src/cli/doctor.js";

function contract(status = "approved", extraTarget = ""): string {
  return `---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-doctor
title: Doctor fixture
status: ${status}
owners: [{team: test}]
---

\`\`\`engineering-source-refs
- {id: SRC-1, type: document, ref: test}
\`\`\`

\`\`\`engineering-targets
- {id: TARGET-1, paths: [src/**], change_policy: modify}
${extraTarget}\`\`\`

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
  runner: {type: command, argv: [node, -e, "require('fs').writeFileSync('must-not-exist', 'bad')"]}
\`\`\`
`;
}

async function repository(source = contract()): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "es-doctor-"));
  await mkdir(path.join(root, "docs", "engineering-specs"), { recursive: true });
  await mkdir(path.join(root, ".github", "workflows"), { recursive: true });
  await writeFile(path.join(root, "docs", "engineering-specs", "change.engineering-spec.md"), source);
  await writeFile(path.join(root, "AGENTS.md"), "# EngineeringSpec\nRun npx --yes @engineeringspec/cli@0.1.0-rc.18 check before completion.\n");
  await writeFile(path.join(root, ".github", "workflows", "engineering-spec.yml"), `gate-spec-dir: docs/engineering-specs\ngate-base: origin/main\ngate-require-status: approved\nuses: majilesh/engineeringspec@${CURRENT_ACTION_SHA}\n`);
  await writeFile(path.join(root, ".github", "CODEOWNERS"), "/docs/engineering-specs/ @acme/platform\n/.github/workflows/ @acme/platform\n/.github/CODEOWNERS @acme/platform\n/engineering-spec.json @acme/platform\n");
  execFileSync("git", ["init", "-q", root]);
  execFileSync("git", ["-C", root, "add", "."]);
  execFileSync("git", ["-C", root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "fixture"]);
  return root;
}

describe("repository doctor", () => {
  it("reports a ready setup without executing declared runners or changing Git", async () => {
    const root = await repository();
    const before = execFileSync("git", ["-C", root, "status", "--porcelain"], { encoding: "utf8" });
    const report = await diagnoseRepository({ root, specDirectory: "docs/engineering-specs", base: "HEAD", strict: true });
    expect(report.valid).toBe(true);
    expect(report.lifecycle.approved).toBe(1);
    expect(report.checks.every((check) => check.status === "pass")).toBe(true);
    expect(execFileSync("git", ["-C", root, "status", "--porcelain"], { encoding: "utf8" })).toBe(before);
    await expect(readFile(path.join(root, "must-not-exist"), "utf8")).rejects.toThrow();
  });

  it("fails helpfully outside Git and for missing refs and directories", async () => {
    const nonGit = await mkdtemp(path.join(os.tmpdir(), "es-doctor-no-git-"));
    const outside = await diagnoseRepository({ root: nonGit });
    expect(outside.valid).toBe(false);
    expect(outside.checks).toMatchObject([{ id: "git-worktree", status: "fail" }]);

    const root = await repository();
    const missing = await diagnoseRepository({ root, specDirectory: "missing", base: "missing-ref" });
    expect(missing.valid).toBe(false);
    expect(missing.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "base-ref", status: "fail" }),
      expect.objectContaining({ id: "spec-directory", status: "fail" }),
    ]));
  });

  it("fails invalid contracts and treats warnings as failures only in strict mode", async () => {
    const invalidRoot = await repository("# invalid\n");
    const invalid = await diagnoseRepository({ root: invalidRoot, base: "HEAD" });
    expect(invalid.valid).toBe(false);
    expect(invalid.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "spec-validation", status: "fail" }),
      expect.objectContaining({ id: "base-contracts", status: "fail" }),
    ]));

    const warningRoot = await repository(contract("approved", "- {id: TARGET-deny, paths: [src/private/**], change_policy: read_only}\n"));
    expect((await diagnoseRepository({ root: warningRoot, base: "HEAD" })).valid).toBe(true);
    const strict = await diagnoseRepository({ root: warningRoot, base: "HEAD", strict: true });
    expect(strict.valid).toBe(false);
    expect(strict.checks).toEqual(expect.arrayContaining([expect.objectContaining({ id: "spec-validation", status: "fail" })]));
  });

  it("detects managed CLI and immutable Action version drift without network access", async () => {
    const root = await repository();
    await writeFile(path.join(root, "AGENTS.md"), "# EngineeringSpec\nRun npx --yes @engineeringspec/cli@0.1.0-rc.6 check.\n");
    await writeFile(path.join(root, ".github", "workflows", "engineering-spec.yml"), "gate-spec-dir: docs/engineering-specs\ngate-base: origin/main\ngate-require-status: approved\nuses: majilesh/engineeringspec@122ec6f0329b19e21a58a2f179aea3328cb8e1ac\n");
    const report = await diagnoseRepository({ root, base: "HEAD" });
    expect(report.checks).toEqual(expect.arrayContaining([expect.objectContaining({ id: "integration-versions", status: "warning" })]));
    expect((await diagnoseRepository({ root, base: "HEAD", strict: true })).valid).toBe(false);
  });
});

describe("CODEOWNERS trust boundary", () => {
  it("applies last-match-wins ownership like GitHub", () => {
    const owners = "* @everyone\n/docs/engineering-specs/ @specs\n/.github/workflows/ @platform\n*.md @docs\n/docs/engineering-specs/*.md\n";
    expect(codeOwnersFor("src/a.ts", owners)).toEqual(["@everyone"]);
    expect(codeOwnersFor(".github/workflows/ci.yml", owners)).toEqual(["@platform"]);
    expect(codeOwnersFor("README.md", owners)).toEqual(["@docs"]);
    // A later pattern without owners removes ownership, as on GitHub.
    expect(codeOwnersFor("docs/engineering-specs/ES-a.engineering-spec.md", owners)).toEqual([]);
    expect(codeOwnersFor("engineering-spec.json", "/engineering-spec.json @owners # policy\n")).toEqual(["@owners"]);
  });
});

describe("doctor trust-boundary warnings", () => {
  it("warns when CODEOWNERS leaves the gate's own files unowned, and when mode is advisory", async () => {
    const root = await repository();
    await writeFile(path.join(root, ".github", "CODEOWNERS"), "/docs/engineering-specs/ @acme/platform\n");
    await writeFile(path.join(root, "engineering-spec.json"), JSON.stringify({ specDirectory: "docs/engineering-specs", mode: "advisory" }));
    const report = await diagnoseRepository({ root, specDirectory: "docs/engineering-specs", base: "HEAD" });
    expect(report.checks.find((check) => check.id === "protected-ownership")).toMatchObject({ status: "warning", message: expect.stringMatching(/\.github\/workflows.*engineering-spec\.json/u) });
    expect(report.checks.find((check) => check.id === "enforcement-mode")).toMatchObject({ status: "warning" });
    expect((await diagnoseRepository({ root, specDirectory: "docs/engineering-specs", base: "HEAD", strict: true })).valid).toBe(false);
  });
});

