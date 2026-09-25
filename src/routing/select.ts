import { assertSafeRepoPath, collectChangedLineCount, collectGitDiff, collectGitStagedDiff, collectGitWorktreeDiff } from "../gate/collectDiff.js";
import { resolveCommitSha, tryReadGitBlob } from "../gate/loadSpec.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ChangedFile } from "../gate/types.js";
import type { Status } from "../model/types.js";
import { compareCodePoints } from "../normalizer/canonicalize.js";
import { coverage, type CoverageLevel } from "../query/coverage.js";
import { Codes } from "../diagnostics/codes.js";
import { isEngineeringSpecFilename } from "../discovery/discover.js";
import { digestRoutedChanges, routeChanges } from "./route.js";
import type { RoutingReport } from "./types.js";
import { classifyGovernanceChanges, inspectWorkspaceGovernance } from "./governance.js";
import { loadRoutingCandidates, type LoadedCandidateSet } from "./loadCandidates.js";
import { closureSemanticDigest } from "../normalizer/digest.js";
import { parseRepositoryConfig, REPOSITORY_CONFIG_PATH, RepositoryConfigError, type RepositoryConfig } from "../config/repositoryConfig.js";
import { CONTRACT_TRAILER, DEFAULT_POLICY, enforcementFor, evaluatePolicyRouting, isPassingDecision, selectorSources, type PolicyMode } from "../policy/evaluate.js";
import type { Diagnostic } from "../diagnostics/Diagnostic.js";

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
  /**
   * First-adoption escape hatch (RFC 0014 C14). Honored only when the trusted base has
   * no engineering-spec.json and no approved contracts, so it can never weaken existing authority.
   */
  bootstrapMode?: "advisory";
  /** Untrusted selector requests (RFC 0014 §3). Commit trailers in base..head are read automatically. */
  selector?: { contract?: string; labels?: string[]; branch?: string };
}

/** Line counts cost extra git work, so they are collected only when some budget could apply. */
function budgetsConfigured(config: RepositoryConfig | undefined, candidates: LoadedCandidateSet["candidates"]): boolean {
  return Boolean(config?.policy?.budgets) || candidates.some((candidate) => candidate.spec.metadata.changeBudget);
}

/** Contract IDs named by `EngineeringSpec-Contract:` trailers on commits in base..head. */
async function contractTrailers(baseSha: string, headSha: string, cwd?: string): Promise<string[]> {
  const { stdout } = await promisify(execFile)("git", ["log", `--format=%(trailers:key=${CONTRACT_TRAILER},valueonly)`, `${baseSha}..${headSha}`], { cwd, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  return stdout.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
}

/** Committer timestamp (ISO 8601) of an immutable commit; used for deterministic standing expiry. */
async function resolveCommitTimestamp(sha: string, cwd?: string): Promise<string> {
  const { stdout } = await promisify(execFile)("git", ["show", "-s", "--format=%cI", sha], { cwd, encoding: "utf8" });
  return stdout.trim();
}

interface TrustedPolicy {
  mode?: PolicyMode;
  config?: RepositoryConfig;
  error?: Diagnostic;
  bootstrap?: "honored" | "ignored";
}

async function loadTrustedPolicy(baseSha: string, eligibleCount: number, options: SelectSpecsOptions): Promise<TrustedPolicy> {
  const text = await tryReadGitBlob(baseSha, REPOSITORY_CONFIG_PATH, options.cwd);
  if (text === undefined) {
    if (options.bootstrapMode === "advisory" && eligibleCount === 0) return { mode: "bootstrap_advisory", bootstrap: "honored" };
    return options.bootstrapMode ? { bootstrap: "ignored" } : {};
  }
  const bootstrap = options.bootstrapMode ? { bootstrap: "ignored" as const } : {};
  let config: RepositoryConfig;
  try {
    config = parseRepositoryConfig(text, `${baseSha}:${REPOSITORY_CONFIG_PATH}`);
  } catch (error) {
    // Legacy runtimes ignored this file here; only configurations that opt into policy fail closed.
    if (!/"(mode|policy)"\s*:/u.test(text)) return { ...bootstrap };
    return {
      ...bootstrap,
      mode: "standard",
      error: {
        code: error instanceof RepositoryConfigError ? error.code : Codes.schema,
        severity: "error",
        file: REPOSITORY_CONFIG_PATH,
        message: error instanceof Error ? error.message : String(error),
        hint: "Fix the trusted-base engineering-spec.json in a reviewed change; routing cannot be evaluated until it is valid.",
      },
    };
  }
  return config.mode ? { ...bootstrap, mode: config.mode, config } : { ...bootstrap, config };
}

/** Splits a change into specification-directory documents and everything else. */
export function partitionSpecificationChanges(directory: string, changed: ChangedFile[]): { specChanges: ChangedFile[]; implementationChanges: ChangedFile[]; mixed: boolean } {
  const isSpecChange = (change: ChangedFile): boolean => directory !== "."
    && change.path.startsWith(`${directory}/`)
    && isEngineeringSpecFilename(change.path)
    && (!change.fromPath || (change.fromPath.startsWith(`${directory}/`) && isEngineeringSpecFilename(change.fromPath)));
  const specChanges = changed.filter(isSpecChange);
  const implementationChanges = changed.filter((change) => !isSpecChange(change));
  return { specChanges, implementationChanges, mixed: specChanges.length > 0 && implementationChanges.length > 0 };
}

/** A mixed change whose specification edits are not all exact monotonic closes. */
export function unsafeMixedClosureDiagnostic(): Diagnostic {
  return {
    code: Codes.routingUnsafeClosure,
    severity: "error",
    message: "Implementation and specification changes may share a PR only when every specification change is an exact approved-to-implemented monotonic close.",
    hint: "Remove semantic specification edits, or merge authority changes in a contract-only PR before implementation.",
  };
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
  const eligibleCount = candidates.filter((candidate) => requiredStatuses.includes(candidate.spec.metadata.status)).length;
  const trusted = await loadTrustedPolicy(baseSha, eligibleCount, options);
  const baseTimestamp = await resolveCommitTimestamp(baseSha, options.cwd);
  const { specChanges, implementationChanges, mixed } = partitionSpecificationChanges(directory, changed);
  const governanceInspection = classification === "contract_only" || mixed
    ? await inspectWorkspaceGovernance({
      directory,
      changed: classification === "contract_only" ? changed : specChanges,
      baseCandidates: candidates,
      strict: Boolean(options.strict),
      ...(options.cwd ? { cwd: options.cwd } : {}),
      baseTimestamp,
      ...(trusted.config?.policy?.maxStandingDays ? { maxStandingDays: trusted.config.policy.maxStandingDays } : {}),
    })
    : undefined;
  let safeMixedClose = Boolean(mixed && governanceInspection?.report.implementationCloseOnly);
  if (safeMixedClose && governanceInspection) {
    governanceInspection.report.classification = "implementation_with_monotonic_close";
  }
  if (mixed && !safeMixedClose && governanceInspection) {
    governanceInspection.diagnostics.push(unsafeMixedClosureDiagnostic());
  }
  const routeableChanges = safeMixedClose ? implementationChanges : changed;
  const policyEvaluation = trusted.mode && !trusted.error && !loadFailed && classification !== "contract_only"
    ? evaluatePolicyRouting({
        mode: trusted.mode,
        policy: trusted.config?.policy ?? DEFAULT_POLICY,
        specDirectory: directory,
        candidates,
        changed: routeableChanges,
        requiredStatuses,
        baseSha,
        baseTimestamp,
        selector: selectorSources({ ...options.selector, trailers: await contractTrailers(baseSha, headSha, options.cwd) }, trusted.config?.selection),
        ...(options.changed || !budgetsConfigured(trusted.config, candidates) ? {} : {
          changedLines: await collectChangedLineCount({
            base: baseSha,
            head: headSha,
            mode: options.staged ? "staged" : options.worktree !== false ? "worktree" : "range",
            ...(options.cwd ? { cwd: options.cwd } : {}),
          }),
        }),
      })
    : undefined;
  const routed = policyEvaluation
    ? { ...routeChanges(candidates, [], requiredStatuses, { baseSha }), routes: policyEvaluation.routes, diagnostics: policyEvaluation.diagnostics, sequencing: policyEvaluation.sequencing, changedDigest: digestRoutedChanges(changed) }
    : loadFailed
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
  const diagnostics = [...(trusted.error ? [trusted.error] : []), ...loadDiagnostics, ...routeDiagnostics, ...(governanceInspection?.diagnostics ?? [])];
  const specCoverage = candidates
    .filter((candidate) => requiredStatuses.includes(candidate.spec.metadata.status))
    .map((candidate) => ({
      specId: candidate.spec.metadata.id,
      status: coverage(candidate.spec, { unknownExternal: Boolean(candidate.spec.metadata.profiles?.some((profile) => profile.name === "productspec")) }).status,
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
  const valid = !loadFailed && !diagnostics.some((item) => item.severity === "error")
    && !(options.strict && diagnostics.some((item) => item.severity === "warning"))
    && routed.routes.every((route) => isPassingDecision(route.decision, trusted.mode ?? "legacy"));
  const enforcement = enforcementFor(trusted.mode ?? "legacy", valid, Boolean(trusted.error || (trusted.mode && loadFailed)));
  return {
    valid,
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
    ...(policyEvaluation?.changeDecisions ? { changeDecisions: policyEvaluation.changeDecisions } : {}),
    diagnostics,
    sequencing: routed.sequencing,
    enforcement: {
      ...enforcement,
      ...(trusted.bootstrap ? { bootstrap: trusted.bootstrap } : {}),
      ...(policyEvaluation?.selectedContract ? { selectedContract: policyEvaluation.selectedContract } : {}),
    },
  };
}
