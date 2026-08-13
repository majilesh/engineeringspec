import { readFile } from "node:fs/promises";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { summarizeAgentBenchmark, type AgentBenchmarkRecord } from "../../src/cli/benchmark.js";

function complete(condition: AgentBenchmarkRecord["condition"], overrides: Partial<AgentBenchmarkRecord> = {}): AgentBenchmarkRecord {
  return {
    taskId: "task-1",
    taskRiskTier: "medium",
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

const BASE_SHA = "a".repeat(40);
const DIGEST = `sha256:${"b".repeat(64)}`;

function completeV2(condition: AgentBenchmarkRecord["condition"], negative = false): AgentBenchmarkRecord {
  const head = condition === "baseline" ? "c".repeat(40) : "d".repeat(40);
  const denied = negative && condition === "engineeringspec" ? 1 : 0;
  const selected = condition === "baseline" ? 5 : 4;
  return complete(condition, {
    repositoryRevision: BASE_SHA,
    headRevision: head,
    taskPromptDigest: DIGEST,
    agentVersion: "agent-a@1",
    harnessVersion: "harness@1",
    engineeringSpecVersion: "0.1.0-rc.12",
    startedAt: condition === "baseline" ? "2026-08-12T00:00:00Z" : "2026-08-12T01:00:00Z",
    reviewBlinded: true,
    unauthorizedPathsChanged: denied,
    scope: null,
    scopeReceipt: {
      schemaVersion: "0.2",
      authority: "base_pinned_repository_routing",
      authorization: "none",
      contract: { id: "ES-task", revision: 1, path: "docs/engineering-specs/task.engineering-spec.md", digest: DIGEST },
      baseSha: BASE_SHA,
      headSha: head,
      candidateSetDigest: DIGEST,
      routingDecisionDigest: condition === "baseline" ? `sha256:${"e".repeat(64)}` : `sha256:${"f".repeat(64)}`,
      method: { unit: "repository_path", version: "concrete-paths-v2" },
      authorityBreadth: "finite",
      metricEligibility: denied > 0
        ? { scopePrecision: false, reason: "negative_routing_outcome" }
        : { scopePrecision: true, reason: "eligible" },
      counts: {
        approvedWritablePaths: 10,
        actualChangedPaths: selected + denied,
        selectedForRequestedContract: selected,
        selectedForOtherContracts: 0,
        denied,
        ambiguous: 0,
        uncovered: 0,
      },
      digests: {
        approvedWritablePaths: DIGEST,
        actualChangedPaths: DIGEST,
        selectedForRequestedContract: DIGEST,
        selectedForOtherContracts: DIGEST,
        denied: DIGEST,
        ambiguous: DIGEST,
        uncovered: DIGEST,
      },
      limitations: ["Unsigned measurement evidence."],
    },
  });
}

describe("agent-impact benchmark", () => {
  it("publishes complete v2 pairs while retaining negative outcomes without numeric precision", async () => {
    const records = [completeV2("baseline"), completeV2("engineeringspec")];
    const schema = JSON.parse(await readFile("benchmarks/agent-impact.schema.json", "utf8")) as object;
    const validate = new Ajv2020({ strict: true }).compile(schema);
    expect(records.every((record) => validate(record))).toBe(true);
    const publishable = summarizeAgentBenchmark(records);
    expect(publishable.interpretation).toMatchObject({ evidenceQuality: "complete", publishable: true });
    expect(publishable.engineeringspec.scope).toMatchObject({ assessment: "measured", averagePrecision: 0.4 });

    const negative = summarizeAgentBenchmark([completeV2("baseline"), completeV2("engineeringspec", true)]);
    expect(negative.interpretation).toMatchObject({ evidenceQuality: "complete", publishable: true });
    expect(negative.engineeringspec.scope).toMatchObject({ assessment: "not_interpretable_negative_outcome", averagePrecision: null });
  });
  it("stratifies paired outcomes deterministically and keeps human cost separate", () => {
    const pair = (taskRiskTier: "low" | "medium" | "high", taskId: string, baselineDuration: number, specDuration: number) => [
      complete("baseline", { taskId, pairId: taskId, runId: `${taskId}-baseline`, taskRiskTier, durationSeconds: baselineDuration }),
      complete("engineeringspec", { taskId, pairId: taskId, runId: `${taskId}-spec`, taskRiskTier, durationSeconds: specDuration }),
    ];
    const records = [
      ...pair("high", "high-task", 200, 240),
      ...pair("low", "low-task", 100, 110),
      ...pair("medium", "medium-task", 50, 40),
    ];
    const result = summarizeAgentBenchmark([...records].reverse());
    expect(result.tiers.map((tier) => tier.taskRiskTier)).toEqual(["low", "medium", "high"]);
    expect(result.tiers[0]).toMatchObject({
      taskRiskTier: "low",
      tasks: 1,
      pairs: 1,
      runs: 2,
      overhead: {
        averageAbsoluteDurationSeconds: 10,
        averageRelativeDuration: 0.1,
        relativeDurationEligiblePairs: 1,
        zeroBaselineDurationPairs: 0,
        averageContractAuthoringSeconds: 20,
        averageContractReviewSeconds: 10,
      },
    });
    expect(result.tiers[1]?.overhead).toMatchObject({ averageAbsoluteDurationSeconds: -10, averageRelativeDuration: -0.2 });
    expect(result.tiers[2]?.pairedOutcomes.slowerEngineeringSpecRuns).toBe(1);
  });

  it("retains zero-duration pairs while excluding only their relative overhead", () => {
    const result = summarizeAgentBenchmark([
      complete("baseline", { taskRiskTier: "low", durationSeconds: 0 }),
      complete("engineeringspec", { taskRiskTier: "low", durationSeconds: 5 }),
    ]);
    expect(result.tiers[0]?.overhead).toEqual(expect.objectContaining({
      averageAbsoluteDurationSeconds: 5,
      averageRelativeDuration: null,
      relativeDurationEligiblePairs: 0,
      zeroBaselineDurationPairs: 1,
    }));
    expect(result.tiers[0]?.pairs).toBe(1);
  });

  it("rejects invalid or mismatched tiers without inferring missing values", () => {
    const missingTier = complete("engineeringspec");
    delete missingTier.taskRiskTier;
    expect(() => summarizeAgentBenchmark([
      { ...complete("baseline"), taskRiskTier: "critical" },
      complete("engineeringspec"),
    ])).toThrow("taskRiskTier must be low, medium, or high");
    expect(() => summarizeAgentBenchmark([
      complete("baseline", { taskRiskTier: "low" }),
      complete("engineeringspec", { taskRiskTier: "high" }),
    ])).toThrow("preserve taskRiskTier");
    expect(() => summarizeAgentBenchmark([
      complete("baseline", { taskRiskTier: "low" }),
      missingTier,
    ])).toThrow("preserve taskRiskTier on both conditions");
  });
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
      interpretation: { causalInferenceSupported: false, resultClass: "observed", evidenceQuality: "incomplete", publishable: false },
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
    expect(result.missingData.taskRiskTier).toBe(2);
    expect(result.tiers).toEqual([]);
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
    ]).interpretation.publishable).toBe(false);
  });

  it("fails closed on malformed v2 partitions, revision drift, and merged-path contradictions", () => {
    const malformed = completeV2("engineeringspec");
    const receipt = malformed.scopeReceipt as Exclude<AgentBenchmarkRecord["scopeReceipt"], null | undefined> & { schemaVersion: "0.2" };
    receipt.counts.uncovered = 1;
    expect(() => summarizeAgentBenchmark([completeV2("baseline"), malformed])).toThrow("do not partition");

    const extraField = completeV2("engineeringspec");
    (extraField.scopeReceipt as unknown as Record<string, unknown>).runner = { argv: ["must-not-appear"] };
    expect(() => summarizeAgentBenchmark([completeV2("baseline"), extraField])).toThrow("unsupported fields");

    expect(() => summarizeAgentBenchmark([
      completeV2("baseline"),
      completeV2("engineeringspec", false) as AgentBenchmarkRecord & { headRevision: string },
    ].map((record, index) => index === 1 ? { ...record, headRevision: "0".repeat(40) } : record))).toThrow("headRevision must equal");

    expect(() => summarizeAgentBenchmark([
      completeV2("baseline"),
      completeV2("engineeringspec", false),
    ].map((record, index) => index === 1 ? { ...record, unauthorizedPathsChanged: 0, unauthorizedPathsMerged: 1 } : record))).toThrow("cannot exceed unauthorizedPathsChanged");
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
    expect(open.interpretation.publishable).toBe(false);
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

  it("keeps tier-less v2 records readable but non-publishable", () => {
    const records = [completeV2("baseline"), completeV2("engineeringspec")];
    for (const record of records) delete record.taskRiskTier;
    const result = summarizeAgentBenchmark(records);
    expect(result.missingData.taskRiskTier).toBe(2);
    expect(result.tiers).toEqual([]);
    expect(result.interpretation).toMatchObject({ evidenceQuality: "incomplete", publishable: false });
  });

});
