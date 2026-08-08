import type { ChangedFile, ChangeKind, GateReport } from "../gate/types.js";
import { gateDiff } from "../gate/gate.js";
import type { EngineeringSpec } from "../model/types.js";
import { inspect } from "./inspect.js";

export interface AgentPathContext {
  path: string;
  kind: ChangeKind;
  fromPath?: string;
  targets: NonNullable<ReturnType<typeof inspect>["targets"]>;
  constraints: NonNullable<ReturnType<typeof inspect>["constraints"]>;
  contracts: NonNullable<ReturnType<typeof inspect>["contracts"]>;
  verification: Array<{
    id: string;
    kind: EngineeringSpec["verification"][number]["kind"];
    proves: string[];
    runnerType?: NonNullable<EngineeringSpec["verification"][number]["runner"]>["type"];
    runnerInert: true;
  }>;
}

export interface AgentContextReport {
  spec: Pick<EngineeringSpec["metadata"], "id" | "specRevision" | "status" | "title">;
  paths: AgentPathContext[];
}

export function buildAgentContext(spec: EngineeringSpec, changed: ChangedFile[]): AgentContextReport {
  return {
    spec: {
      id: spec.metadata.id,
      specRevision: spec.metadata.specRevision,
      status: spec.metadata.status,
      title: spec.metadata.title,
    },
    paths: changed.map((change) => {
      const result = inspect(spec, { path: change.path });
      return {
        path: change.path,
        kind: change.kind,
        ...(change.fromPath ? { fromPath: change.fromPath } : {}),
        targets: result.targets ?? [],
        constraints: result.constraints ?? [],
        contracts: result.contracts ?? [],
        verification: (result.verification ?? []).map((verification) => ({
          id: verification.id,
          kind: verification.kind,
          proves: verification.proves,
          ...(verification.runner ? { runnerType: verification.runner.type } : {}),
          runnerInert: true as const,
        })),
      };
    }),
  };
}

export interface PathExplanation {
  path: string;
  kind: ChangeKind;
  allowed: boolean;
  gate: Pick<GateReport, "allowed" | "violations" | "diagnostics">;
  context: AgentPathContext;
}

export function explainPath(spec: EngineeringSpec, path: string, kind: ChangeKind = "modified"): PathExplanation {
  const change = { path, kind };
  const context = buildAgentContext(spec, [change]).paths[0]!;
  const gate = gateDiff(spec, [change]);
  return {
    path,
    kind,
    allowed: gate.valid,
    gate: { allowed: gate.allowed, violations: gate.violations, diagnostics: gate.diagnostics },
    context,
  };
}
