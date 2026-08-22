import { assertSafeRepoPath, collectGitDiff, collectGitStagedDiff, collectGitWorktreeDiff } from "../gate/collectDiff.js";
import { resolveCommitSha } from "../gate/loadSpec.js";
import type { ChangedFile } from "../gate/types.js";
import type { Status } from "../model/types.js";
import { compareCodePoints } from "../normalizer/canonicalize.js";
import { coverage, type CoverageLevel } from "../query/coverage.js";
import { Codes } from "../diagnostics/codes.js";
import { isEngineeringSpecFilename } from "../discovery/discover.js";
import { digestRoutedChanges, routeChanges } from "./route.js";
import type { RoutingReport } from "./types.js";
import { classifyGovernanceChanges, inspectWorkspaceGovernance } from "./governance.js";
import { loadRoutingCandidates } from "./loadCandidates.js";
import { closureSemanticDigest } from "../normalizer/digest.js";

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
  const contractOnlyClassification = directory === "."
    ? changed.length === 0 ? "none" : "implementation"
    : classifyGovernanceChanges(directory, changed);
  const classification = options.allowContractOnly
    ? contractOnlyClassification
    : changed.length === 0 ? "none" : "implementation";
  const isSpecChange = (change: ChangedFile): boolean => directory !== "."
    && change.path.startsWith(`${directory}/`)
    && isEngineeringSpecFilename(change.path)
    && (!change.fromPath || (change.fromPath.startsWith(`${directory}/`) && isEngineeringSpecFilename(change.fromPath)));
  const specChanges = changed.filter(isSpecChange);
  const implementationChanges = changed.filter((change) => !isSpecChange(change));
  const mixed = specChanges.length > 0 && implementationChanges.length > 0;
  const governanceInspection = classification === "contract_only" || mixed
    ? await inspectWorkspaceGovernance({
      directory,
      changed: classification === "contract_only" ? changed : specChanges,
      baseCandidates: candidates,
      strict: Boolean(options.strict),
      ...(options.cwd ? { cwd: options.cwd } : {}),
    })
    : undefined;
  let safeMixedClose = Boolean(mixed && governanceInspection?.report.implementationCloseOnly);
  if (safeMixedClose && governanceInspection) {
    governanceInspection.report.classification = "implementation_with_monotonic_close";
  }
  if (mixed && !safeMixedClose && governanceInspection) {
    governanceInspection.diagnostics.push({
      code: Codes.routingUnsafeClosure,
      severity: "error",
      message: "Implementation and specification changes may share a PR only when every specification change is an exact approved-to-implemented monotonic close.",
      hint: "Remove semantic specification edits, or merge authority changes in a contract-only PR before implementation.",
    });
  }
  const routeableChanges = safeMixedClose ? implementationChanges : changed;
  const routed = loadFailed
    ? { candidates: candidates.map((candidate) => ({ path: candidate.path, digest: candidate.digest, specId: candidate.spec.metadata.id, status: candidate.spec.metadata.status, eligible: requiredStatuses.includes(candidate.spec.metadata.status),specRevision:candidate.spec.metadata.specRevision,semanticDigest:closureSemanticDigest(candidate.spec) })), routes: [], diagnostics: [], changedDigest: digestRoutedChanges(changed), sequencing: [] }
    : classification === "contract_only"
      ? { ...routeChanges(candidates, [], requiredStatuses, { baseSha }), changedDigest: digestRoutedChanges(changed) }
      : { ...routeChanges(candidates, routeableChanges, requiredStatuses, { baseSha }), changedDigest: digestRoutedChanges(changed) };
  if (safeMixedClose && governanceInspection) {
    const closedIds = new Set((governanceInspection.report.authorityDiffs ?? []).map((item) => item.contractId));
    const selectedIds = new Set(routed.routes.flatMap((route) => route.selected ? [route.selected.specId] : []));
    const unrelated = [...closedIds].filter((id) => !selectedIds.has(id));
    if (unrelated.length > 0) {
      safeMixedClose = false;
      governanceInspection.report.classification = "implementation";
      governanceInspection.diagnostics.push({
        code: Codes.routingUnsafeClosure,
        severity: "error",
        message: `Mixed closure contract(s) ${unrelated.join(", ")} did not authorize any implementation path in this change.`,
        hint: "Close only the exact base contract spent by the implementation, or submit a standalone lifecycle-only close.",
      });
    }
  }
  const routeDiagnostics = routed.diagnostics.map((diagnostic) => diagnostic.code === Codes.routingUncovered
    && diagnostic.file
    && isEngineeringSpecFilename(diagnostic.file)
    && contractOnlyClassification === "contract_only"
    ? {
        ...diagnostic,
        hint: "Specification lifecycle or scope changes are not implementation paths; use --allow-contract-only instead of adding this file to its own targets.",
      }
    : diagnostic);
  const diagnostics = [...loadDiagnostics, ...routeDiagnostics, ...(governanceInspection?.diagnostics ?? [])];
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
    sequencing: routed.sequencing,
  };
}
