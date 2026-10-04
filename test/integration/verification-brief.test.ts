import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import type { VerificationBrief } from "../../src/query/verificationBrief.js";

const cli = fileURLToPath(new URL("../../dist/cli.js", import.meta.url));
const roots: string[] = [];
const validate = new Ajv2020({ strict: true }).compile(JSON.parse(readFileSync("schemas/verification-brief-0.1.schema.json", "utf8")));
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });
function run(root: string, args: string[]) {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: "utf8" });
  if (result.error) throw result.error;
  return { code: result.status, out: result.stdout, err: result.stderr };
}
function model(html: string): VerificationBrief {
  return JSON.parse(html.match(/<script id="verification-brief" type="application\/json">([\s\S]*?)<\/script>/u)![1]!) as VerificationBrief;
}
async function repository(mode?: "advisory" | "standard", standing = false): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "es-brief-cli-")); roots.push(root);
  await mkdir(path.join(root, "specs")); await mkdir(path.join(root, "src"));
  await writeFile(path.join(root, "engineering-spec.json"), JSON.stringify({ specDirectory: "specs", trustedBase: "HEAD", strict: true, ...(mode ? { mode } : {}) }));
  await writeFile(path.join(root, "specs", "brief.engineering-spec.md"), `---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-brief
title: CLI brief fixture
status: approved
${standing ? 'authority_kind: standing\nexpires_at: "2099-01-01T00:00:00Z"\n' : ""}owners: [{team: test}]
---
\n\`\`\`engineering-source-refs
- {id: SRC-1, type: other, ref: fixture}
\`\`\`
\n\`\`\`engineering-targets
- {id: TARGET-1, paths: [src/**], change_policy: modify}
\`\`\`
\n\`\`\`engineering-constraints
- {id: CON-1, level: must, statement: Preserve behavior, enforcement: {kind: test, verifier_ref: VER-1}}
\`\`\`
\n\`\`\`engineering-verification
- {id: VER-1, kind: test, proves: [CON-1], runner: {type: command, argv: [must-never-run, secret-command]}}
\`\`\`
`);
  execFileSync("git", ["init", "-q", root]); execFileSync("git", ["-C", root, "config", "engineeringspec.trustedBase", "HEAD"]); execFileSync("git", ["-C", root, "add", "."]);
  execFileSync("git", ["-C", root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "fixture"]);
  return root;
}

describe("compiled Visual Verification Brief CLI", () => {
  it("matches ordinary review decisions and schema, stays read-only, and leaves existing formats intact", async () => {
    const root = await repository(); await writeFile(path.join(root, "src", "change.ts"), "export {};\n");
    const before = execFileSync("git", ["-C", root, "status", "--porcelain"], { encoding: "utf8" });
    const json = run(root, ["review", "--format", "json"]); const html = run(root, ["review", "--format", "html"]);
    expect(html.code, html.err).toBe(json.code); expect(html.code).toBe(0);
    const original = JSON.parse(json.out); const brief = model(html.out);
    expect(validate(brief), JSON.stringify(validate.errors)).toBe(true);
    expect(brief.routes).toEqual(original.routes); expect(brief.changedDigest).toBe(original.changedDigest); expect(brief.authorized).toBe(original.valid);
    expect(brief.contracts[0]?.verification[0]?.state).toBe("declared"); expect(html.out).not.toContain("secret-command");
    expect(original).not.toHaveProperty("evaluation"); expect(run(root, ["review", "--format", "markdown"]).out).toContain("EngineeringSpec review");
    expect(execFileSync("git", ["-C", root, "status", "--porcelain"], { encoding: "utf8" })).toBe(before);
    expect(run(root, ["--format", "html", "review"]).out).toBe(html.out);
  });

  it("preserves blocked output and separates advisory success from authorization", async () => {
    for (const mode of [undefined, "advisory"] as const) {
      const root = await repository(mode); await writeFile(path.join(root, "outside.ts"), "unauthorized\n");
      const json = run(root, ["review", "--format", "json"]); const html = run(root, ["review", "--format", "html"]);
      expect(html.code).toBe(json.code); expect(html.code).toBe(mode ? 0 : 1);
      expect(model(html.out).authorized).toBe(false); expect(model(html.out).routes[0]?.decision).toBe("uncovered");
      expect(html.out).toContain("Change is not authorized"); if (mode) expect(html.out).toContain("Advisory enforcement passed");
    }
  });

  it("projects standing contract obligations without changing standing authority", async () => {
    const root = await repository("standard", true); await writeFile(path.join(root, "src", "change.ts"), "export {};\n");
    const html = run(root, ["review", "--format", "html"]);
    expect(html.code, html.err).toBe(0); expect(model(html.out).routes[0]?.decision).toBe("standing");
    expect(model(html.out).contracts[0]?.verification[0]?.verifierId).toBe("VER-1");
  });

  it.each([
    { args: ["--staged"], scope: "committed_and_staged" },
    { args: ["--no-worktree"], scope: "committed_only" },
    { args: ["--changed", "src/change.ts", "--change-kind", "added"], scope: "explicit_paths" },
  ])("marks $scope as partial", async ({ args, scope }) => {
    const root = await repository(); await writeFile(path.join(root, "src", "change.ts"), "export {};\n");
    execFileSync("git", ["-C", root, "add", "src/change.ts"]);
    const html = run(root, ["review", ...args, "--format", "html"]);
    expect(html.code, html.err).toBe(0); expect(model(html.out).evaluation).toEqual({ scope, completeWorkingState: false });
    expect(html.out).toContain("Partial evaluation");
  });

  it("accepts bound evidence but rejects stale evidence, duplicates and unsupported options even when quiet", async () => {
    const root = await repository(); await writeFile(path.join(root, "src", "change.ts"), "export {};\n");
    const brief = model(run(root, ["review", "--format", "html"]).out); const contract = brief.contracts[0]!;
    const evidenceRoot = await mkdtemp(path.join(os.tmpdir(), "es-brief-cli-evidence-")); roots.push(evidenceRoot);
    const file = path.join(evidenceRoot, "evidence.json");
    const evidence = { authority: { baseSha: brief.baseSha, contractId: contract.id, specRevision: contract.specRevision, semanticDigest: contract.semanticDigest }, changeDigest: brief.changedDigest, verification: [{ verifierId: "VER-1", state: "passed", artifact: "unread-artifact.json", digest: `sha256:${"d".repeat(64)}` }] };
    await writeFile(file, JSON.stringify(evidence));
    const html = run(root, ["review", "--format", "html", "--evidence", file]);
    expect(html.code, html.err).toBe(0); expect(model(html.out).contracts[0]?.verification[0]).toMatchObject({ source: "supplied", state: "passed" });
    expect(run(root, ["review", "--format", "html", "--evidence", file, "--evidence", file]).code).toBe(3);
    expect(run(root, ["review", "--format", "json", "--evidence", file, "--quiet"]).code).toBe(2);
    expect(run(root, ["next", "--format", "html"]).code).toBe(2);
    await writeFile(path.join(root, "src", "change.ts"), "changed after evidence\n");
    const stale = run(root, ["review", "--format", "html", "--evidence", file, "--quiet"]);
    // The existing routing change digest binds path identities, not file contents.
    // Changing the path set produces a stale binding, while content checks remain separately trusted.
    expect(stale.code).toBe(0);
    await writeFile(path.join(root, "src", "second.ts"), "export {};\n");
    const rejected = run(root, ["review", "--format", "html", "--evidence", file, "--quiet"]);
    expect(rejected.code).toBe(3); expect(rejected.out).toBe(""); expect(rejected.err).toContain("changeDigest");
  });
});
