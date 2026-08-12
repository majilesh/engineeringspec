import { readFile } from "node:fs/promises";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { summarizeAgentBenchmark, type AgentBenchmarkRecord } from "../../src/cli/benchmark.js";

function complete(condition: AgentBenchmarkRecord["condition"], overrides: Partial<AgentBenchmarkRecord> = {}): AgentBenchmarkRecord {
  return {
    taskId: "task-1",
    pairId: "pair-1",
    runId: `run-${condition}`,
    condition,
    conditionIdentity: `${condition}-v1`,
    evidenceClass: "observed",
    repositoryRevision: "abc123",
    agent: "agent-a",
    model: "model-v1",
    promptIntent: "Implement the accepted change",
    permissions: ["read", "write", "test"],
    trustedChecks: ["npm test"],
    agentConfiguration: "config-v1",
    timeLimitSeconds: 1200,
    acceptanceReviewerId: "reviewer-opaque-1",
    conditionSequence: condition === "baseline" ? 1 : 2,
    success: condition === "engineeringspec",
    scopeViolations: condition === "baseline" ? 2 : 0,
    reviewCorrections: condition === "baseline" ? 2 : 1,
    durationSeconds: condition === "baseline" ? 100 : 110,
    inputTokens: 100,
    outputTokens: 50,
    contractAuthoringSeconds: condition === "baseline" ? 0 : 20,
    contractReviewSeconds: condition === "baseline" ? 0 : 10,
    contractAmendments: condition === "baseline" ? 0 : 1,
    firstPassGateSuccess: condition === "baseline" ? "not_applicable" : false,
    reviewCycles: condition === "baseline" ? 2 : 1,
    exploredPaths: condition === "baseline" ? 20 : 15,
    unauthorizedPathsChanged: condition === "baseline" ? 2 : 0,
    unauthorizedPathsMerged: 0,
    scope: {
      unit: "repository_path",
      methodVersion: "concrete-paths-v1",
      approvedWritablePaths: 10,
      actualChangedPaths: condition === "baseline" ? 7 : 4,
      catchAllTarget: false,
      authorityBreadth: "finite",
    },
    ...overrides,
  };
}

describe("agent-impact benchmark", () => {
  it("retains failed, slower, and amended runs while reporting scope precision", () => {
    const result = summarizeAgentBenchmark([complete("baseline"), complete("engineeringspec")]);
    expect(result).toMatchObject({
      tasks: 1,
      pairs: 1,
      runs: 2,
      evidence: { observedRuns: 2, exampleRuns: 0, unclassifiedRuns: 0 },
      baseline: { failedRuns: 1 },
      engineeringspec: {
        failedRuns: 0,
        firstPassGateSuccessRate: 0,
        amendedRunRate: 1,
        scope: { assessment: "measured", catchAllRuns: 0 },
      },
      pairedOutcomes: { slowerEngineeringSpecRuns: 1, amendedEngineeringSpecRuns: 1 },
      interpretation: { causalInferenceSupported: false, resultClass: "observed", evidenceQuality: "complete", publishable: true },
    });
    expect(result.delta.scopePrecision).toBeCloseTo(0.4);
    expect(result.missingData.repositoryRevision).toBe(0);
  });

  it("does not present catch-all authorization as meaningful precision", () => {
    const result = summarizeAgentBenchmark([
      complete("baseline", { scopeViolations: 0, scope: { unit: "repository_path", methodVersion: "concrete-paths-v1", approvedWritablePaths: 100, actualChangedPaths: 4, catchAllTarget: true } }),
      complete("engineeringspec", { scopeViolations: 0, scope: { unit: "repository_path", methodVersion: "concrete-paths-v1", approvedWritablePaths: 100, actualChangedPaths: 4, catchAllTarget: true } }),
    ]);
    expect(result.engineeringspec.scope).toMatchObject({ catchAllRuns: 1, assessment: "not_interpretable_repository_wide", averagePrecision: null });
    expect(result.delta.scopePrecision).toBeNull();
  });

  it("accepts legacy records but makes every missing observation visible", () => {
    const legacy = (condition: AgentBenchmarkRecord["condition"]): AgentBenchmarkRecord => ({
      taskId: "legacy",
      runId: `legacy-${condition}`,
      condition,
      agent: "agent",
      success: true,
      scopeViolations: 0,
      reviewCorrections: 0,
      durationSeconds: 1,
      inputTokens: 1,
      outputTokens: 1,
    });
    const result = summarizeAgentBenchmark([legacy("baseline"), legacy("engineeringspec")]);
    expect(result.interpretation.resultClass).toBe("mixed_or_unclassified");
    expect(result.missingData.repositoryRevision).toBe(2);
    expect(result.engineeringspec.scope.assessment).toBe("insufficient_data");
    expect(result.interpretation).toMatchObject({ evidenceQuality: "incomplete", publishable: false });
  });

  it("rejects incomparable pairs and impossible path measurements", () => {
    expect(() => summarizeAgentBenchmark([
      complete("baseline"),
      complete("engineeringspec", { repositoryRevision: "different" }),
    ])).toThrow("preserve repositoryRevision");
    expect(() => summarizeAgentBenchmark([
      complete("baseline"),
      complete("engineeringspec", {
        unauthorizedPathsChanged: 5,
        scope: { unit: "repository_path", methodVersion: "concrete-paths-v1", approvedWritablePaths: 10, actualChangedPaths: 4, catchAllTarget: false },
      }),
    ])).toThrow("cannot exceed actualChangedPaths");
    expect(() => summarizeAgentBenchmark([
      complete("baseline"),
      complete("engineeringspec", {
        scope: { unit: "repository_path", methodVersion: "concrete-paths-v1", approvedWritablePaths: 1, actualChangedPaths: 100, catchAllTarget: false, authorityBreadth: "finite" },
      }),
    ])).toThrow("authorized changed paths cannot exceed approved writable paths");
    expect(() => summarizeAgentBenchmark([
      complete("baseline", { conditionSequence: 1 }),
      complete("engineeringspec", { conditionSequence: 1 }),
    ])).toThrow("conditionSequence 1 and 2");
    expect(() => summarizeAgentBenchmark([
      complete("baseline", { acceptanceReviewerId: "reviewer-a" }),
      complete("engineeringspec", { acceptanceReviewerId: "reviewer-b" }),
    ])).toThrow("preserve acceptanceReviewerId");
  });

  it("rejects disagreement between legacy scope fields and an embedded receipt", () => {
    const scopeReceipt = {
      schemaVersion: "0.1" as const,
      method: { unit: "repository_path" as const, version: "concrete-paths-v1" as const },
      authorityBreadth: "finite" as const,
      counts: { approvedWritablePaths: 10, actualChangedPaths: 4, authorizedChangedPaths: 4, unauthorizedPathsChanged: 0 },
    };
    expect(() => summarizeAgentBenchmark([
      complete("baseline"),
      complete("engineeringspec", { scopeReceipt: { ...scopeReceipt, counts: { ...scopeReceipt.counts, approvedWritablePaths: 9 } } }),
    ])).toThrow("scope and scopeReceipt disagree");
    expect(summarizeAgentBenchmark([
      complete("baseline", { scopeReceipt: { ...scopeReceipt, counts: { ...scopeReceipt.counts, actualChangedPaths: 7, authorizedChangedPaths: 5, unauthorizedPathsChanged: 2 } } }),
      complete("engineeringspec", { scopeReceipt }),
    ]).interpretation.publishable).toBe(true);
  });

  it("keeps observed provenance separate from completeness and open authority", () => {
    const missingRevision = complete("baseline");
    delete missingRevision.repositoryRevision;
    const incomplete = summarizeAgentBenchmark([
      missingRevision,
      complete("engineeringspec"),
    ]);
    expect(incomplete.interpretation).toMatchObject({ resultClass: "observed", evidenceQuality: "incomplete", publishable: false });
    const open = summarizeAgentBenchmark([
      complete("baseline", { unauthorizedPathsChanged: 0, scope: { unit: "repository_path", methodVersion: "concrete-paths-v1", approvedWritablePaths: 1, actualChangedPaths: 1, catchAllTarget: false, authorityBreadth: "open_create_namespace" } }),
      complete("engineeringspec", { unauthorizedPathsChanged: 0, scope: { unit: "repository_path", methodVersion: "concrete-paths-v1", approvedWritablePaths: 1, actualChangedPaths: 1, catchAllTarget: false, authorityBreadth: "open_create_namespace" } }),
    ]);
    expect(open.interpretation.publishable).toBe(true);
    expect(open.engineeringspec.scope.assessment).toBe("not_interpretable_open_create");
    expect(open.delta.scopePrecision).toBeNull();
  });

  it("keeps the bundled example schema-valid and explicitly non-observed", async () => {
    const schema = JSON.parse(await readFile("benchmarks/agent-impact.schema.json", "utf8")) as object;
    const records = JSON.parse(await readFile("benchmarks/example-results.json", "utf8")) as unknown[];
    const validate = new Ajv2020({ strict: true }).compile(schema);
    expect(records.every((record) => validate(record))).toBe(true);
    const result = summarizeAgentBenchmark(records);
    expect(result.interpretation.resultClass).toBe("example");
    expect(result.interpretation.note).toContain("must not be presented");
  });

  it("starts the public pilot at honest zero evidence with consent disabled", async () => {
    const status = JSON.parse(await readFile("maintainer-only pilot records/status.json", "utf8")) as Record<string, unknown>;
    const template = JSON.parse(await readFile("maintainer-only pilot records/pilot-template.json", "utf8")) as { consent: Record<string, boolean | null>; completedPairedTasks: number };
    expect(status).toMatchObject({
      status: "recruiting",
      observedPairedTasks: 0,
      externalParticipants: 0,
      externalRepositories: 0,
    });
    expect(String(status.claim)).toContain("No external comparative outcome");
    expect(template.completedPairedTasks).toBe(0);
    expect(template.consent).toMatchObject({ measurement: false, aggregatePublication: false, caseStudyPublication: false });
  });
});
