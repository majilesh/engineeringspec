import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { finishContract } from "../../src/cli/finish.js";
import { nextAction } from "../../src/cli/next.js";
import { parseRepositoryConfig, RepositoryConfigError } from "../../src/config/repositoryConfig.js";
import { enforcementFor } from "../../src/policy/evaluate.js";
import { selectSpecs } from "../../src/routing/select.js";
import { runCli } from "../support/runCli.js";

const CONTRACT = (id: string, status: string, target: string) => `---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ${id}
title: ${id}
status: ${status}
owners: [{team: test}]
---

\`\`\`engineering-source-refs
- {id: SRC-1, type: other, ref: fixture}
\`\`\`

\`\`\`engineering-targets
- {id: TARGET-1, paths: ["${target}"], change_policy: modify}
\`\`\`

\`\`\`engineering-constraints
- {id: CON-1, level: should, statement: Fixture., enforcement: {kind: test, verifier_ref: VER-1}}
\`\`\`

\`\`\`engineering-verification
- {id: VER-1, proves: [CON-1], kind: test}
\`\`\`
`;

function git(root: string, args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
}

async function repository(options: { config?: Record<string, unknown>; contracts?: Array<[string, string, string]> }): Promise<{ root: string; base: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "es-policy-"));
  await mkdir(path.join(root, "specs"));
  await writeFile(path.join(root, "README.md"), "# fixture\n");
  if (options.config) await writeFile(path.join(root, "engineering-spec.json"), JSON.stringify({ specDirectory: "specs", strict: true, trustedBase: "HEAD", trustedVerifiers: {}, ...options.config }));
  for (const [id, status, target] of options.contracts ?? []) await writeFile(path.join(root, "specs", `${id}.engineering-spec.md`), CONTRACT(id, status, target));
  git(root, ["init", "-q"]);
  git(root, ["add", "."]);
  git(root, ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "base"]);
  git(root, ["config", "engineeringspec.trustedBase", "HEAD"]);
  return { root, base: git(root, ["rev-parse", "HEAD"]) };
}

describe("repository policy configuration", () => {
  it("parses mode and policy with defaults and rejects invalid values", () => {
    const config = parseRepositoryConfig(JSON.stringify({ specDirectory: "specs", mode: "standard", policy: { exemptPaths: ["docs/**"] } }));
    expect(config.mode).toBe("standard");
    expect(config.policy).toEqual({ governedPaths: ["**"], exemptPaths: ["docs/**"], protectedPaths: [] });
    expect(() => parseRepositoryConfig(JSON.stringify({ mode: "lenient" }))).toThrow(/mode must be one of/u);
    expect(() => parseRepositoryConfig(JSON.stringify({ policy: { exemptPaths: ["docs/{a,b}"] } }))).toThrow(RepositoryConfigError);
    expect(() => parseRepositoryConfig(JSON.stringify({ policy: { unknown: [] } }))).toThrow(/unknown property/u);
    expect(parseRepositoryConfig(JSON.stringify({ specDirectory: "specs" })).mode).toBeUndefined();
  });

  it("maps authorization to outcomes without letting advisory authorize", () => {
    expect(enforcementFor("advisory", false)).toEqual({ mode: "advisory", outcome: "pass", enforced: false });
    expect(enforcementFor("standard", false)).toEqual({ mode: "standard", outcome: "fail", enforced: true });
    expect(enforcementFor("legacy", true)).toEqual({ mode: "legacy", outcome: "pass", enforced: true });
    expect(enforcementFor("advisory", true, true).outcome).toBe("error");
  });
});

describe("bootstrap advisory mode", () => {
  it("is honored only without trusted configuration and approved contracts", async () => {
    const empty = await repository({});
    const honored = await selectSpecs({ directory: "specs", base: empty.base, changed: [{ path: "src/a.ts", kind: "added" }], cwd: empty.root, bootstrapMode: "advisory" });
    expect(honored.enforcement).toEqual({ mode: "bootstrap_advisory", outcome: "pass", enforced: false, bootstrap: "honored" });
    expect(honored.valid).toBe(false);

    const configured = await repository({ config: {} });
    const withConfig = await selectSpecs({ directory: "specs", base: configured.base, changed: [{ path: "src/a.ts", kind: "added" }], cwd: configured.root, bootstrapMode: "advisory" });
    expect(withConfig.enforcement).toMatchObject({ mode: "legacy", outcome: "fail", bootstrap: "ignored" });

    const authorized = await repository({ contracts: [["ES-a", "approved", "src/**"]] });
    const withAuthority = await selectSpecs({ directory: "specs", base: authorized.base, changed: [{ path: "lib/x.ts", kind: "added" }], cwd: authorized.root, bootstrapMode: "advisory" });
    expect(withAuthority.enforcement).toMatchObject({ mode: "legacy", outcome: "fail", bootstrap: "ignored" });
  });

  it("never weakens a trusted base that configures standard mode", async () => {
    const { root, base } = await repository({ config: { mode: "standard" } });
    const report = await selectSpecs({ directory: "specs", base, changed: [{ path: "src/a.ts", kind: "added" }], cwd: root, bootstrapMode: "advisory" });
    expect(report.enforcement).toMatchObject({ mode: "standard", outcome: "fail", enforced: true, bootstrap: "ignored" });
  });
});

describe("configured modes end to end", () => {
  it("passes exempt paths in standard mode and fails uncovered governed paths", async () => {
    const { root, base } = await repository({ config: { mode: "standard", policy: { exemptPaths: ["docs/**", "*.md"] } }, contracts: [["ES-a", "approved", "src/**"]] });
    const exempt = await selectSpecs({ directory: "specs", base, changed: [{ path: "README.md", kind: "modified" }, { path: "src/a.ts", kind: "modified" }], cwd: root });
    expect(exempt.routes.map((route) => route.decision)).toEqual(["exempt", "selected"]);
    expect(exempt).toMatchObject({ valid: true, enforcement: { mode: "standard", outcome: "pass" } });
    const uncovered = await selectSpecs({ directory: "specs", base, changed: [{ path: "lib/x.ts", kind: "added" }], cwd: root });
    expect(uncovered).toMatchObject({ valid: false, enforcement: { outcome: "fail" } });
    expect(runCli(root, ["select", "specs", "--base", base, "--changed", "lib/x.ts", "--change-kind", "added", "--quiet"]).code).toBe(1);
  });

  it("reports advisory violations with exit 0 but grants no implementation authority", async () => {
    const { root, base } = await repository({ config: { mode: "advisory" }, contracts: [["ES-a", "approved", "src/**"]] });
    const select = runCli(root, ["select", "specs", "--base", base, "--changed", "lib/x.ts", "--change-kind", "added", "--format", "json"]);
    expect(select.code).toBe(0);
    expect(JSON.parse(select.out)).toMatchObject({ valid: false, enforcement: { mode: "advisory", outcome: "pass", enforced: false } });

    await mkdir(path.join(root, "lib"));
    await writeFile(path.join(root, "lib", "x.ts"), "export const x = 1;\n");
    const finished = await finishContract({ contractId: "ES-a", cwd: root, writeClosure: true });
    expect(finished).toMatchObject({ result: "blocked", closureWritten: false });
    expect(await readFile(path.join(root, "specs", "ES-a.engineering-spec.md"), "utf8")).toContain("status: approved");
    expect((await nextAction({ cwd: root })).permission).toBe("none");
  });

  it("fails closed on an invalid trusted policy in every mode", async () => {
    const { root, base } = await repository({ config: { mode: "advisory", policy: { exemptPaths: ["docs/{a,b}"] } } });
    const report = await selectSpecs({ directory: "specs", base, changed: [{ path: "src/a.ts", kind: "added" }], cwd: root });
    expect(report.enforcement.outcome).toBe("error");
    expect(report.diagnostics.map((item) => item.code)).toContain("ESPTH002");
  });

  it("protects the policy file itself", async () => {
    const { root, base } = await repository({ config: { mode: "standard", policy: { exemptPaths: ["**"] } } });
    const report = await selectSpecs({ directory: "specs", base, changed: [{ path: "engineering-spec.json", kind: "modified" }, { path: "src/a.ts", kind: "added" }], cwd: root });
    expect(report.routes.map((route) => route.decision)).toEqual(["protected_unauthorized", "exempt"]);
    expect(report.enforcement.outcome).toBe("fail");
  });
});
