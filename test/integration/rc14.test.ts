import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { finishContract } from "../../src/cli/finish.js";
import { nextAction, nextTicket } from "../../src/cli/next.js";
import { workOnContract, workTicket } from "../../src/cli/work.js";
import { createProgram } from "../../src/cli/program.js";
import * as routing from "../../src/routing/select.js";
import { reviewText } from "../../src/cli/review.js";

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

const PRODUCTSPEC = `---
spec_format: product-spec
spec_revision: 1
id: PS-feature
---

\`\`\`product-acceptance
- id: AC-1
  statement: The feature works.
\`\`\`
`;

const PRODUCTSPEC_CONTRACT = `---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 7
id: ES-productspec-finish
title: ProductSpec finish regression
status: approved
owners: [{team: test}]
profiles: [{name: productspec, version: "0.1"}]
---

\`\`\`engineering-source-refs
- id: SRC-PRODUCT
  type: productspec
  path: product/feature.product-spec.md
  revision: 1
  item_ids: [AC-1]
\`\`\`
\`\`\`engineering-targets
- {id: TARGET-1, paths: [src/**, product/**], change_policy: modify}
\`\`\`
\`\`\`engineering-constraints
- {id: CON-1, level: must, statement: Safe, satisfies: [AC-1], enforcement: {kind: test, verifier_ref: VER-1}}
\`\`\`
\`\`\`engineering-verification
- id: VER-1
  proves: [CON-1]
  kind: test
  runner: {type: command, argv: [must-never-run, secret-productspec-runner]}
\`\`\`
`;

async function repository(source = CONTRACT, extraFiles: Record<string, string> = {}): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "es-rc14-"));
  await mkdir(path.join(root, "specs"));
  await mkdir(path.join(root, "src"));
  await writeFile(path.join(root, "specs", "change.engineering-spec.md"), source);
  await writeFile(path.join(root, "src", "change.ts"), "export const value = 1;\n");
  for (const [relative, content] of Object.entries(extraFiles)) {
    await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
    await writeFile(path.join(root, relative), content);
  }
  await writeFile(path.join(root, "engineering-spec.json"), JSON.stringify({ specDirectory: "specs", strict: true, trustedBase: "HEAD", trustedVerifiers: { "ES-rc14-test#VER-1": { argv: ["must-not-run"] } } }));
  execFileSync("git", ["init", "-q", root]);
  execFileSync("git", ["-C", root, "config", "engineeringspec.trustedBase", "HEAD"]);
  execFileSync("git", ["-C", root, "add", "."]);
  execFileSync("git", ["-C", root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "base"]);
  return root;
}

describe("RC14 minimum-ceremony workflow", () => {
  it("retains trusted permission before a later all-spec governance diff without changing finish semantics", async () => {
    const controller = CONTRACT.replace("[src/**]", "[specs/stale.engineering-spec.md]");
    const stale = CONTRACT.replaceAll("ES-rc14-test", "ES-stale").replace("status: approved", "status: proposed");
    const root = await repository(controller, { "specs/stale.engineering-spec.md": stale });
    expect(nextTicket(await nextAction({ cwd: root }))).toMatchObject({ permission: "implementation", currentChangeClassification: "none", approvedIds: ["ES-rc14-test"], proposedIds: ["ES-stale"] });
    const authority = workTicket(await workOnContract({ contractId: "ES-rc14-test", cwd: root }));
    expect(authority).toMatchObject({ result: "ready", permission: "implementation", specRevision: 1 });

    await writeFile(path.join(root, "specs/stale.engineering-spec.md"), stale.replace("status: proposed", "status: superseded") + "\nHistorical work was replaced by a later contract.\n");
    const checked = await routing.selectSpecs({ directory: "specs", base: "HEAD", strict: true, cwd: root, worktree: true });
    expect(checked).toMatchObject({ valid: true, governance: { classification: "implementation" }, routes: [{ decision: "selected", selected: { specId: "ES-rc14-test" } }] });
    expect(nextTicket(await nextAction({ cwd: root }))).toMatchObject({ permission: "none", workflowState: "approve", currentChangeClassification: "contract_only", blockers: [] });
    expect(workTicket(await workOnContract({ contractId: "ES-rc14-test", cwd: root }))).toEqual(authority);
    const finish = await finishContract({ contractId: "ES-rc14-test", cwd: root });
    expect(finish).toMatchObject({ result: "blocked", closureWritten: false, review: { valid: true, classification: "contract_only" } });
    expect(finish.receipt).toBeUndefined();
    expect(reviewText(finish.review)).toContain("decision: contract_only_no_implementation_authority");
    expect(await readFile(path.join(root, "specs/change.engineering-spec.md"), "utf8")).toBe(controller);
  });

  it("projects implementation and monotonic close without upgrading informational permission", async () => {
    const root = await repository();
    await writeFile(path.join(root, "src/change.ts"), "export const value = 2;\n");
    expect(nextTicket(await nextAction({ cwd: root }))).toMatchObject({ permission: "none", currentChangeClassification: "implementation", workflowState: "verify" });
    await writeFile(path.join(root, "specs/change.engineering-spec.md"), CONTRACT.replace("status: approved", "status: implemented"));
    expect(nextTicket(await nextAction({ cwd: root }))).toMatchObject({ permission: "none", currentChangeClassification: "implementation_with_monotonic_close", workflowState: "verify" });
  });

  it("never derives work permission from a workspace or head approval", async () => {
    const root = await repository(CONTRACT.replace("status: approved", "status: draft"));
    await writeFile(path.join(root, "engineering-spec.json"), JSON.stringify({ specDirectory: "specs", strict: true, trustedBase: "trusted" }));
    execFileSync("git", ["-C", root, "add", "."]);
    execFileSync("git", ["-C", root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "pin trusted branch"]);
    execFileSync("git", ["-C", root, "branch", "trusted"]);
    execFileSync("git", ["-C", root, "config", "engineeringspec.trustedBase", "trusted"]);
    await writeFile(path.join(root, "specs/change.engineering-spec.md"), CONTRACT);
    expect(workTicket(await workOnContract({ contractId: "ES-rc14-test", cwd: root }))).toMatchObject({ result: "blocked", permission: "none", writablePaths: [] });
    execFileSync("git", ["-C", root, "add", "."]);
    execFileSync("git", ["-C", root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "untrusted approval"]);
    expect(workTicket(await workOnContract({ contractId: "ES-rc14-test", cwd: root }))).toMatchObject({ result: "blocked", permission: "none", writablePaths: [] });
  });

  it.each(["uncovered", "denied", "ambiguous", "no-candidates"] as const)("explains %s through the existing directory router", async (scenario) => {
    const extra = scenario === "denied" || scenario === "ambiguous"
      ? { "specs/other.engineering-spec.md": CONTRACT.replaceAll("ES-rc14-test", "ES-other").replace("change_policy: modify", scenario === "denied" ? "change_policy: read_only" : "change_policy: modify") }
      : {};
    const root = await repository(scenario === "no-candidates" ? CONTRACT.replace("status: approved", "status: implemented") : CONTRACT, extra);
    const changedPath = scenario === "uncovered" || scenario === "no-candidates" ? "outside.ts" : "src/change.ts";
    await writeFile(path.join(root, changedPath), "export const value = 2;\n");
    const full = await nextAction({ cwd: root });
    const ticket = nextTicket(full);
    expect(ticket).toMatchObject({ permission: "none", workflowState: "blocked" });
    expect(ticket.command).toContain("engineeringspec explain --spec-dir");
    const blockedPath = full.status.routing.routes.find((item) => item.decision !== "selected") ?? full.status.routing.changed[0]!;
    const select = routing.selectSpecs;
    const delegate = vi.spyOn(routing, "selectSpecs").mockImplementation((options) => select({ ...options, cwd: root }));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      let code = -1;
      await createProgram((value) => { code = value; }).parseAsync(["node", "engineeringspec", "explain", "--spec-dir", "specs", "--base", full.config.baseSha, "--path", blockedPath.path, "--change-kind", blockedPath.kind, "--strict", "--format", "json"]);
      expect(code).toBe(1);
      const explanation = JSON.parse(String(log.mock.calls.at(-1)![0]));
      expect(explanation.routes).toEqual(full.status.routing.routes);
      expect(explanation.valid).toBe(false);
      expect(delegate).toHaveBeenCalledWith(expect.objectContaining({ base: full.config.baseSha, strict: true, changed: [{ path: blockedPath.path, kind: blockedPath.kind }] }));
    } finally { delegate.mockRestore(); log.mockRestore(); }
  });

  it("finishes a strict base-approved ProductSpec contract without trusting workspace profile content", async () => {
    const root = await repository(PRODUCTSPEC_CONTRACT, { "product/feature.product-spec.md": PRODUCTSPEC });
    const work = await workOnContract({ contractId: "ES-productspec-finish", cwd: root });
    expect(work).toMatchObject({ result: "ready", brief: { permission: "implementation" } });
    const baseDigest = work.brief.result === "ready" ? work.brief.authority.specDigest : "missing";

    await writeFile(path.join(root, "src", "change.ts"), "export const value = 2;\n");
    await writeFile(path.join(root, "product", "feature.product-spec.md"), PRODUCTSPEC.replace("spec_revision: 1", "spec_revision: 999").replace("AC-1", "AC-WORKSPACE"));

    const finish = await finishContract({ contractId: "ES-productspec-finish", cwd: root, writeClosure: true });
    expect(finish).toMatchObject({
      result: "ready",
      closureWritten: true,
      review: { classification: "implementation_with_monotonic_close", workingState: { changed: 3, violations: 0 } },
      receipt: { authority: { contractId: "ES-productspec-finish", specRevision: 7, semanticDigest: baseDigest } },
    });
    const closed = await readFile(path.join(root, "specs", "change.engineering-spec.md"), "utf8");
    expect(closed).toContain("status: implemented");
    expect(closed).toContain("spec_revision: 7");
    expect(JSON.stringify(finish)).not.toContain("secret-productspec-runner");
  });

  it("keeps complete routing and exact-close checks for ProductSpec contracts", async () => {
    const uncoveredRoot = await repository(PRODUCTSPEC_CONTRACT, { "product/feature.product-spec.md": PRODUCTSPEC });
    await writeFile(path.join(uncoveredRoot, "outside.ts"), "export const outside = true;\n");
    expect(await finishContract({ contractId: "ES-productspec-finish", cwd: uncoveredRoot })).toMatchObject({ result: "blocked" });

    const mixedRoot = await repository(PRODUCTSPEC_CONTRACT, { "product/feature.product-spec.md": PRODUCTSPEC });
    await writeFile(path.join(mixedRoot, "src", "change.ts"), "export const value = 2;\n");
    const contractPath = path.join(mixedRoot, "specs", "change.engineering-spec.md");
    await writeFile(contractPath, (await readFile(contractPath, "utf8")).replace("title: ProductSpec finish regression", "title: Unsafe mixed close"));
    expect(await finishContract({ contractId: "ES-productspec-finish", cwd: mixedRoot, writeClosure: true })).toMatchObject({ result: "blocked" });
  });

  it("still rejects malformed and missing trusted-base contracts", async () => {
    const malformedRoot = await repository(PRODUCTSPEC_CONTRACT.replace("paths: [src/**, product/**]", "paths: [../escape]"), { "product/feature.product-spec.md": PRODUCTSPEC });
    expect(await finishContract({ contractId: "ES-productspec-finish", cwd: malformedRoot })).toMatchObject({ result: "blocked" });

    const missingRoot = await repository(PRODUCTSPEC_CONTRACT, { "product/feature.product-spec.md": PRODUCTSPEC });
    expect(await finishContract({ contractId: "ES-missing", cwd: missingRoot })).toMatchObject({ result: "blocked" });
  });

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
