import { resolveRepositoryConfig, summarizeRepositoryConfig, type RepositoryConfigSummary } from "../config/repositoryConfig.js";
import { packageVersion } from "./version.js";
import { workflowStatus, type LifecycleStage, type WorkflowStatusReport } from "./status.js";

export interface NextReport {
  valid: boolean;
  analysisValid: boolean;
  workflowState: LifecycleStage;
  permission: "none" | "implementation";
  cliVersion: string;
  config: RepositoryConfigSummary;
  status: WorkflowStatusReport;
  command: string;
}

function nextCommand(status: WorkflowStatusReport, approvedIds: string[]): string {
  switch (status.next.stage) {
    case "explore":
      return "Explore intent and identify explicit paths before proposing authority.";
    case "propose":
      return "Complete and review the existing draft contract.";
    case "approve":
      return "Review and merge the existing contract-only proposal.";
    case "implement":
      return approvedIds.length === 1
        ? `engineeringspec work ${approvedIds[0]}`
        : "Choose the intended approved contract before requesting implementation permission.";
    case "verify":
      return status.selectedContracts.length === 1
        ? `engineeringspec finish ${status.selectedContracts[0]}`
        : "Review the selected contracts and finish the intended contract separately.";
    case "close":
      return "Review and merge the exact lifecycle-only closure.";
    case "blocked":
      return "Resolve the reported routing or contract diagnostics.";
  }
}

export async function nextAction(options: { base?: string; cwd?: string } = {}): Promise<NextReport> {
  const config = await resolveRepositoryConfig({ ...options, enforcing: false });
  const status = await workflowStatus({
    specDirectory: config.config.specDirectory,
    base: config.baseSha,
    strict: config.config.strict,
    worktree: true,
    allowContractOnly: true,
    ...(options.cwd ? { cwd: options.cwd } : {}),
  });
  const approvedIds = status.routing.candidates.filter((item) => item.eligible).map((item) => item.specId);
  const analysisValid = status.routing.diagnostics.every((item) => item.code.startsWith("ESRT"));
  return {
    valid: analysisValid,
    analysisValid,
    workflowState: status.next.stage,
    permission: status.next.stage === "implement" && approvedIds.length === 1 ? "implementation" : "none",
    cliVersion: packageVersion(),
    config: summarizeRepositoryConfig(config),
    status,
    command: nextCommand(status, approvedIds),
  };
}

export function nextText(report: NextReport): string {
  return [
    `next: ${report.status.next.stage}`,
    `analysis: ${report.analysisValid ? "valid" : "invalid"}`,
    `permission: ${report.permission}`,
    `cli: ${report.cliVersion}`,
    `authority: base ${report.config.baseSha}`,
    `config: ${report.config.source}${report.config.workspaceDrift ? "; workspace drift ignored" : ""}`,
    ...report.config.warnings.map((warning) => `warning: ${warning}`),
    `working state: ${report.status.workingState.changed} changed, ${report.status.workingState.violations} violations`,
    `action: ${report.status.next.message}`,
    `command: ${report.command}`,
  ].join("\n");
}
