import { resolveRepositoryConfig, summarizeRepositoryConfig, type RepositoryConfigSummary } from "../config/repositoryConfig.js";
import { prepareChange, type PrepareReport } from "./prepare.js";
import { packageVersion } from "./version.js";
import type { BriefSurface, BriefTechnicalContract } from "../query/changeBrief.js";

export interface WorkReport {
  result: "ready" | "blocked";
  cliVersion: string;
  intendedChangeDigest: "not_available_before_changes";
  limitations: string[];
  config: RepositoryConfigSummary;
  brief: PrepareReport;
}

export async function workOnContract(options: { contractId: string; base?: string; cwd?: string }): Promise<WorkReport> {
  const config = await resolveRepositoryConfig({ ...(options.base ? { base: options.base } : {}), ...(options.cwd ? { cwd: options.cwd } : {}) });
  const brief = await prepareChange({
    contractId: options.contractId,
    specDirectory: config.config.specDirectory,
    base: config.baseSha,
    strict: config.config.strict,
    ...(options.cwd ? { cwd: options.cwd } : {}),
  });
  return {
    result: brief.result,
    cliVersion: packageVersion(),
    intendedChangeDigest: "not_available_before_changes",
    limitations: ["This pre-code brief grants no authority beyond the exact approved base contract and does not execute specification runners."],
    config: summarizeRepositoryConfig(config),
    brief,
  };
}

export interface WorkTicket {
  result: WorkReport["result"];
  permission: PrepareReport["permission"];
  contractId: string;
  baseSha: string;
  specRevision?: number;
  semanticDigest?: string;
  writablePaths: Array<{ path: string; targetId: string; changePolicy: BriefSurface["changePolicy"]; enforcementNote?: string }>;
  protectedPaths: WorkTicket["writablePaths"];
  constraints: Array<{ id: string; level: string; statement: string }>;
  verifiers: Array<{ id: string; proves: string[] }>;
  technicalContracts: BriefTechnicalContract[];
  stopWhen: string[];
  reason?: string;
  command?: string;
}

function ticketPaths(surfaces: BriefSurface[]): WorkTicket["writablePaths"] {
  return surfaces.flatMap((surface) => surface.paths.map((path) => ({
    path,
    targetId: surface.id,
    changePolicy: surface.changePolicy,
    ...(surface.enforcementNote ? { enforcementNote: surface.enforcementNote } : {}),
  })));
}

// A projection of prepare, never a routing or future-diff decision.
export function workTicket(report: WorkReport): WorkTicket {
  const brief = report.brief;
  const hasSurfaces = "writableSurfaces" in brief;
  return {
    result: report.result,
    permission: brief.permission,
    contractId: brief.contract.id,
    baseSha: brief.authority.baseSha,
    ...("specRevision" in brief.contract ? { specRevision: brief.contract.specRevision } : {}),
    ...("specDigest" in brief.authority ? { semanticDigest: brief.authority.specDigest } : {}),
    writablePaths: hasSurfaces ? ticketPaths(brief.writableSurfaces) : [],
    protectedPaths: hasSurfaces ? ticketPaths(brief.protectedSurfaces) : [],
    constraints: hasSurfaces ? brief.constraints.map(({ id, level, statement }) => ({ id, level, statement })) : [],
    verifiers: hasSurfaces ? brief.verification.map(({ id, proves }) => ({ id, proves: [...proves] })) : [],
    technicalContracts: hasSurfaces ? brief.technicalContracts.map((item) => ({ ...item })) : [],
    stopWhen: [
      ...(brief.result === "blocked" ? [brief.reason ?? "Approved trusted-base authority is unavailable."] : []),
      "A required write is outside the returned writable paths or conflicts with a protected path or change policy.",
      "Complete-state routing reports an uncovered, denied, ambiguous, or otherwise invalid change.",
      "A constraint or technical contract cannot be satisfied; merge a separately reviewed authority amendment before widening scope.",
      "The trusted base changes; reload the exact approved contract before continuing.",
      ...(hasSurfaces ? brief.unresolvedQuestions.map((item) => `${item.id}: ${item.question}`) : []),
    ],
    ...(brief.result === "blocked" ? { reason: brief.reason, command: brief.action } : {}),
  };
}
