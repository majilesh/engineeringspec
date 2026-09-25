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

const CONTRACT = (id: string, status: string, target: string, extra = "") => `---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ${id}
title: ${id}
status: ${status}
owners: [{team: test}]
${extra}---

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

async function repository(options: { config?: Record<string, unknown>; contracts?: Array<[string, string, string] | [string, string, string, string]>; committedAt?: string }): Promise<{ root: string; base: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "es-policy-"));
  await mkdir(path.join(root, "specs"));
  await writeFile(path.join(root, "README.md"), "# fixture\n");
  if (options.config) await writeFile(path.join(root, "engineering-spec.json"), JSON.stringify({ specDirectory: "specs", strict: true, trustedBase: "HEAD", trustedVerifiers: {}, ...options.config }));
  for (const [id, status, target, extra] of options.contracts ?? []) await writeFile(path.join(root, "specs", `${id}.engineering-spec.md`), CONTRACT(id, status, target, extra));
  git(root, ["init", "-q"]);
  git(root, ["add", "."]);
  execFileSync("git", ["-C", root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "base"], {
    env: { ...process.env, ...(options.committedAt ? { GIT_COMMITTER_DATE: options.committedAt, GIT_AUTHOR_DATE: options.committedAt } : {}) },
  });
  git(root, ["config", "engineeringspec.trustedBase", "HEAD"]);
  return { root, base: git(root, ["rev-parse", "HEAD"]) };
}

describe("repository policy configuration", () => {
  it("parses mode and policy with defaults and rejects invalid values", () => {
    const config = parseRepositoryConfig(JSON.stringify({ specDirectory: "specs", mode: "standard", policy: { exemptPaths: ["docs/**"] } }));
    expect(config.mode).toBe("standard");
    expect(config.policy).toEqual({ governedPaths: ["**"], exemptPaths: ["docs/**"], protectedPaths: [], grantBeforeSpendPaths: [] });
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

const STANDING = (expiresAt: string) => `authority_kind: standing\nexpires_at: "${expiresAt}"\n`;

describe("standing authority end to end", () => {
  it("rejects standing authority without an expiry at validation time", async () => {
    const { root } = await repository({});
    await writeFile(path.join(root, "specs", "ES-s.engineering-spec.md"), CONTRACT("ES-s", "approved", "docs/**", "authority_kind: standing\n"));
    expect(runCli(root, ["validate", "specs/ES-s.engineering-spec.md", "--quiet"]).code).not.toBe(0);
  });

  it("judges expiry against the trusted base commit time, not wall-clock time", async () => {
    const contracts: Array<[string, string, string, string]> = [["ES-s", "approved", "docs/**", STANDING("2030-01-01T00:00:00Z")]];
    const before = await repository({ config: { mode: "standard" }, contracts, committedAt: "2029-12-31T00:00:00Z" });
    const live = await selectSpecs({ directory: "specs", base: before.base, changed: [{ path: "docs/a.md", kind: "modified" }], cwd: before.root });
    expect(live.routes.map((route) => route.decision)).toEqual(["standing"]);
    expect(live).toMatchObject({ valid: true, enforcement: { outcome: "pass" } });

    const after = await repository({ config: { mode: "standard" }, contracts, committedAt: "2030-01-02T00:00:00Z" });
    const expired = await selectSpecs({ directory: "specs", base: after.base, changed: [{ path: "docs/a.md", kind: "modified" }], cwd: after.root });
    expect(expired.routes.map((route) => route.decision)).toEqual(["uncovered"]);
    expect(expired.diagnostics.map((item) => item.code)).toEqual(expect.arrayContaining(["ESRT011", "ESRT002"]));
    expect(expired.enforcement.outcome).toBe("fail");
  });

  it("keeps an expired standing contract's denies in force", async () => {
    const { root, base } = await repository({
      config: { mode: "standard" },
      contracts: [["ES-a", "approved", "**"], ["ES-lock", "approved", "vendor/**", STANDING("2020-01-01T00:00:00Z")]],
    });
    await writeFile(path.join(root, "specs", "ES-lock.engineering-spec.md"), CONTRACT("ES-lock", "approved", "vendor/**", STANDING("2020-01-01T00:00:00Z")).replace("change_policy: modify", "change_policy: read_only"));
    execFileSync("git", ["-C", root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qam", "lock"]);
    const report = await selectSpecs({ directory: "specs", base: git(root, ["rev-parse", "HEAD"]), changed: [{ path: "vendor/lib.js", kind: "modified" }], cwd: root });
    expect(base).not.toBe("");
    expect(report.routes.map((route) => route.decision)).toEqual(["denied"]);
  });

  it("does not count standing authority toward next permission and never closes it", async () => {
    const { root } = await repository({
      config: { mode: "standard" },
      contracts: [["ES-change", "approved", "src/**"], ["ES-docs", "approved", "docs/**", STANDING("2099-01-01T00:00:00Z")]],
    });
    const next = await nextAction({ cwd: root });
    expect(next.permission).toBe("implementation");
    expect(next.status.standingAuthority).toEqual(["ES-docs"]);
    await mkdir(path.join(root, "docs"));
    await writeFile(path.join(root, "docs", "a.md"), "# docs\n");
    await expect(finishContract({ contractId: "ES-docs", cwd: root, writeClosure: true })).rejects.toThrow(/standing authority/u);
    expect(await readFile(path.join(root, "specs", "ES-docs.engineering-spec.md"), "utf8")).toContain("status: approved");
  });

  it("does not authorize standing-only paths in controlled mode", async () => {
    const { root, base } = await repository({ config: { mode: "controlled" }, contracts: [["ES-docs", "approved", "docs/**", STANDING("2099-01-01T00:00:00Z")]] });
    const report = await selectSpecs({ directory: "specs", base, changed: [{ path: "docs/a.md", kind: "modified" }], cwd: root });
    expect(report.routes.map((route) => route.decision)).toEqual(["standing"]);
    expect(report).toMatchObject({ valid: false, enforcement: { mode: "controlled", outcome: "fail" } });
  });
});

function commit(root: string, message: string): string {
  git(root, ["add", "."]);
  execFileSync("git", ["-C", root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", message]);
  return git(root, ["rev-parse", "HEAD"]);
}

describe("contract selectors end to end", () => {
  const overlap = { config: { mode: "standard" }, contracts: [["ES-a", "approved", "src/**"], ["ES-b", "approved", "src/api/**"]] as Array<[string, string, string]> };

  it("resolves overlap from a commit trailer, including through a merge-queue style merge commit", async () => {
    const { root, base } = await repository(overlap);
    await mkdir(path.join(root, "src", "api"), { recursive: true });
    const unselected = await selectSpecs({ directory: "specs", base, changed: [{ path: "src/api/a.ts", kind: "added" }], cwd: root });
    expect(unselected.routes.map((route) => route.decision)).toEqual(["ambiguous"]);

    git(root, ["switch", "-q", "-c", "feature"]);
    await writeFile(path.join(root, "src", "api", "a.ts"), "export const a = 1;\n");
    commit(root, "Add api\n\nEngineeringSpec-Contract: ES-b");
    const head = git(root, ["rev-parse", "HEAD"]);
    const selected = await selectSpecs({ directory: "specs", base, head, worktree: false, cwd: root });
    expect(selected.routes.map((route) => route.decision)).toEqual(["selected"]);
    expect(selected).toMatchObject({ valid: true, enforcement: { outcome: "pass", selectedContract: "ES-b" } });

    git(root, ["switch", "-q", "--detach", base]);
    execFileSync("git", ["-C", root, "-c", "user.name=Queue", "-c", "user.email=queue@example.com", "merge", "-q", "--no-ff", "-m", "Merge queue batch", "feature"]);
    const queued = await selectSpecs({ directory: "specs", base, head: git(root, ["rev-parse", "HEAD"]), worktree: false, cwd: root });
    expect(queued).toMatchObject({ valid: true, enforcement: { selectedContract: "ES-b" } });
  });

  it("fails closed when commit trailers name different contracts", async () => {
    const { root, base } = await repository(overlap);
    await mkdir(path.join(root, "src", "api"), { recursive: true });
    await writeFile(path.join(root, "src", "api", "a.ts"), "export const a = 1;\n");
    commit(root, "One\n\nEngineeringSpec-Contract: ES-b");
    await writeFile(path.join(root, "src", "api", "b.ts"), "export const b = 1;\n");
    commit(root, "Two\n\nEngineeringSpec-Contract: ES-a");
    const report = await selectSpecs({ directory: "specs", base, head: "HEAD", worktree: false, cwd: root });
    expect(report.diagnostics.map((item) => item.code)).toEqual(["ESRT009"]);
    expect(report).toMatchObject({ valid: false, routes: [], enforcement: { outcome: "fail" } });
  });

  it("honors labels and branches only with a trusted selection prefix", async () => {
    const off = await repository(overlap);
    const ignored = await selectSpecs({ directory: "specs", base: off.base, changed: [{ path: "src/api/a.ts", kind: "added" }], cwd: off.root, selector: { labels: ["engineeringspec:ES-b"], branch: "es/not-an-id/x" } });
    expect(ignored.routes.map((route) => route.decision)).toEqual(["ambiguous"]);

    const on = await repository({ ...overlap, config: { mode: "standard", selection: { label: "engineeringspec:", branch: "es/" } } });
    const label = await selectSpecs({ directory: "specs", base: on.base, changed: [{ path: "src/api/a.ts", kind: "added" }], cwd: on.root, selector: { labels: ["bug", "engineeringspec:ES-b"] } });
    expect(label).toMatchObject({ valid: true, enforcement: { selectedContract: "ES-b" } });
    const badBranch = await selectSpecs({ directory: "specs", base: on.base, changed: [{ path: "src/api/a.ts", kind: "added" }], cwd: on.root, selector: { branch: "es/not-an-id/x" } });
    expect(badBranch.diagnostics.map((item) => item.code)).toEqual(["ESRT009"]);
    const cli = runCli(on.root, ["select", "specs", "--base", on.base, "--changed", "src/api/a.ts", "--change-kind", "added", "--contract", "ES-b", "--format", "json"]);
    expect(cli.code).toBe(0);
    expect(JSON.parse(cli.out)).toMatchObject({ enforcement: { selectedContract: "ES-b" } });
  });

  it("ignores selectors in legacy repositories", async () => {
    const { root, base } = await repository({ contracts: overlap.contracts });
    const report = await selectSpecs({ directory: "specs", base, changed: [{ path: "src/api/a.ts", kind: "added" }], cwd: root, selector: { contract: "ES-b" } });
    expect(report.routes.map((route) => route.decision)).toEqual(["ambiguous"]);
    expect(report.enforcement).toEqual({ mode: "legacy", outcome: "fail", enforced: true });
  });
});

