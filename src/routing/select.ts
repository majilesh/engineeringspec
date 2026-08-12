import { assertSafeRepoPath, collectGitDiff, collectGitStagedDiff, collectGitWorktreeDiff } from "../gate/collectDiff.js";
import { resolveCommitSha } from "../gate/loadSpec.js";
import type { ChangedFile } from "../gate/types.js";
import type { Status } from "../model/types.js";
import { compareCodePoints } from "../normalizer/canonicalize.js";
import { coverage, type CoverageLevel } from "../query/coverage.js";
import { digestRoutedChanges, routeChanges } from "./route.js";
import type { RoutingReport } from "./types.js";
import { classifyGovernanceChanges, inspectWorkspaceGovernance } from "./governance.js";
import { loadRoutingCandidates } from "./loadCandidates.js";

export interface SelectSpecsOptions {
  directory: string;
  base: string;
  head?: string;
  strict?: boolean;
  requiredStatuses?: Status[];
  changed?: ChangedFile[];
  staged?: boolean;
  worktree?: boolean;
  cwd?: string;
  allowContractOnly?: boolean;
}

export async function selectSpecs(options: SelectSpecsOptions): Promise<RoutingReport> {
  const head = options.head ?? "HEAD";
  const configuredStatuses: Status[] = options.requiredStatuses?.length ? options.requiredStatuses : ["approved"];
  const requiredStatuses = [...new Set<Status>(configuredStatuses)].sort(compareCodePoints);
  const baseSha = await resolveCommitSha(options.base, options.cwd);
  const headSha = await resolveCommitSha(head, options.cwd);
  const loaded = await loadRoutingCandidates({ baseSha, directory: options.directory, ...(options.strict === undefined ? {} : { strict: options.strict }), ...(options.cwd ? { cwd: options.cwd } : {}) });
  const { directory, candidates, diagnostics: loadDiagnostics } = loaded;
  const loadFailed = !loaded.valid;
  const collected = options.changed
    ?? (options.staged
      ? await collectGitStagedDiff({ base: baseSha, head: headSha, ...(options.cwd ? { cwd: options.cwd } : {}) })
      : options.worktree !== false
        ? await collectGitWorktreeDiff({ base: baseSha, head: headSha, ...(options.cwd ? { cwd: options.cwd } : {}) })
        : await collectGitDiff({ base: baseSha, head: headSha, ...(options.cwd ? { cwd: options.cwd } : {}) }));
  for (const change of collected) {
    assertSafeRepoPath(change.path);
    if (change.fromPath) assertSafeRepoPath(change.fromPath);
  }
  const changed = [...collected]
    .sort((left, right) => compareCodePoints(left.path, right.path)
      || compareCodePoints(left.kind, right.kind)
      || compareCodePoints(left.fromPath ?? "", right.fromPath ?? ""));
  const classification = options.allowContractOnly
    ? classifyGovernanceChanges(directory, changed)
    : changed.length === 0 ? "none" : "implementation";
  const governanceInspection = classification === "contract_only"
    ? await inspectWorkspaceGovernance({
      directory,
      changed,
      baseCandidates: candidates,
      strict: Boolean(options.strict),
      ...(options.cwd ? { cwd: options.cwd } : {}),
    })
    : undefined;
  const routed = loadFailed
    ? { candidates: candidates.map((candidate) => ({ path: candidate.path, digest: candidate.digest, specId: candidate.spec.metadata.id, status: candidate.spec.metadata.status, eligible: requiredStatuses.includes(candidate.spec.metadata.status) })), routes: [], diagnostics: [], changedDigest: digestRoutedChanges(changed) }
    : classification === "contract_only"
      ? { ...routeChanges(candidates, [], requiredStatuses), changedDigest: digestRoutedChanges(changed) }
      : routeChanges(candidates, changed, requiredStatuses);
  const diagnostics = [...loadDiagnostics, ...routed.diagnostics, ...(governanceInspection?.diagnostics ?? [])];
  const specCoverage = candidates
    .filter((candidate) => requiredStatuses.includes(candidate.spec.metadata.status))
    .map((candidate) => ({
      specId: candidate.spec.metadata.id,
      status: coverage(candidate.spec, { unknownExternal: Boolean(candidate.spec.metadata.profiles?.length) }).status,
    }));
  const coverageStatus: CoverageLevel = specCoverage.length === 0
    ? "not_applicable"
    : specCoverage.some((item) => item.status === "unknown")
      ? "unknown"
      : specCoverage.some((item) => item.status === "partial")
        ? "partial"
        : specCoverage.every((item) => item.status === "not_applicable")
          ? "not_applicable"
          : "complete";
  return {
    valid: !loadFailed && !diagnostics.some((item) => item.severity === "error")
      && !(options.strict && diagnostics.some((item) => item.severity === "warning")),
    base: options.base,
    baseSha,
    head,
    headSha,
    candidateDirectory: directory,
    requiredStatuses,
    changedDigest: routed.changedDigest,
    changed,
    governance: governanceInspection?.report ?? { enabled: Boolean(options.allowContractOnly), classification },
    candidates: routed.candidates,
    coverage: { status: coverageStatus, specs: specCoverage },
    routes: loadFailed ? [] : routed.routes,
    diagnostics,
  };
}
