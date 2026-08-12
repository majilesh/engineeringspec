export type BenchmarkCondition = "baseline" | "engineeringspec";
export type BenchmarkEvidenceClass = "observed" | "example";
export type AuthorityBreadth = "finite" | "open_create_namespace" | "repository_wide";

export interface BenchmarkScopeMeasurement {
  unit: "repository_path";
  methodVersion: "concrete-paths-v1";
  approvedWritablePaths: number;
  actualChangedPaths: number;
  catchAllTarget: boolean;
  authorityBreadth?: AuthorityBreadth;
}

export interface EmbeddedScopeReceipt {
  schemaVersion: "0.1";
  method: { unit: "repository_path"; version: "concrete-paths-v1" };
  authorityBreadth: AuthorityBreadth;
  counts: {
    approvedWritablePaths: number;
    actualChangedPaths: number;
    authorizedChangedPaths: number;
    unauthorizedPathsChanged: number;
  };
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
  timeLimitSeconds?: number;
  acceptanceReviewerId?: string;
  conditionSequence?: 1 | 2;
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
  scopeReceipt?: EmbeddedScopeReceipt | null;
}

export interface BenchmarkScopeSummary {
  eligibleRuns: number;
  catchAllRuns: number;
  openCreateRuns: number;
  missingRuns: number;
  averagePrecision: number | null;
  assessment: "measured" | "not_interpretable_open_create" | "not_interpretable_repository_wide" | "insufficient_data";
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
    evidenceQuality: "complete" | "incomplete";
    publishable: boolean;
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
  "timeLimitSeconds",
] as const;

const OPTIONAL_INTEGER_FIELDS = new Set<string>([
  "contractAmendments",
  "reviewCycles",
  "exploredPaths",
  "unauthorizedPathsChanged",
  "unauthorizedPathsMerged",
  "conditionSequence",
]);

const COMPARABILITY_FIELDS = [
  "repositoryRevision",
  "model",
  "promptIntent",
  "permissions",
  "trustedChecks",
  "agentConfiguration",
  "timeLimitSeconds",
  "acceptanceReviewerId",
] as const;

const PUBLISHABLE_FIELDS = [
  ...COMPARABILITY_FIELDS,
  ...OPTIONAL_NUMBER_FIELDS,
  "pairId",
  "conditionIdentity",
  "evidenceClass",
  "conditionSequence",
  "firstPassGateSuccess",
  "scope",
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
  for (const key of ["pairId", "conditionIdentity", "repositoryRevision", "model", "promptIntent", "agentConfiguration", "acceptanceReviewerId"] as const) {
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
    if (scope.authorityBreadth !== undefined && !["finite", "open_create_namespace", "repository_wide"].includes(scope.authorityBreadth as string)) {
      throw new Error(`benchmark record ${index}.scope.authorityBreadth is invalid`);
    }
    const unauthorized = record.unauthorizedPathsChanged;
    if (typeof unauthorized === "number" && unauthorized > (scope.actualChangedPaths as number)) {
      throw new Error(`benchmark record ${index}.unauthorizedPathsChanged cannot exceed actualChangedPaths`);
    }
    if (typeof unauthorized === "number" && (scope.actualChangedPaths as number) - unauthorized > (scope.approvedWritablePaths as number)) {
      throw new Error(`benchmark record ${index} authorized changed paths cannot exceed approved writable paths`);
    }
  }
  if (record.scopeReceipt !== undefined && record.scopeReceipt !== null) {
    if (typeof record.scopeReceipt !== "object") throw new Error(`benchmark record ${index}.scopeReceipt must be an object or null`);
    const receipt = record.scopeReceipt as Record<string, unknown>;
    const method = receipt.method as Record<string, unknown> | undefined;
    const counts = receipt.counts as Record<string, unknown> | undefined;
    if (receipt.schemaVersion !== "0.1" || method?.unit !== "repository_path" || method.version !== "concrete-paths-v1") {
      throw new Error(`benchmark record ${index}.scopeReceipt uses an unsupported measurement method`);
    }
    if (!["finite", "open_create_namespace", "repository_wide"].includes(receipt.authorityBreadth as string)) {
      throw new Error(`benchmark record ${index}.scopeReceipt.authorityBreadth is invalid`);
    }
    for (const key of ["approvedWritablePaths", "actualChangedPaths", "authorizedChangedPaths", "unauthorizedPathsChanged"] as const) {
      if (!Number.isInteger(counts?.[key]) || (counts![key] as number) < 0) {
        throw new Error(`benchmark record ${index}.scopeReceipt.counts.${key} must be a non-negative integer`);
      }
    }
    if ((counts!.unauthorizedPathsChanged as number) > (counts!.actualChangedPaths as number)
      || (counts!.authorizedChangedPaths as number) !== (counts!.actualChangedPaths as number) - (counts!.unauthorizedPathsChanged as number)
      || (counts!.authorizedChangedPaths as number) > (counts!.approvedWritablePaths as number)) {
      throw new Error(`benchmark record ${index}.scopeReceipt contains inconsistent path counts`);
    }
    if (record.scope) {
      const legacyScope = record.scope as unknown as BenchmarkScopeMeasurement;
      const scopeBreadth = legacyScope.authorityBreadth ?? (legacyScope.catchAllTarget ? "repository_wide" : "finite");
      if (legacyScope.approvedWritablePaths !== counts!.approvedWritablePaths
        || legacyScope.actualChangedPaths !== counts!.actualChangedPaths
        || scopeBreadth !== receipt.authorityBreadth
        || (typeof record.unauthorizedPathsChanged === "number" && record.unauthorizedPathsChanged !== counts!.unauthorizedPathsChanged)) {
        throw new Error(`benchmark record ${index} scope and scopeReceipt disagree`);
      }
    }
  }
  if (record.timeLimitSeconds !== undefined && (!(record.timeLimitSeconds as number > 0))) {
    throw new Error(`benchmark record ${index}.timeLimitSeconds must be positive`);
  }
  if (record.conditionSequence !== undefined && record.conditionSequence !== 1 && record.conditionSequence !== 2) {
    throw new Error(`benchmark record ${index}.conditionSequence must be 1 or 2`);
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
  const breadth = (scope: BenchmarkScopeMeasurement): AuthorityBreadth => scope.authorityBreadth ?? (scope.catchAllTarget ? "repository_wide" : "finite");
  const eligible = available.filter(({ record, scope }) => breadth(scope) === "finite"
    && scope.approvedWritablePaths > 0
    && typeof record.unauthorizedPathsChanged === "number");
  const precisions = eligible.map(({ record, scope }) => {
    const authorizedChangedPaths = Math.max(0, scope.actualChangedPaths - (record.unauthorizedPathsChanged ?? 0));
    return authorizedChangedPaths / scope.approvedWritablePaths;
  });
  const catchAllRuns = available.filter(({ scope }) => breadth(scope) === "repository_wide").length;
  const openCreateRuns = available.filter(({ scope }) => breadth(scope) === "open_create_namespace").length;
  return {
    eligibleRuns: eligible.length,
    catchAllRuns,
    openCreateRuns,
    missingRuns: records.length - eligible.length - catchAllRuns - openCreateRuns,
    averagePrecision: mean(precisions),
    assessment: catchAllRuns > 0
      ? "not_interpretable_repository_wide"
      : openCreateRuns > 0 ? "not_interpretable_open_create"
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
      || (left.scope.authorityBreadth ?? (left.scope.catchAllTarget ? "repository_wide" : "finite"))
        !== (right.scope.authorityBreadth ?? (right.scope.catchAllTarget ? "repository_wide" : "finite"))
    )) {
      throw new Error(`benchmark pair ${JSON.stringify(key)} must preserve the approved scope method and surface`);
    }
    if (left.conditionSequence !== undefined && right.conditionSequence !== undefined
      && new Set([left.conditionSequence, right.conditionSequence]).size !== 2) {
      throw new Error(`benchmark pair ${JSON.stringify(key)} must contain conditionSequence 1 and 2`);
    }
    pairs.push({ baseline: left, engineeringspec: right });
  }

  const baselineRecords = pairs.map((pair) => pair.baseline);
  const specRecords = pairs.map((pair) => pair.engineeringspec);
  if (pairs.length === 0) throw new Error("benchmark requires at least one paired task");
  const baseline = summarizeCondition(baselineRecords);
  const engineeringspec = summarizeCondition(specRecords);
  const missingData: Record<string, number> = {};
  for (const field of [...COMPARABILITY_FIELDS, ...OPTIONAL_NUMBER_FIELDS, "pairId", "conditionIdentity", "evidenceClass", "firstPassGateSuccess", "conditionSequence", "scope"] as const) {
    missingData[field] = records.filter((record) => record[field] === undefined || record[field] === null).length;
  }
  const observedRuns = records.filter((record) => record.evidenceClass === "observed").length;
  const exampleRuns = records.filter((record) => record.evidenceClass === "example").length;
  const unclassifiedRuns = records.length - observedRuns - exampleRuns;
  const resultClass = observedRuns === records.length
    ? "observed"
    : exampleRuns === records.length ? "example" : "mixed_or_unclassified";
  const complete = PUBLISHABLE_FIELDS.every((field) => records.every((record) => record[field] !== undefined && record[field] !== null))
    && records.every((record) => record.scope?.authorityBreadth !== undefined);
  const sequenceComplete = pairs.every((pair) => new Set([pair.baseline.conditionSequence, pair.engineeringspec.conditionSequence]).size === 2);
  const evidenceQuality = complete && sequenceComplete ? "complete" : "incomplete";
  const publishable = resultClass === "observed" && evidenceQuality === "complete";
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
      evidenceQuality,
      publishable,
      note: resultClass === "observed"
        ? "Observed paired results are descriptive for this sample; they do not establish causality."
        : "Example, mixed, or unclassified inputs must not be presented as observed product impact.",
    },
  };
}
