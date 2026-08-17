import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseRepositoryConfig, resolveRepositoryConfig, summarizeRepositoryConfig } from "../../src/config/repositoryConfig.js";

describe("trusted repository configuration", () => {
  it("validates bounded safe configuration and rejects command strings and unknown keys", () => {
    expect(parseRepositoryConfig('{"specDirectory":"specs","strict":true,"trustedVerifiers":{"ES-1#VER-1":{"argv":["npm","test"]}}}')).toMatchObject({ specDirectory: "specs", strict: true });
    expect(() => parseRepositoryConfig('{"specDirectory":"../specs"}')).toThrow("safe repository-relative");
    expect(() => parseRepositoryConfig('{"command":"npm test"}')).toThrow("unknown property");
    expect(() => parseRepositoryConfig('{"trustedVerifiers":{"ES-1#VER-1":{"argv":"npm test"}}}')).toThrow("string array");
  });

  it("loads authority settings from the immutable base and reports ignored workspace drift", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "es-config-"));
    execFileSync("git", ["init", "-q", root]);
    await writeFile(path.join(root, "engineering-spec.json"), '{"specDirectory":"specs","strict":true,"trustedBase":"HEAD","trustedVerifiers":{}}\n');
    execFileSync("git", ["-C", root, "add", "."]);
    execFileSync("git", ["-C", root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "base"]);
    await writeFile(path.join(root, "engineering-spec.json"), '{"specDirectory":"hidden","strict":false,"trustedBase":"HEAD","trustedVerifiers":{}}\n');
    const report = await resolveRepositoryConfig({ base: "HEAD", cwd: root });
    expect(report).toMatchObject({ source: "trusted_base", workspaceDrift: true, config: { specDirectory: "specs", strict: true } });
  });

  it("normalizes origin HEAD and never exposes trusted argv in summaries", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "es-config-origin-"));
    execFileSync("git", ["init", "-q", root]);
    await writeFile(path.join(root, "engineering-spec.json"), '{"specDirectory":"specs","strict":true,"trustedBase":"origin/main","trustedVerifiers":{"ES-1#VER-1":{"argv":["secret-command"]}}}\n');
    execFileSync("git", ["-C", root, "add", "."]);
    execFileSync("git", ["-C", root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "base"]);
    execFileSync("git", ["-C", root, "update-ref", "refs/remotes/origin/main", "HEAD"]);
    execFileSync("git", ["-C", root, "symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/main"]);
    const report = await resolveRepositoryConfig({ cwd: root });
    expect(report.baseRef).toBe("origin/main");
    const summary = summarizeRepositoryConfig(report);
    expect(summary.trustedVerifierIds).toEqual(["ES-1#VER-1"]);
    expect(JSON.stringify(summary)).not.toContain("secret-command");
  });

  it("reports explicit-base mismatch for informational inspection but fails enforcing use", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "es-config-mode-"));
    execFileSync("git", ["init", "-q", root]);
    await writeFile(path.join(root, "engineering-spec.json"), '{"specDirectory":"specs","strict":true,"trustedBase":"origin/main","trustedVerifiers":{}}\n');
    execFileSync("git", ["-C", root, "add", "."]);
    execFileSync("git", ["-C", root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "base"]);
    const informational = await resolveRepositoryConfig({ base: "HEAD", cwd: root, enforcing: false });
    expect(informational.warnings).toContainEqual(expect.stringContaining("no authority was granted"));
    await expect(resolveRepositoryConfig({ base: "HEAD", cwd: root })).rejects.toThrow('expects "origin/main"');
  });
});
