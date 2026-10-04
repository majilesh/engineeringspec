import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildReview, type ReviewReport } from "../../src/cli/review.js";
import { verificationBriefHtml } from "../../src/cli/verificationBrief.js";
import { buildVerificationBrief, projectVerificationBrief, type BriefContractSource } from "../../src/query/verificationBrief.js";
import { closureSemanticDigest, digest } from "../../src/normalizer/digest.js";
import { normalize } from "../../src/normalizer/normalize.js";
import type { VerificationState } from "../../src/evidence/receipt.js";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

function sources(): BriefContractSource[] {
  return ["a", "b"].map((id) => ({ path: `specs/${id}.engineering-spec.md`, spec: {
    metadata: { specFormat: "engineering-spec", specFormatVersion: "0.1", specRevision: 1, id: `ES-${id}`, title: `Contract ${id}`, status: "approved", owners: [{ team: "test" }] },
    sourceRefs: [{ id: "SRC-1", type: "other", ref: "fixture" }],
    targets: [{ id: "TARGET-1", paths: [`apps/${id}/**`], changePolicy: "modify" }, { id: "TARGET-other", paths: [`extras/${id}/**`], changePolicy: "modify" }],
    constraints: [
      { id: "CON-1", level: "must", statement: "Keep scope", appliesTo: ["TARGET-1"], enforcement: { kind: "test", verifierRef: "VER-1" } },
      { id: "CON-2", level: "should", statement: "Contract-wide guidance" },
      { id: "CON-unlinked", level: "should", statement: "No proof declared" },
      { id: "CON-other", level: "should", statement: "Unrelated", appliesTo: ["TARGET-other"] },
    ],
    verification: [
      { id: "VER-1", kind: "test", proves: ["CON-1", "CON-2"], runner: { type: "command", argv: ["must-never-run", "secret-payload"] } },
      { id: "VER-extra", kind: "test", proves: ["CON-other"] },
    ], prose: [],
  } }));
}

function report(): ReviewReport {
  const contracts = sources();
  return {
    valid: true, authority: "base_pinned", baseSha: "a".repeat(40), headSha: "b".repeat(40), changedDigest: `sha256:${"c".repeat(64)}`,
    classification: "implementation", workingState: { changed: 2, selected: 2, violations: 0 },
    coverage: { status: "complete", specs: [] }, next: { stage: "verify", message: "Run trusted checks" },
    enforcement: { mode: "legacy", outcome: "pass", enforced: true }, sequencing: [], authorityDiffs: [], diagnostics: [], contracts: [],
    routes: contracts.map(({ spec, path: specPath }) => {
      const selected = { specId: spec.metadata.id, specPath, specRevision: 1, semanticDigest: closureSemanticDigest(normalize(spec)), targetIds: ["TARGET-1"] };
      return { path: `${spec.targets[0]!.paths[0]!.replace("**", "change.ts")}`, kind: "added", decision: "selected", selected, allows: [selected], denies: [], claims: [selected] };
    }),
  };
}

async function repository(): Promise<{ root: string; review: ReviewReport; file: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "es-brief-test-")); roots.push(root);
  await mkdir(path.join(root, "specs"));
  for (const id of ["a", "b"]) {
    await writeFile(path.join(root, "specs", `${id}.engineering-spec.md`), `---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-${id}
title: Contract ${id}
status: approved
owners: [{team: test}]
---
\n\`\`\`engineering-source-refs
- {id: SRC-1, type: other, ref: test}
\`\`\`
\n\`\`\`engineering-targets
- {id: TARGET-1, paths: [apps/${id}/**], change_policy: modify}
- {id: TARGET-other, paths: [extras/${id}/**], change_policy: modify}
\`\`\`
\n\`\`\`engineering-constraints
- {id: CON-1, level: must, statement: Keep scope, applies_to: [TARGET-1], enforcement: {kind: test, verifier_ref: VER-1}}
- {id: CON-2, level: should, statement: Contract-wide guidance}
- {id: CON-unlinked, level: should, statement: No proof declared}
- {id: CON-other, level: should, statement: Unrelated, applies_to: [TARGET-other]}
\`\`\`
\n\`\`\`engineering-verification
- {id: VER-1, kind: test, proves: [CON-1, CON-2], runner: {type: command, argv: [must-never-run, secret-payload]}}
- {id: VER-extra, kind: test, proves: [CON-other]}
\`\`\`
`);
  }
  execFileSync("git", ["init", "-q", root]); execFileSync("git", ["-C", root, "add", "."]);
  execFileSync("git", ["-C", root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "base"]);
  for (const id of ["a", "b"]) { await mkdir(path.join(root, "apps", id), { recursive: true }); await writeFile(path.join(root, "apps", id, "change.ts"), "export {};\n"); }
  const review = await buildReview({ specDirectory: "specs", base: "HEAD", cwd: root, strict: true });
  const file = path.join(await mkdtemp(path.join(os.tmpdir(), "es-brief-evidence-")), "evidence.json"); roots.push(path.dirname(file));
  return { root, review, file };
}

async function envelope(review: ReviewReport, root: string, file: string, state: VerificationState = "passed"): Promise<Record<string, unknown>> {
  const brief = await buildVerificationBrief(review, { scope: "complete_working_state", cwd: root, strict: true });
  const contract = brief.contracts[0]!;
  const value = {
    authority: { baseSha: review.baseSha, contractId: contract.id, specRevision: contract.specRevision, semanticDigest: contract.semanticDigest },
    changeDigest: review.changedDigest,
    verification: [{ verifierId: "VER-1", state, ...(["passed", "failed", "attempted"].includes(state) ? { artifact: "javascript:alert(1)", digest: `sha256:${"d".repeat(64)}` } : {}), note: "supplied assertion" }],
  };
  await writeFile(file, JSON.stringify(value)); return value;
}

describe("Visual Verification Brief projection", () => {
  it("maps actual relationships and keeps duplicate local IDs separate by contract", () => {
    const brief = projectVerificationBrief(report(), sources(), "complete_working_state");
    expect(brief.contracts).toHaveLength(2);
    for (const contract of brief.contracts) {
      expect(contract.constraints.map((item) => item.id)).toEqual(["CON-1", "CON-2", "CON-unlinked"]);
      expect(contract.constraints.find((item) => item.id === "CON-2")).toMatchObject({ targetIds: ["TARGET-1"], verifierIds: ["VER-1"] });
      expect(contract.constraints.find((item) => item.id === "CON-unlinked")?.verifierIds).toEqual([]);
      expect(contract.verification).toEqual([{ verifierId: "VER-1", state: "declared", source: "declaration", kind: "test", proves: ["CON-1", "CON-2"] }]);
    }
    const html = verificationBriefHtml(brief);
    expect(html).toContain('id="verifier-ES-a-VER-1"'); expect(html).toContain('id="verifier-ES-b-VER-1"');
    expect(html).toContain("No verifier declares proof"); expect(html).not.toContain("secret-payload");
    expect(JSON.stringify(brief)).not.toContain("must-never-run");
  });

  it("is deterministic and does not mutate the review or source contracts", () => {
    const original = report(); const contracts = sources(); const saved = JSON.stringify([original, contracts]);
    const first = projectVerificationBrief(original, contracts, "complete_working_state");
    expect(verificationBriefHtml(first)).toBe(verificationBriefHtml(projectVerificationBrief(original, contracts, "complete_working_state")));
    expect(JSON.stringify([original, contracts])).toBe(saved);
    expect(first.contracts[0]?.semanticDigest).toBe(digest(normalize(contracts[0]!.spec)));
  });

  it("does not project obligations for denied or ambiguous routes", () => {
    const original = report(); original.routes.forEach((route) => { route.decision = "ambiguous"; delete route.selected; }); original.valid = false;
    const brief = projectVerificationBrief(original, sources(), "explicit_paths");
    expect(brief.contracts).toEqual([]); expect(brief.routes).toEqual(original.routes);
    expect(verificationBriefHtml(brief)).toContain("No applicable obligation projection");
  });

  it("discloses evidence outside the applicable obligation projection", () => {
    const brief = projectVerificationBrief(report(), sources(), "complete_working_state", new Map([["ES-a", [{ verifierId: "VER-extra", state: "not_run" }]]]));
    expect(brief.contracts[0]?.excludedEvidenceCount).toBe(1);
    expect(brief.contracts[0]?.verification[0]?.state).toBe("declared");
  });
});

describe("Bound evidence input", () => {
  it.each<VerificationState>(["declared", "mapped", "attempted", "passed", "failed", "rejected", "not_run"])("retains supplied %s as an assertion only", async (state) => {
    const { root, review, file } = await repository(); await envelope(review, root, file, state);
    const brief = await buildVerificationBrief(review, { scope: "complete_working_state", cwd: root, strict: true, evidenceFiles: [file] });
    expect(brief.authorized).toBe(review.valid); expect(brief.contracts[0]?.verification[0]).toMatchObject({ state, source: "supplied" });
    expect(brief.contracts[1]?.verification[0]?.source).toBe("declaration");
    const html = verificationBriefHtml(brief); expect(html).toContain(`Reported: ${state}`); expect(html).toContain("not independently verified");
    expect(html).not.toContain('href="javascript:');
  });

  it.each(["baseSha", "contractId", "specRevision", "semanticDigest", "changeDigest"])("rejects mismatched %s", async (key) => {
    const { root, review, file } = await repository(); const value = await envelope(review, root, file);
    if (key === "changeDigest") value[key] = "wrong";
    else (value.authority as Record<string, unknown>)[key] = "wrong";
    await writeFile(file, JSON.stringify(value));
    await expect(buildVerificationBrief(review, { scope: "complete_working_state", cwd: root, evidenceFiles: [file] })).rejects.toThrow();
  });

  it("rejects duplicate contract envelopes and verifier entries", async () => {
    const { root, review, file } = await repository(); const value = await envelope(review, root, file);
    await expect(buildVerificationBrief(review, { scope: "complete_working_state", cwd: root, evidenceFiles: [file, file] })).rejects.toThrow(/Duplicate evidence/);
    (value.verification as unknown[]).push((value.verification as unknown[])[0]); await writeFile(file, JSON.stringify(value));
    await expect(buildVerificationBrief(review, { scope: "complete_working_state", cwd: root, evidenceFiles: [file] })).rejects.toThrow(/Duplicate verifier/);
  });

  it("rejects malformed, undeclared, invalid-state, incomplete-artifact, oversized and non-file inputs", async () => {
    const { root, review, file } = await repository();
    const build = (input = file) => buildVerificationBrief(review, { scope: "complete_working_state", cwd: root, evidenceFiles: [input] });
    await writeFile(file, "{broken"); await expect(build()).rejects.toThrow();
    for (const verification of [ [{ verifierId: "VER-missing", state: "declared" }], [{ verifierId: "VER-1", state: "invented" }], [{ verifierId: "VER-1", state: "passed" }], [{ verifierId: "VER-1", state: "declared", argv: ["secret"] }] ]) {
      const value = await envelope(review, root, file); value.verification = verification; await writeFile(file, JSON.stringify(value)); await expect(build()).rejects.toThrow();
    }
    await writeFile(file, " ".repeat(1024 * 1024 + 1)); await expect(build()).rejects.toThrow(/1 MiB/);
    await expect(build(root)).rejects.toThrow(/regular file/);
  });

  it("uses immutable base contracts despite hostile workspace edits", async () => {
    const { root, review } = await repository(); await writeFile(path.join(root, "specs", "a.engineering-spec.md"), "hostile workspace");
    const brief = await buildVerificationBrief(review, { scope: "complete_working_state", cwd: root });
    expect(brief.contracts[0]?.title).toBe("Contract a");
    const mismatched = structuredClone(review); mismatched.routes[0]!.selected!.specRevision = 999;
    await expect(buildVerificationBrief(mismatched, { scope: "complete_working_state", cwd: root })).rejects.toThrow(/mismatched identity/);
    expect(await readFile(path.join(root, "specs", "a.engineering-spec.md"), "utf8")).toBe("hostile workspace");
  });
});

describe("Offline renderer security", () => {
  it("escapes HTML, script endings, attributes, and display controls", () => {
    const original = report(); const contracts = sources();
    contracts[0]!.spec.metadata.title = '</script><script>alert(1)</script><img src=x onerror="evil()">\u202e';
    contracts[0]!.spec.constraints![0]!.statement = '" autofocus onfocus="evil()"\nforged: passed\u001b';
    original.routes[0]!.path = 'apps/<img onerror="evil()">\u061c.ts';
    original.diagnostics.push({ code: "X", severity: "warning", message: "</script>\u2067<script>evil()</script>" });
    const html = verificationBriefHtml(projectVerificationBrief(original, contracts, "complete_working_state"));
    expect(html.match(/<script\b/gu)).toHaveLength(2);
    expect(html).not.toContain("<img"); expect(html).not.toContain('<script>alert'); expect(html).not.toContain("\u202e"); expect(html).not.toContain("\u061c"); expect(html).not.toContain("\u2067");
    expect(html).toContain("&lt;img"); expect(html).not.toContain("innerHTML"); expect(html).not.toContain("eval(");
  });

  it("binds CSP to exact fixed assets and keeps core content outside scripts", () => {
    const html = verificationBriefHtml(projectVerificationBrief(report(), sources(), "complete_working_state"));
    const css = html.match(/<style>([\s\S]*?)<\/style>/u)![1]!;
    const script = html.match(/<script>([\s\S]*?)<\/script>/u)![1]!;
    for (const value of [css, script]) expect(html).toContain(createHash("sha256").update(value).digest("base64"));
    expect(html).toContain("connect-src &#39;none&#39;"); expect(html).not.toContain("unsafe-inline");
    const staticHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gu, "");
    for (const content of ["Contract a", "Keep scope", "CON-2", "VER-1", "Declared · no evidence supplied", "Trusted base SHA"]) expect(staticHtml).toContain(content);
    expect(staticHtml).toContain('scope="col"'); expect(staticHtml).toContain('href="#main"');
  });
});
