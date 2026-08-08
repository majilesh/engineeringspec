import { digest } from "../normalizer/digest.js";
import { normalize } from "../normalizer/normalize.js";
import { coverage, type CoverageReport } from "../query/coverage.js";
import { buildAgentContext, type AgentContextReport } from "../query/agentContext.js";
import { collectGitDiff, collectGitStagedDiff, collectGitWorktreeDiff } from "../gate/collectDiff.js";
import { gateDiff } from "../gate/gate.js";
import { readGitBlob, resolveCommitSha, resolveGitRelativePath, type SpecSource } from "../gate/loadSpec.js";
import type { GateReport } from "../gate/types.js";
import { validateFile, validateMarkdown } from "../validator/validateFile.js";
import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import { Codes } from "../diagnostics/codes.js";

export interface AgentCheckOptions {
  file: string;
  base?: string;
  head?: string;
  specFrom?: SpecSource;
  strict?: boolean;
  staged?: boolean;
  worktree?: boolean;
}

export interface AgentCheckReport {
  valid: boolean;
  specSource: SpecSource;
  specDigest?: string;
  baseSha?: string;
  headSha?: string;
  diagnostics: Diagnostic[];
  gate?: GateReport;
  coverage?: CoverageReport;
  context?: AgentContextReport;
}

export async function agentCheck(options: AgentCheckOptions): Promise<AgentCheckReport> {
  const head = options.head ?? "HEAD";
  const specFrom = options.specFrom ?? (options.base ? "base" : "workspace");
  if (specFrom === "base" && !options.base) throw new Error("check --spec-from base requires --base <ref>");

  const baseSha = options.base ? await resolveCommitSha(options.base) : undefined;
  const headSha = await resolveCommitSha(head);
  const validation = specFrom === "base"
    ? await (async () => {
        const relative = await resolveGitRelativePath(options.file);
        return validateMarkdown(await readGitBlob(baseSha!, relative), `${baseSha}:${relative}`);
      })()
    : await validateFile(options.file);

  const loadFailed = !validation.spec
    || validation.diagnostics.some((diagnostic) => diagnostic.severity === "error")
    || (options.strict && validation.diagnostics.some((diagnostic) => diagnostic.severity === "warning"));
  if (loadFailed) {
    return {
      valid: false,
      specSource: specFrom,
      ...(baseSha ? { baseSha } : {}),
      headSha,
      diagnostics: validation.diagnostics,
    };
  }

  const spec = normalize(validation.spec!);
  const changed = options.staged
    ? await collectGitStagedDiff({ ...(baseSha ? { base: baseSha } : {}), head: headSha })
    : options.worktree !== false
      ? await collectGitWorktreeDiff({ ...(baseSha ? { base: baseSha } : {}), head: headSha })
      : baseSha
        ? await collectGitDiff({ base: baseSha, head: headSha })
        : [];
  const gate = gateDiff(spec, changed, {
    ...(options.base ? { base: options.base } : {}),
    head,
    ...(baseSha ? { baseSha } : {}),
    headSha,
    specDigest: digest(spec),
    specSource: specFrom,
  });
  const strictGateWarning = Boolean(options.strict && gate.diagnostics.some((diagnostic) => diagnostic.severity === "warning"));
  return {
    valid: gate.valid && !strictGateWarning,
    specSource: specFrom,
    specDigest: digest(spec),
    ...(baseSha ? { baseSha } : {}),
    headSha,
    diagnostics: [...validation.diagnostics, ...gate.diagnostics],
    gate,
    coverage: coverage(spec, {
      unknownExternal: validation.diagnostics.some((diagnostic) => diagnostic.code === Codes.profileUnavailable),
    }),
    context: buildAgentContext(spec, changed),
  };
}
