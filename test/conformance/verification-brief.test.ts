import { readFileSync } from "node:fs";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import type { ReviewReport } from "../../src/cli/review.js";
import type { BriefEvaluationScope } from "../../src/query/verificationBrief.js";
import { projectVerificationBrief } from "../../src/query/verificationBrief.js";
import { verificationBriefHtml } from "../../src/cli/verificationBrief.js";
import type { RouteDecision, EnforcementResult } from "../../src/routing/types.js";

interface Vector { name: string; decision?: RouteDecision; valid: boolean; mode: EnforcementResult["mode"]; outcome: EnforcementResult["outcome"]; scope: BriefEvaluationScope; classification: string; changed: number }
const schema = JSON.parse(readFileSync("schemas/verification-brief-0.1.schema.json", "utf8"));
const validate = new Ajv2020({ strict: true }).compile(schema);
const vectors = JSON.parse(readFileSync("conformance/verification-brief/cases.json", "utf8")) as Vector[];

describe("Visual Verification Brief conformance", () => {
  for (const vector of vectors) {
    it(vector.name, () => {
      const report: ReviewReport = {
        valid: vector.valid, authority: "base_pinned", baseSha: "a".repeat(40), headSha: "b".repeat(40), changedDigest: `sha256:${"c".repeat(64)}`,
        classification: vector.classification, workingState: { changed: vector.changed, selected: vector.decision === "selected" ? 1 : 0, violations: vector.valid ? 0 : 1 },
        enforcement: { mode: vector.mode, outcome: vector.outcome, enforced: vector.mode !== "advisory" }, coverage: { status: "not_applicable", specs: [] }, next: { stage: "verify", message: "Run trusted checks" },
        routes: vector.decision ? [{ path: "src/change.ts", kind: "modified", decision: vector.decision, allows: [], denies: [], claims: [] }] : [],
        contracts: [], diagnostics: [], authorityDiffs: [], sequencing: [],
      };
      const brief = projectVerificationBrief(report, [], vector.scope);
      expect(validate(brief), JSON.stringify(validate.errors)).toBe(true);
      expect(brief.authorized).toBe(vector.valid); expect(brief.enforcement).toEqual(report.enforcement);
      expect(brief.routes).toEqual(report.routes); expect(brief.evaluation.completeWorkingState).toBe(vector.scope === "complete_working_state");
      const html = verificationBriefHtml(brief);
      if (vector.decision) expect(html).toContain(vector.decision);
      if (vector.scope !== "complete_working_state") expect(html).toContain("Partial evaluation");
      if (!vector.valid && vector.outcome === "pass") expect(html).toContain("Advisory enforcement passed, but this change is not authorized");
      if (vector.classification === "contract_only") expect(html).toContain("Contract-only governance grants no implementation authority");
      if (vector.changed === 0) expect(html).toContain("No changed paths to authorize");
    });
  }

  it("rejects dishonest completeness and undeclared format fields", () => {
    const report = { valid: true, baseSha: "a".repeat(40), headSha: "b".repeat(40), changedDigest: `sha256:${"c".repeat(64)}`, classification: "none", enforcement: { mode: "legacy", outcome: "pass", enforced: true }, workingState: { changed: 0, selected: 0, violations: 0 }, coverage: { status: "not_applicable", specs: [] }, next: { stage: "explore", message: "Explore" }, routes: [], contracts: [], diagnostics: [], authorityDiffs: [], sequencing: [], authority: "base_pinned" } as ReviewReport;
    const brief = projectVerificationBrief(report, [], "explicit_paths");
    expect(validate({ ...brief, evaluation: { scope: "explicit_paths", completeWorkingState: true } })).toBe(false);
    expect(validate({ ...brief, authorityGranted: true })).toBe(false);
  });
});
