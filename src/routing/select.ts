import { isEngineeringSpecFilename } from "../discovery/discover.js";
import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import { collectGitDiff, collectGitStagedDiff, collectGitWorktreeDiff } from "../gate/collectDiff.js";
import { listGitTreePaths, readGitBlob, resolveCommitSha, resolveGitRelativeDirectory } from "../gate/loadSpec.js";
import type { ChangedFile } from "../gate/types.js";
import type { Status } from "../model/types.js";
import { digest } from "../normalizer/digest.js";
import { normalize } from "../normalizer/normalize.js";
import { compareCodePoints } from "../normalizer/canonicalize.js";
import { coverage, type CoverageLevel } from "../query/coverage.js";
import { validateMarkdown } from "../validator/validateFile.js";
import { digestRoutedChanges, routeChanges } from "./route.js";
import type { LoadedRoutingCandidate, RoutingReport } from "./types.js";

const MAX_ROUTING_CANDIDATES = 10_000;

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
}

export async function selectSpecs(options: SelectSpecsOptions): Promise<RoutingReport> {
  const head = options.head ?? "HEAD";
  const configuredStatuses: Status[] = options.requiredStatuses?.length ? options.requiredStatuses : ["approved"];
  const requiredStatuses = [...new Set<Status>(configuredStatuses)].sort(compareCodePoints);
  const baseSha = await resolveCommitSha(options.base, options.cwd);
  const headSha = await resolveCommitSha(head, options.cwd);
  const directory = await resolveGitRelativeDirectory(options.directory, options.cwd);
  const paths = (await listGitTreePaths(baseSha, directory, options.cwd)).filter(isEngineeringSpecFilename);
  if (paths.length > MAX_ROUTING_CANDIDATES) throw new Error(`Routing candidate limit exceeded (${paths.length} > ${MAX_ROUTING_CANDIDATES})`);
  const candidates: LoadedRoutingCandidate[] = [];
  const loadDiagnostics: Diagnostic[] = [];
  for (const candidatePath of paths) {
    const label = `${baseSha}:${candidatePath}`;
    const validation = await validateMarkdown(await readGitBlob(baseSha, candidatePath, options.cwd), label, { resolveProfiles: false });
    loadDiagnostics.push(...validation.diagnostics);
    const failed = !validation.spec
      || validation.diagnostics.some((item) => item.severity === "error")
      || Boolean(options.strict && validation.diagnostics.some((item) => item.severity === "warning"));
    if (!failed && validation.spec) {
      const spec = normalize(validation.spec);
      candidates.push({ path: candidatePath, digest: digest(spec), spec });
    }
  }
  const loadFailed = loadDiagnostics.some((item) => item.severity === "error")
    || Boolean(options.strict && loadDiagnostics.some((item) => item.severity === "warning"));
  const collected = options.changed
    ?? (options.staged
      ? await collectGitStagedDiff({ base: baseSha, head: headSha, ...(options.cwd ? { cwd: options.cwd } : {}) })
      : options.worktree !== false
        ? await collectGitWorktreeDiff({ base: baseSha, head: headSha, ...(options.cwd ? { cwd: options.cwd } : {}) })
        : await collectGitDiff({ base: baseSha, head: headSha, ...(options.cwd ? { cwd: options.cwd } : {}) }));
  const changed = [...collected]
    .sort((left, right) => compareCodePoints(left.path, right.path)
      || compareCodePoints(left.kind, right.kind)
      || compareCodePoints(left.fromPath ?? "", right.fromPath ?? ""));
  const routed = loadFailed
    ? { candidates: candidates.map((candidate) => ({ path: candidate.path, digest: candidate.digest, specId: candidate.spec.metadata.id, status: candidate.spec.metadata.status, eligible: requiredStatuses.includes(candidate.spec.metadata.status) })), routes: [], diagnostics: [], changedDigest: digestRoutedChanges(changed) }
    : routeChanges(candidates, changed, requiredStatuses);
  const diagnostics = [...loadDiagnostics, ...routed.diagnostics];
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
    candidates: routed.candidates,
    coverage: { status: coverageStatus, specs: specCoverage },
    routes: loadFailed ? [] : routed.routes,
    diagnostics,
  };
}
