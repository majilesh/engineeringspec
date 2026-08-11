export type BenchmarkCondition = "baseline" | "engineeringspec";
export type BenchmarkEvidenceClass = "observed" | "example";

export interface BenchmarkScopeMeasurement {
  unit: "repository_path";
  methodVersion: "concrete-paths-v1";
  approvedWritablePaths: number;
  actualChangedPaths: number;
  catchAllTarget: boolean;
}

export interface AgentBenchmarkRecord {
  taskId: string;
  runId: string;
  pairId?: string;
  condition: BenchmarkCondition;
  conditionIdentity?: string;
  evidenceClass?: BenchmarkEvidenceClass;
  repositoryRevision?: string;
  agent: string;
  model?: string;
  promptIntent?: string;
  permissions?: string[];
  trustedChecks?: string[];
  agentConfiguration?: string;
  success: boolean;
  scopeViolations: number;
  reviewCorrections: number;
  durationSeconds: number;
  inputTokens: number;
  outputTokens: number;
  contractAuthoringSeconds?: number | null;
  contractReviewSeconds?: number | null;
  contractAmendments?: number | null;
  firstPassGateSuccess?: boolean | "not_applicable" | null;
  reviewCycles?: number | null;
  exploredPaths?: number | null;
  unauthorizedPathsChanged?: number | null;
  unauthorizedPathsMerged?: number | null;
  scope?: BenchmarkScopeMeasurement | null;
}

export interface BenchmarkScopeSummary {
  eligibleRuns: number;
  catchAllRuns: number;
  missingRuns: number;
  averagePrecision: number | null;
  assessment: "measured" | "not_interpretable_catch_all" | "insufficient_data";
}

export interface BenchmarkConditionSummary {
  runs: number;
  failedRuns: number;
  successRate: number;
  averageScopeViolations: number;
  averageReviewCorrections: number;
  averageDurationSeconds: number;
  averageTokens: number;
  averageContractAuthoringSeconds: number | null;
  averageContractReviewSeconds: number | null;
  averageContractAmendments: number | null;
  amendedRunRate: number | null;
  firstPassGateSuccessRate: number | null;
  averageReviewCycles: number | null;
  averageExploredPaths: number | null;
  averageUnauthorizedPathsChanged: number | null;
  averageUnauthorizedPathsMerged: number | null;
  scope: BenchmarkScopeSummary;
}

export interface AgentBenchmarkSummary {
  tasks: number;
  pairs: number;
  runs: number;
  evidence: { observedRuns: number; exampleRuns: number; unclassifiedRuns: number };
  missingData: Record<string, number>;
  baseline: BenchmarkConditionSummary;
  engineeringspec: BenchmarkConditionSummary;
  pairedOutcomes: {
    slowerEngineeringSpecRuns: number;
    amendedEngineeringSpecRuns: number;
  };
  delta: {
    successRate: number;
    scopeViolationReduction: number;
    reviewCorrectionReduction: number;
    durationSeconds: number;
    tokens: number;
    unauthorizedPathsChangedReduction: number | null;
    unauthorizedPathsMergedReduction: number | null;
    scopePrecision: number | null;
  };
  interpretation: {
    causalInferenceSupported: false;
    resultClass: "observed" | "example" | "mixed_or_unclassified";
    note: string;
  };
}

const OPTIONAL_NUMBER_FIELDS = [
  "contractAuthoringSeconds",
  "contractReviewSeconds",
  "contractAmendments",
  "reviewCycles",
  "exploredPaths",
  "unauthorizedPathsChanged",
  "unauthorizedPathsMerged",
] as const;

const OPTIONAL_INTEGER_FIELDS = new Set<string>([
  "contractAmendments",
  "reviewCycles",
  "exploredPaths",
  "unauthorizedPathsChanged",
  "unauthorizedPathsMerged",
]);

const COMPARABILITY_FIELDS = [
  "repositoryRevision",
  "model",
  "promptIntent",
  "permissions",
  "trustedChecks",
  "agentConfiguration",
] as const;

function assertStringArray(value: unknown, label: string): asserts value is string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
    throw new Error(`${label} must be an array of non-empty strings`);
  }
  if (new Set(value).size !== value.length) throw new Error(`${label} must not contain duplicates`);
}

function assertOptionalNumber(record: Record<string, unknown>, key: string, index: number): void {
  const value = record[key];
  if (value === undefined || value === null) return;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`benchmark record ${index}.${key} must be null or a non-negative finite number`);
  }
  if (OPTIONAL_INTEGER_FIELDS.has(key) && !Number.isInteger(value)) {
    throw new Error(`benchmark record ${index}.${key} must be an integer when provided`);
  }
}

function assertRecord(value: unknown, index: number): asserts value is AgentBenchmarkRecord {
  if (!value || typeof value !== "object") throw new Error(`benchmark record ${index} must be an object`);
  const record = value as Record<string, unknown>;
  for (const key of ["taskId", "runId", "agent"] as const) {
    if (typeof record[key] !== "string" || record[key].length === 0) throw new Error(`benchmark record ${index}.${key} must be a non-empty string`);
  }
  for (const key of ["pairId", "conditionIdentity", "repositoryRevision", "model", "promptIntent", "agentConfiguration"] as const) {
    if (record[key] !== undefined && (typeof record[key] !== "string" || record[key].length === 0)) {
      throw new Error(`benchmark record ${index}.${key} must be a non-empty string when provided`);
    }
  }
  if (record.condition !== "baseline" && record.condition !== "engineeringspec") {
    throw new Error(`benchmark record ${index}.condition must be baseline or engineeringspec`);
  }
  if (record.evidenceClass !== undefined && record.evidenceClass !== "observed" && record.evidenceClass !== "example") {
    throw new Error(`benchmark record ${index}.evidenceClass must be observed or example`);
  }
  if (typeof record.success !== "boolean") throw new Error(`benchmark record ${index}.success must be boolean`);
  for (const key of ["scopeViolations", "reviewCorrections", "durationSeconds", "inputTokens", "outputTokens"] as const) {
    if (typeof record[key] !== "number" || !Number.isFinite(record[key]) || record[key] < 0) {
      throw new Error(`benchmark record ${index}.${key} must be a non-negative finite number`);
    }
  }
  for (const key of OPTIONAL_NUMBER_FIELDS) assertOptionalNumber(record, key, index);
  for (const key of ["permissions", "trustedChecks"] as const) {
    if (record[key] !== undefined) assertStringArray(record[key], `benchmark record ${index}.${key}`);
  }
  if (record.firstPassGateSuccess !== undefined && record.firstPassGateSuccess !== null
    && record.firstPassGateSuccess !== true && record.firstPassGateSuccess !== false
    && record.firstPassGateSuccess !== "not_applicable") {
    throw new Error(`benchmark record ${index}.firstPassGateSuccess must be boolean, not_applicable, or null`);
  }
  if (record.scope !== undefined && record.scope !== null) {
    if (typeof record.scope !== "object") throw new Error(`benchmark record ${index}.scope must be an object or null`);
    const scope = record.scope as Record<string, unknown>;
    if (scope.unit !== "repository_path" || scope.methodVersion !== "concrete-paths-v1") {
      throw new Error(`benchmark record ${index}.scope must use repository_path and concrete-paths-v1`);
    }
    for (const key of ["approvedWritablePaths", "actualChangedPaths"] as const) {
      if (!Number.isInteger(scope[key]) || (scope[key] as number) < 0) throw new Error(`benchmark record ${index}.scope.${key} must be a non-negative integer`);
    }
    if (typeof scope.catchAllTarget !== "boolean") throw new Error(`benchmark record ${index}.scope.catchAllTarget must be boolean`);
    const unauthorized = record.unauthorizedPathsChanged;
    if (typeof unauthorized === "number" && unauthorized > (scope.actualChangedPaths as number)) {
      throw new Error(`benchmark record ${index}.unauthorizedPathsChanged cannot exceed actualChangedPaths`);
    }
  }
}

function mean(values: number[]): number | null {
  return values.length > 0 ? values.reduce((total, value) => total + value, 0) / values.length : null;
}

function knownNumbers(records: AgentBenchmarkRecord[], key: typeof OPTIONAL_NUMBER_FIELDS[number]): number[] {
  return records.flatMap((record) => typeof record[key] === "number" ? [record[key] as number] : []);
}

function summarizeScope(records: AgentBenchmarkRecord[]): BenchmarkScopeSummary {
  const available = records.flatMap((record) => record.scope ? [{ record, scope: record.scope }] : []);
  const eligible = available.filter(({ record, scope }) => !scope.catchAllTarget
    && scope.approvedWritablePaths > 0
    && typeof record.unauthorizedPathsChanged === "number");
  const precisions = eligible.map(({ record, scope }) => {
    const authorizedChangedPaths = Math.max(0, scope.actualChangedPaths - (record.unauthorizedPathsChanged ?? 0));
    return Math.min(authorizedChangedPaths, scope.approvedWritablePaths) / scope.approvedWritablePaths;
  });
  const catchAllRuns = available.filter(({ scope }) => scope.catchAllTarget).length;
  return {
    eligibleRuns: eligible.length,
    catchAllRuns,
    missingRuns: records.length - eligible.length - catchAllRuns,
    averagePrecision: mean(precisions),
    assessment: catchAllRuns > 0
      ? "not_interpretable_catch_all"
      : precisions.length > 0 ? "measured" : "insufficient_data",
  };
}

function summarizeCondition(records: AgentBenchmarkRecord[]): BenchmarkConditionSummary {
  const average = (select: (record: AgentBenchmarkRecord) => number): number =>
    records.reduce((total, record) => total + select(record), 0) / records.length;
  const amendments = knownNumbers(records, "contractAmendments");
  const gateResults = records.flatMap((record) => typeof record.firstPassGateSuccess === "boolean" ? [record.firstPassGateSuccess] : []);
  return {
    runs: records.length,
    failedRuns: records.filter((record) => !record.success).length,
    successRate: average((record) => Number(record.success)),
    averageScopeViolations: average((record) => record.scopeViolations),
    averageReviewCorrections: average((record) => record.reviewCorrections),
    averageDurationSeconds: average((record) => record.durationSeconds),
    averageTokens: average((record) => record.inputTokens + record.outputTokens),
    averageContractAuthoringSeconds: mean(knownNumbers(records, "contractAuthoringSeconds")),
    averageContractReviewSeconds: mean(knownNumbers(records, "contractReviewSeconds")),
    averageContractAmendments: mean(amendments),
    amendedRunRate: amendments.length > 0 ? amendments.filter((value) => value > 0).length / amendments.length : null,
    firstPassGateSuccessRate: gateResults.length > 0 ? gateResults.filter(Boolean).length / gateResults.length : null,
    averageReviewCycles: mean(knownNumbers(records, "reviewCycles")),
    averageExploredPaths: mean(knownNumbers(records, "exploredPaths")),
    averageUnauthorizedPathsChanged: mean(knownNumbers(records, "unauthorizedPathsChanged")),
    averageUnauthorizedPathsMerged: mean(knownNumbers(records, "unauthorizedPathsMerged")),
    scope: summarizeScope(records),
  };
}

function comparable(value: unknown): string {
  return JSON.stringify(Array.isArray(value) ? [...value].sort() : value);
}

function pairKey(record: AgentBenchmarkRecord): string {
  return record.pairId ?? `${record.taskId}\u0000${record.agent}`;
}

function nullableReduction(baseline: number | null, engineeringSpec: number | null): number | null {
  return baseline === null || engineeringSpec === null ? null : baseline - engineeringSpec;
}

export function summarizeAgentBenchmark(values: unknown[]): AgentBenchmarkSummary {
  values.forEach(assertRecord);
  const records = values as AgentBenchmarkRecord[];
  const runIds = new Set<string>();
  for (const record of records) {
    if (runIds.has(record.runId)) throw new Error(`duplicate benchmark runId ${JSON.stringify(record.runId)}`);
    runIds.add(record.runId);
  }

  const grouped = new Map<string, AgentBenchmarkRecord[]>();
  for (const record of records) grouped.set(pairKey(record), [...(grouped.get(pairKey(record)) ?? []), record]);
  const pairs: Array<{ baseline: AgentBenchmarkRecord; engineeringspec: AgentBenchmarkRecord }> = [];
  for (const [key, pairRecords] of grouped) {
    const baseline = pairRecords.filter((record) => record.condition === "baseline");
    const engineeringspec = pairRecords.filter((record) => record.condition === "engineeringspec");
    if (baseline.length !== 1 || engineeringspec.length !== 1) {
      throw new Error(`benchmark pair ${JSON.stringify(key)} requires exactly one run in each condition`);
    }
    const left = baseline[0]!;
    const right = engineeringspec[0]!;
    if (left.taskId !== right.taskId || left.agent !== right.agent) throw new Error(`benchmark pair ${JSON.stringify(key)} must preserve task and agent`);
    for (const field of COMPARABILITY_FIELDS) {
      const leftValue = left[field];
      const rightValue = right[field];
      if (leftValue !== undefined && rightValue !== undefined && comparable(leftValue) !== comparable(rightValue)) {
        throw new Error(`benchmark pair ${JSON.stringify(key)} must preserve ${field}`);
      }
    }
    if (left.evidenceClass !== undefined && right.evidenceClass !== undefined && left.evidenceClass !== right.evidenceClass) {
      throw new Error(`benchmark pair ${JSON.stringify(key)} must preserve evidenceClass`);
    }
    if (left.scope && right.scope && (
      left.scope.unit !== right.scope.unit
      || left.scope.methodVersion !== right.scope.methodVersion
      || left.scope.approvedWritablePaths !== right.scope.approvedWritablePaths
      || left.scope.catchAllTarget !== right.scope.catchAllTarget
    )) {
      throw new Error(`benchmark pair ${JSON.stringify(key)} must preserve the approved scope method and surface`);
    }
    pairs.push({ baseline: left, engineeringspec: right });
  }

  const baselineRecords = pairs.map((pair) => pair.baseline);
  const specRecords = pairs.map((pair) => pair.engineeringspec);
  if (pairs.length === 0) throw new Error("benchmark requires at least one paired task");
  const baseline = summarizeCondition(baselineRecords);
  const engineeringspec = summarizeCondition(specRecords);
  const missingData: Record<string, number> = {};
  for (const field of [...COMPARABILITY_FIELDS, ...OPTIONAL_NUMBER_FIELDS, "conditionIdentity", "evidenceClass", "firstPassGateSuccess", "scope"] as const) {
    missingData[field] = records.filter((record) => record[field] === undefined || record[field] === null).length;
  }
  const observedRuns = records.filter((record) => record.evidenceClass === "observed").length;
  const exampleRuns = records.filter((record) => record.evidenceClass === "example").length;
  const unclassifiedRuns = records.length - observedRuns - exampleRuns;
  const resultClass = observedRuns === records.length
    ? "observed"
    : exampleRuns === records.length ? "example" : "mixed_or_unclassified";
  return {
    tasks: new Set(records.map((record) => record.taskId)).size,
    pairs: pairs.length,
    runs: records.length,
    evidence: { observedRuns, exampleRuns, unclassifiedRuns },
    missingData,
    baseline,
    engineeringspec,
    pairedOutcomes: {
      slowerEngineeringSpecRuns: pairs.filter((pair) => pair.engineeringspec.durationSeconds > pair.baseline.durationSeconds).length,
      amendedEngineeringSpecRuns: pairs.filter((pair) => (pair.engineeringspec.contractAmendments ?? 0) > 0).length,
    },
    delta: {
      successRate: engineeringspec.successRate - baseline.successRate,
      scopeViolationReduction: baseline.averageScopeViolations - engineeringspec.averageScopeViolations,
      reviewCorrectionReduction: baseline.averageReviewCorrections - engineeringspec.averageReviewCorrections,
      durationSeconds: engineeringspec.averageDurationSeconds - baseline.averageDurationSeconds,
      tokens: engineeringspec.averageTokens - baseline.averageTokens,
      unauthorizedPathsChangedReduction: nullableReduction(baseline.averageUnauthorizedPathsChanged, engineeringspec.averageUnauthorizedPathsChanged),
      unauthorizedPathsMergedReduction: nullableReduction(baseline.averageUnauthorizedPathsMerged, engineeringspec.averageUnauthorizedPathsMerged),
      scopePrecision: engineeringspec.scope.assessment === "measured" ? engineeringspec.scope.averagePrecision : null,
    },
    interpretation: {
      causalInferenceSupported: false,
      resultClass,
      note: resultClass === "observed"
        ? "Observed paired results are descriptive for this sample; they do not establish causality."
        : "Example, mixed, or unclassified inputs must not be presented as observed product impact.",
    },
  };
}
