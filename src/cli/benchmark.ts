export type BenchmarkCondition = "baseline" | "engineeringspec";

export interface AgentBenchmarkRecord {
  taskId: string;
  runId: string;
  condition: BenchmarkCondition;
  agent: string;
  success: boolean;
  scopeViolations: number;
  reviewCorrections: number;
  durationSeconds: number;
  inputTokens: number;
  outputTokens: number;
}

export interface BenchmarkConditionSummary {
  runs: number;
  successRate: number;
  averageScopeViolations: number;
  averageReviewCorrections: number;
  averageDurationSeconds: number;
  averageTokens: number;
}

export interface AgentBenchmarkSummary {
  tasks: number;
  baseline: BenchmarkConditionSummary;
  engineeringspec: BenchmarkConditionSummary;
  delta: {
    successRate: number;
    scopeViolationReduction: number;
    reviewCorrectionReduction: number;
    durationSeconds: number;
    tokens: number;
  };
}

function assertRecord(value: unknown, index: number): asserts value is AgentBenchmarkRecord {
  if (!value || typeof value !== "object") throw new Error(`benchmark record ${index} must be an object`);
  const record = value as Record<string, unknown>;
  for (const key of ["taskId", "runId", "agent"] as const) {
    if (typeof record[key] !== "string" || record[key].length === 0) throw new Error(`benchmark record ${index}.${key} must be a non-empty string`);
  }
  if (record.condition !== "baseline" && record.condition !== "engineeringspec") {
    throw new Error(`benchmark record ${index}.condition must be baseline or engineeringspec`);
  }
  if (typeof record.success !== "boolean") throw new Error(`benchmark record ${index}.success must be boolean`);
  for (const key of ["scopeViolations", "reviewCorrections", "durationSeconds", "inputTokens", "outputTokens"] as const) {
    if (typeof record[key] !== "number" || !Number.isFinite(record[key]) || record[key] < 0) {
      throw new Error(`benchmark record ${index}.${key} must be a non-negative finite number`);
    }
  }
}

function summarizeCondition(records: AgentBenchmarkRecord[]): BenchmarkConditionSummary {
  const average = (select: (record: AgentBenchmarkRecord) => number): number =>
    records.reduce((total, record) => total + select(record), 0) / records.length;
  return {
    runs: records.length,
    successRate: average((record) => Number(record.success)),
    averageScopeViolations: average((record) => record.scopeViolations),
    averageReviewCorrections: average((record) => record.reviewCorrections),
    averageDurationSeconds: average((record) => record.durationSeconds),
    averageTokens: average((record) => record.inputTokens + record.outputTokens),
  };
}

export function summarizeAgentBenchmark(values: unknown[]): AgentBenchmarkSummary {
  values.forEach(assertRecord);
  const records = values as AgentBenchmarkRecord[];
  const runIds = new Set<string>();
  for (const record of records) {
    if (runIds.has(record.runId)) throw new Error(`duplicate benchmark runId ${JSON.stringify(record.runId)}`);
    runIds.add(record.runId);
  }
  for (const taskId of new Set(records.map((record) => record.taskId))) {
    const taskRecords = records.filter((record) => record.taskId === taskId);
    const baselineAgents = new Set(taskRecords.filter((record) => record.condition === "baseline").map((record) => record.agent));
    const specAgents = new Set(taskRecords.filter((record) => record.condition === "engineeringspec").map((record) => record.agent));
    if (baselineAgents.size === 0 || specAgents.size === 0) {
      throw new Error(`benchmark task ${JSON.stringify(taskId)} requires both conditions`);
    }
    if ([...baselineAgents].some((agent) => !specAgents.has(agent)) || [...specAgents].some((agent) => !baselineAgents.has(agent))) {
      throw new Error(`benchmark task ${JSON.stringify(taskId)} must use the same agents in both conditions`);
    }
  }
  const baselineRecords = records.filter((record) => record.condition === "baseline");
  const specRecords = records.filter((record) => record.condition === "engineeringspec");
  if (baselineRecords.length === 0 || specRecords.length === 0) {
    throw new Error("benchmark requires at least one baseline and one engineeringspec record");
  }
  const baseline = summarizeCondition(baselineRecords);
  const engineeringspec = summarizeCondition(specRecords);
  return {
    tasks: new Set(records.map((record) => record.taskId)).size,
    baseline,
    engineeringspec,
    delta: {
      successRate: engineeringspec.successRate - baseline.successRate,
      scopeViolationReduction: baseline.averageScopeViolations - engineeringspec.averageScopeViolations,
      reviewCorrectionReduction: baseline.averageReviewCorrections - engineeringspec.averageReviewCorrections,
      durationSeconds: engineeringspec.averageDurationSeconds - baseline.averageDurationSeconds,
      tokens: engineeringspec.averageTokens - baseline.averageTokens,
    },
  };
}
