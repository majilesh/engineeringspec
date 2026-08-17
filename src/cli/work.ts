import { resolveRepositoryConfig, summarizeRepositoryConfig, type RepositoryConfigSummary } from "../config/repositoryConfig.js";
import { prepareChange, type PrepareReport } from "./prepare.js";
import { packageVersion } from "./version.js";

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
