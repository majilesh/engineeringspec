import { resolveRepositoryConfig, summarizeRepositoryConfig, type RepositoryConfigSummary } from "../config/repositoryConfig.js";
import { packageVersion } from "./version.js";
import { workflowStatus, type WorkflowStatusReport } from "./status.js";

export interface NextReport {
  valid: boolean;
  permission: "none" | "implementation";
  cliVersion: string;
  config: RepositoryConfigSummary;
  status: WorkflowStatusReport;
  command: string;
}

export async function nextAction(options: { base?: string; cwd?: string } = {}): Promise<NextReport> {
  const config = await resolveRepositoryConfig(options);
  const status = await workflowStatus({
    specDirectory: config.config.specDirectory,
    base: config.baseSha,
    strict: config.config.strict,
    worktree: true,
    allowContractOnly: true,
    ...(options.cwd ? { cwd: options.cwd } : {}),
  });
  const approved = status.routing.candidates.filter((item) => item.eligible);
  const command = status.next.stage === "implement" && approved.length === 1
    ? `engineeringspec work ${approved[0]!.specId}`
    : status.next.stage === "verify"
      ? `engineeringspec finish ${status.selectedContracts.length === 1 ? status.selectedContracts[0] : "<contract-id>"}`
      : status.next.stage === "close"
        ? "Review the lifecycle-only change."
        : status.next.stage === "blocked"
          ? "Resolve the reported routing or contract diagnostics."
        : "engineeringspec propose --id <id> --title <title> --from-diff";
  const analysisValid = status.routing.diagnostics.every((item) => item.code.startsWith("ESRT"));
  return {
    valid: analysisValid,
    permission: status.next.stage === "implement" ? "implementation" : "none",
    cliVersion: packageVersion(),
    config: summarizeRepositoryConfig(config),
    status,
    command,
  };
}

export function nextText(report: NextReport): string {
  return [
    `next: ${report.status.next.stage}`,
    `permission: ${report.permission}`,
    `cli: ${report.cliVersion}`,
    `authority: base ${report.config.baseSha}`,
    `config: ${report.config.source}${report.config.workspaceDrift ? "; workspace drift ignored" : ""}`,
    `working state: ${report.status.workingState.changed} changed, ${report.status.workingState.violations} violations`,
    `action: ${report.status.next.message}`,
    `command: ${report.command}`,
  ].join("\n");
}
