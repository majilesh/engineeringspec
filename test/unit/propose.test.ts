import { execFileSync } from "node:child_process";
import { access, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { proposeDraft } from "../../src/cli/propose.js";
import { validateFile } from "../../src/validator/validateFile.js";

async function repository(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "es-propose-"));
  await mkdir(path.join(root, "src"));
  await writeFile(path.join(root, "src", "existing.ts"), "export {};\n");
  execFileSync("git", ["init", "-q", root]);
  execFileSync("git", ["-C", root, "add", "."]);
  execFileSync("git", ["-C", root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "fixture"]);
  return root;
}

describe("proposal drafts", () => {
  it("creates a deterministic valid draft from explicit bounded paths", async () => {
    const root = await repository();
    const options = {
      id: "ES-safe-change",
      title: "Safe change",
      owner: "platform",
      output: "specs/ES-safe-change.engineering-spec.md",
      issue: "https://example.invalid/issues/7",
      paths: ["src/z.ts", "src/a.ts", "src/a.ts"],
      cwd: root,
    };
    const first = await proposeDraft(options);
    expect(first.result).toMatchObject({ status: "draft", written: true, inferred: false, paths: ["src/a.ts", "src/z.ts"] });
    expect((await validateFile(path.join(root, options.output))).valid).toBe(true);
    expect(first.markdown).toContain("status: draft");
    expect(first.markdown).toContain("grants no implementation authority");
    expect(first.markdown).not.toContain("status: approved");
    await expect(proposeDraft(options)).rejects.toThrow();
  });

  it("infers exact complete-working-state paths without writing in dry-run mode", async () => {
    const root = await repository();
    await writeFile(path.join(root, "src", "existing.ts"), "export const changed = true;\n");
    await writeFile(path.join(root, "src", "new.ts"), "export {};\n");
    const output = "specs/inferred.engineering-spec.md";
    const proposal = await proposeDraft({
      id: "ES-inferred",
      title: "Inferred\nchange",
      owner: "engineering\nteam",
      output,
      base: "HEAD",
      fromDiff: true,
      cwd: root,
      dryRun: true,
    });
    expect(proposal.result.paths).toEqual(["src/existing.ts", "src/new.ts"]);
    expect(proposal.markdown).toContain("# Inferred change");
    expect(proposal.markdown).toContain("placeholders for human review");
    expect(proposal.markdown).not.toContain("engineering\nteam");
    await expect(access(path.join(root, output))).rejects.toThrow();
  });

  it("rejects unsafe output and target paths", async () => {
    const root = await repository();
    const base = { id: "ES-unsafe", title: "Unsafe", owner: "test", cwd: root };
    await expect(proposeDraft({ ...base, output: "../escape.md", paths: ["src/a.ts"] })).rejects.toThrow();
    await expect(proposeDraft({ ...base, output: "specs/safe.md", paths: ["../escape.ts"] })).rejects.toThrow();
  });
});
