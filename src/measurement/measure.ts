import { createHash } from "node:crypto";
import { assertSafeRepoPath, collectGitDiff } from "../gate/collectDiff.js";
import { listGitTreePaths, resolveCommitSha } from "../gate/loadSpec.js";
import type { ChangeKind } from "../gate/types.js";
import type { EngineeringSpec, TargetSurface } from "../model/types.js";
import { compareCodePoints } from "../normalizer/canonicalize.js";
import { matchTargetGlob } from "../path/targetGlob.js";
import { loadRoutingCandidates } from "../routing/loadCandidates.js";
import { routeChanges } from "../routing/route.js";
import type { LoadedRoutingCandidate, PathRoute, RoutingClaim } from "../routing/types.js";

export type ScopeAuthorityBreadth = "finite" | "open_create_namespace" | "repository_wide";
export type ScopeMetricEligibilityReason = "eligible" | "open_create_namespace" | "repository_wide" | "zero_denominator" | "negative_routing_outcome";

export interface ScopeMeasurementReceipt {
  schemaVersion: "0.2";
  authority: "base_pinned_repository_routing";
  authorization: "none";
  contract: { id: string; revision: number; path: string; digest: string };
  baseSha: string;
  headSha: string;
  candidateSetDigest: string;
  routingDecisionDigest: string;
  method: { unit: "repository_path"; version: "concrete-paths-v2" };
  authorityBreadth: ScopeAuthorityBreadth;
  metricEligibility: { scopePrecision: boolean; reason: ScopeMetricEligibilityReason };
  counts: ScopePathCounts;
  digests: ScopePathDigests;
  paths?: ScopePaths;
  limitations: string[];
}

export interface ScopePathCounts {
  approvedWritablePaths: number;
  actualChangedPaths: number;
  selectedForRequestedContract: number;
  selectedForOtherContracts: number;
  denied: number;
  ambiguous: number;
  uncovered: number;
}

export type ScopePathDigests = {
  [Key in keyof ScopePathCounts]: string;
};

export interface ScopePaths {
  approvedWritable: string[];
  actualChanged: string[];
  selectedForRequestedContract: string[];
  selectedForOtherContracts: string[];
  denied: string[];
  ambiguous: string[];
  uncovered: string[];
}

const WRITABLE = new Set<TargetSurface["changePolicy"]>(["modify", "create", "delete", "interface_only"]);
const CREATE_CAPABLE = new Set<TargetSurface["changePolicy"]>(["modify", "create", "interface_only"]);

function canonicalDigest(value: unknown): string {
  return `sha256:${createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex")}`;
}

function ordered(values: Iterable<string>): string[] {
  return [...new Set(values)].sort(compareCodePoints);
}

function setDigest(values: Iterable<string>): string {
  return canonicalDigest(ordered(values));
}

function hasWildcard(pattern: string): boolean {
  return /[*?]/u.test(pattern);
}

function candidateSetDigest(candidates: LoadedRoutingCandidate[]): string {
  return canonicalDigest(candidates
    .filter((candidate) => candidate.spec.metadata.status === "approved")
    .map((candidate) => ({
      path: candidate.path,
      id: candidate.spec.metadata.id,
      revision: candidate.spec.metadata.specRevision,
      status: candidate.spec.metadata.status,
      digest: candidate.digest,
    }))
    .sort((left, right) => compareCodePoints(left.path, right.path)
      || compareCodePoints(left.id, right.id)
      || left.revision - right.revision
      || compareCodePoints(left.digest, right.digest)));
}

function orderedClaims(claims: RoutingClaim[]): RoutingClaim[] {
  return claims.map((item) => ({ ...item, targetIds: ordered(item.targetIds) }))
    .sort((left, right) => compareCodePoints(left.specId, right.specId) || compareCodePoints(left.specPath, right.specPath));
}

function routingDecisionDigest(routes: PathRoute[]): string {
  return canonicalDigest([...routes]
    .sort((left, right) => compareCodePoints(left.path, right.path) || compareCodePoints(left.kind, right.kind))
    .map((route) => ({
      path: route.path,
      kind: route.kind,
      decision: route.decision,
      selected: route.selected ? { specId: route.selected.specId, specPath: route.selected.specPath } : null,
      allows: orderedClaims(route.allows),
      denies: orderedClaims(route.denies),
    })));
}

function breadth(spec: EngineeringSpec): ScopeAuthorityBreadth {
  const writable = spec.targets.filter((target) => WRITABLE.has(target.changePolicy));
  if (writable.some((target) => target.paths.some((pattern) => pattern === "**" || pattern === "**/*"))) return "repository_wide";
  return writable.some((target) => CREATE_CAPABLE.has(target.changePolicy) && target.paths.some(hasWildcard))
    ? "open_create_namespace"
    : "finite";
}

function representativeKinds(policy: TargetSurface["changePolicy"], exists: boolean): ChangeKind[] {
  if (policy === "create") return exists ? [] : ["added"];
  if (policy === "modify" || policy === "interface_only") return [exists ? "modified" : "added"];
  if (policy === "delete") return exists ? ["deleted"] : [];
  return [];
}

function selectedFor(route: PathRoute | undefined, contractId: string): boolean {
  return route?.decision === "selected" && route.selected?.specId === contractId;
}

function effectiveFiniteAuthority(
  requested: LoadedRoutingCandidate,
  candidates: LoadedRoutingCandidate[],
  basePaths: string[],
): Set<string> {
  const base = new Set(basePaths);
  const probes = new Map<string, Set<ChangeKind>>();
  const addProbe = (path: string, kind: ChangeKind): void => {
    const kinds = probes.get(path) ?? new Set<ChangeKind>();
    kinds.add(kind);
    probes.set(path, kinds);
  };
  for (const target of requested.spec.targets) {
    if (!WRITABLE.has(target.changePolicy)) continue;
    for (const pattern of target.paths) {
      if (!hasWildcard(pattern)) {
        for (const kind of representativeKinds(target.changePolicy, base.has(pattern))) addProbe(pattern, kind);
      } else {
        for (const path of basePaths) {
          if (!matchTargetGlob(path, pattern)) continue;
          for (const kind of representativeKinds(target.changePolicy, true)) addProbe(path, kind);
        }
      }
    }
  }
  const approved = new Set<string>();
  for (const [path, kinds] of probes) {
    for (const kind of kinds) {
      const result = routeChanges(candidates, [{ path, kind }], ["approved"]);
      if (selectedFor(result.routes[0], requested.spec.metadata.id)) {
        approved.add(path);
        break;
      }
    }
  }
  return approved;
}

function classifyActual(routes: PathRoute[], requestedId: string): Omit<ScopePaths, "approvedWritable" | "actualChanged"> {
  const classifications = new Map<string, keyof Omit<ScopePaths, "approvedWritable" | "actualChanged">>();
  for (const route of routes) {
    const classification = route.decision === "selected"
      ? route.selected?.specId === requestedId ? "selectedForRequestedContract" : "selectedForOtherContracts"
      : route.decision;
    const previous = classifications.get(route.path);
    if (previous && previous !== classification) {
      throw new Error(`Expanded path ${JSON.stringify(route.path)} has conflicting routing outcomes and cannot be partitioned`);
    }
    classifications.set(route.path, classification);
  }
  const result = {
    selectedForRequestedContract: [] as string[],
    selectedForOtherContracts: [] as string[],
    denied: [] as string[],
    ambiguous: [] as string[],
    uncovered: [] as string[],
  };
  for (const [path, classification] of classifications) result[classification].push(path);
  for (const values of Object.values(result)) values.sort(compareCodePoints);
  return result;
}

function metricEligibility(authorityBreadth: ScopeAuthorityBreadth, approved: number, negative: number): ScopeMeasurementReceipt["metricEligibility"] {
  if (authorityBreadth === "open_create_namespace") return { scopePrecision: false, reason: "open_create_namespace" };
  if (authorityBreadth === "repository_wide") return { scopePrecision: false, reason: "repository_wide" };
  if (approved === 0) return { scopePrecision: false, reason: "zero_denominator" };
  if (negative > 0) return { scopePrecision: false, reason: "negative_routing_outcome" };
  return { scopePrecision: true, reason: "eligible" };
}

export async function measureScope(options: {
  contractId: string;
  specDirectory: string;
  base: string;
  head: string;
  strict?: boolean;
  includePaths?: boolean;
  cwd?: string;
}): Promise<ScopeMeasurementReceipt> {
  const [baseSha, headSha] = await Promise.all([
    resolveCommitSha(options.base, options.cwd),
    resolveCommitSha(options.head, options.cwd),
  ]);
  const loaded = await loadRoutingCandidates({ baseSha, directory: options.specDirectory, ...(options.strict === undefined ? {} : { strict: options.strict }), ...(options.cwd ? { cwd: options.cwd } : {}) });
  if (!loaded.valid) {
    const detail = loaded.diagnostics.map((item) => `${item.severity} ${item.code}: ${item.message}`).join("; ");
    throw new Error(`Trusted base contract set failed validation${detail ? `: ${detail}` : ""}`);
  }
  const duplicateCheck = routeChanges(loaded.candidates, [], ["approved"]);
  const duplicate = duplicateCheck.diagnostics.find((item) => item.severity === "error");
  if (duplicate) throw new Error(duplicate.message);
  const matches = loaded.candidates.filter((candidate) => candidate.spec.metadata.status === "approved" && candidate.spec.metadata.id === options.contractId);
  if (matches.length !== 1) throw new Error(`Expected exactly one approved base-pinned contract ${JSON.stringify(options.contractId)}; found ${matches.length}`);
  const requested = matches[0]!;

  const [basePaths, changed] = await Promise.all([
    listGitTreePaths(baseSha, ".", options.cwd),
    collectGitDiff({ base: baseSha, head: headSha, ...(options.cwd ? { cwd: options.cwd } : {}) }),
  ]);
  for (const change of changed) {
    assertSafeRepoPath(change.path);
    if (change.fromPath) assertSafeRepoPath(change.fromPath);
  }
  const routing = routeChanges(loaded.candidates, changed, ["approved"]);
  const classified = classifyActual(routing.routes, requested.spec.metadata.id);
  const actualChanged = ordered(routing.routes.map((route) => route.path));
  const authorityBreadth = breadth(requested.spec);
  const approvedWritable = ordered(effectiveFiniteAuthority(requested, loaded.candidates, basePaths));
  const partitionSize = Object.values(classified).reduce((total, paths) => total + paths.length, 0);
  if (partitionSize !== actualChanged.length) throw new Error("Routing outcomes do not partition the actual changed path set");
  const negative = classified.selectedForOtherContracts.length + classified.denied.length + classified.ambiguous.length + classified.uncovered.length;
  const eligibility = metricEligibility(authorityBreadth, approvedWritable.length, negative);
  const pathSets: ScopePaths = { approvedWritable, actualChanged, ...classified };
  const counts: ScopePathCounts = {
    approvedWritablePaths: approvedWritable.length,
    actualChangedPaths: actualChanged.length,
    selectedForRequestedContract: classified.selectedForRequestedContract.length,
    selectedForOtherContracts: classified.selectedForOtherContracts.length,
    denied: classified.denied.length,
    ambiguous: classified.ambiguous.length,
    uncovered: classified.uncovered.length,
  };
  const digests = Object.fromEntries(Object.entries({
    approvedWritablePaths: approvedWritable,
    actualChangedPaths: actualChanged,
    selectedForRequestedContract: classified.selectedForRequestedContract,
    selectedForOtherContracts: classified.selectedForOtherContracts,
    denied: classified.denied,
    ambiguous: classified.ambiguous,
    uncovered: classified.uncovered,
  }).map(([key, paths]) => [key, setDigest(paths)])) as ScopePathDigests;
  return {
    schemaVersion: "0.2",
    authority: "base_pinned_repository_routing",
    authorization: "none",
    contract: { id: requested.spec.metadata.id, revision: requested.spec.metadata.specRevision, path: requested.path, digest: requested.digest },
    baseSha,
    headSha,
    candidateSetDigest: candidateSetDigest(loaded.candidates),
    routingDecisionDigest: routingDecisionDigest(routing.routes),
    method: { unit: "repository_path", version: "concrete-paths-v2" },
    authorityBreadth,
    metricEligibility: eligibility,
    counts,
    digests,
    ...(options.includePaths ? { paths: pathSets } : {}),
    limitations: [
      "Unsigned measurement evidence; this receipt grants no authorization and does not prove correctness or that trusted checks passed.",
      ...(eligibility.scopePrecision ? [] : [`Single-intended-contract scope precision is unavailable: ${eligibility.reason}.`]),
    ],
  };
}
