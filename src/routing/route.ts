import { createHash } from "node:crypto";
import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import { Codes } from "../diagnostics/codes.js";
import { isEngineeringSpecFilename } from "../discovery/discover.js";
import type { ChangedFile, ChangeKind } from "../gate/types.js";
import type { EngineeringSpec, Status, TargetSurface } from "../model/types.js";
import { compareCodePoints } from "../normalizer/canonicalize.js";
import { applicableTargets } from "../query/applicability.js";
import type { LoadedRoutingCandidate, PathRoute, RoutingCandidateSummary, RoutingClaim } from "./types.js";

const WRITABLE = new Set(["modify", "create", "delete", "interface_only"]);
const FORBIDDEN = new Set(["read_only", "observe"]);

function policyAllows(kind: ChangeKind, policy: TargetSurface["changePolicy"]): boolean {
  if (!WRITABLE.has(policy) || FORBIDDEN.has(policy)) return false;
  if (kind === "added") return policy === "create" || policy === "modify" || policy === "interface_only";
  if (kind === "deleted") return policy === "delete" || policy === "modify";
  return policy === "modify" || policy === "interface_only";
}

function evaluatePath(spec: EngineeringSpec, file: string, kind: ChangeKind): {
  allowedTargetIds: string[];
  deniedTargetIds: string[];
  warnings: Diagnostic[];
} {
  const targets = applicableTargets(spec, file);
  const denied = targets.filter((target) => FORBIDDEN.has(target.changePolicy));
  const allowing = targets.filter((target) => policyAllows(kind, target.changePolicy));
  const policyDenied = targets.length > 0 && allowing.length === 0 ? targets : [];
  return {
    allowedTargetIds: allowing.map((target) => target.id),
    deniedTargetIds: [...new Set([...denied, ...policyDenied].map((target) => target.id))],
    warnings: allowing.some((target) => target.changePolicy === "interface_only") ? [{
      code: Codes.gateInterfaceOnly,
      severity: "info",
      file,
      message: `${file}: interface_only is path-scoped only; contents are not checked for interface-surface changes`,
    }] : [],
  };
}

export function digestRoutedChanges(changed: ChangedFile[]): string {
  const payload = `${[...changed]
    .map((item) => `${item.kind}\t${item.fromPath ?? ""}\t${item.path}`)
    .sort(compareCodePoints)
    .join("\n")}\n`;
  return `sha256:${createHash("sha256").update(payload, "utf8").digest("hex")}`;
}

function expandedChanges(changed: ChangedFile[]): Array<{ path: string; kind: ChangeKind }> {
  return changed.flatMap((change) => change.kind === "renamed" && change.fromPath
    ? [{ path: change.fromPath, kind: "deleted" as const }, { path: change.path, kind: "added" as const }]
    : [{ path: change.path, kind: change.kind }]);
}

function claim(candidate: LoadedRoutingCandidate, targetIds: string[]): RoutingClaim {
  return {
    specId: candidate.spec.metadata.id,
    specPath: candidate.path,
    targetIds: [...targetIds].sort(compareCodePoints),
  };
}

export function routeChanges(
  candidates: LoadedRoutingCandidate[],
  changed: ChangedFile[],
  requiredStatuses: Status[] = ["approved"],
): { candidates: RoutingCandidateSummary[]; routes: PathRoute[]; diagnostics: Diagnostic[]; changedDigest: string } {
  const required = new Set(requiredStatuses);
  const ordered = [...candidates].sort((left, right) => compareCodePoints(left.path, right.path));
  const summaries = ordered.map((candidate) => ({
    path: candidate.path,
    digest: candidate.digest,
    specId: candidate.spec.metadata.id,
    status: candidate.spec.metadata.status,
    eligible: required.has(candidate.spec.metadata.status),
  }));
  const eligible = ordered.filter((candidate) => required.has(candidate.spec.metadata.status));
  const diagnostics: Diagnostic[] = [];
  const routes: PathRoute[] = [];
  const hasSpecificationChanges = changed.some((change) => isEngineeringSpecFilename(change.path));
  const hasNonSpecificationChanges = changed.some((change) => !isEngineeringSpecFilename(change.path));
  const hasMixedChanges = hasSpecificationChanges && hasNonSpecificationChanges;

  if (hasMixedChanges) {
    diagnostics.push({
      code: Codes.routingUncovered,
      severity: "info",
      message: "Contract-only handling is unavailable because this change also contains non-contract paths.",
      hint: "Split specification lifecycle or scope changes into a contract-only PR, merge it, then update the implementation branch from the trusted base.",
    });
  }

  if (eligible.length === 0) {
    if (changed.length === 0) {
      return { candidates: summaries, routes, diagnostics, changedDigest: digestRoutedChanges(changed) };
    }
    diagnostics.push({
      code: Codes.routingNoEligible,
      severity: "error",
      message: `No eligible EngineeringSpecs have status in [${requiredStatuses.join(", ")}]`,
      hint: "Approve the applicable contract before enforcing directory routing.",
    });
    return { candidates: summaries, routes, diagnostics, changedDigest: digestRoutedChanges(changed) };
  }

  const byId = new Map<string, LoadedRoutingCandidate[]>();
  for (const candidate of eligible) byId.set(candidate.spec.metadata.id, [...(byId.get(candidate.spec.metadata.id) ?? []), candidate]);
  for (const [id, duplicates] of [...byId].sort(([left], [right]) => compareCodePoints(left, right))) {
    if (duplicates.length > 1) diagnostics.push({
      code: Codes.routingDuplicateId,
      severity: "error",
      message: `Eligible EngineeringSpec id ${JSON.stringify(id)} is duplicated by ${duplicates.map((item) => item.path).join(", ")}`,
    });
  }
  if (diagnostics.some((item) => item.severity === "error")) return { candidates: summaries, routes, diagnostics, changedDigest: digestRoutedChanges(changed) };

  const entries = expandedChanges(changed).sort((left, right) => compareCodePoints(left.path, right.path) || compareCodePoints(left.kind, right.kind));
  for (const entry of entries) {
    const allows: RoutingClaim[] = [];
    const denies: RoutingClaim[] = [];
    const warnings: Diagnostic[] = [];
    for (const candidate of eligible) {
      const result = evaluatePath(candidate.spec, entry.path, entry.kind);
      if (result.allowedTargetIds.length > 0) allows.push(claim(candidate, result.allowedTargetIds));
      if (result.deniedTargetIds.length > 0) denies.push(claim(candidate, result.deniedTargetIds));
      warnings.push(...result.warnings);
    }
    const sortedAllows = allows.sort((left, right) => compareCodePoints(left.specId, right.specId) || compareCodePoints(left.specPath, right.specPath));
    const sortedDenies = denies.sort((left, right) => compareCodePoints(left.specId, right.specId) || compareCodePoints(left.specPath, right.specPath));
    if (sortedDenies.length > 0) {
      routes.push({ path: entry.path, kind: entry.kind, decision: "denied", allows: sortedAllows, denies: sortedDenies, claims: [...sortedDenies, ...sortedAllows] });
      diagnostics.push({ code: Codes.routingDenied, severity: "error", file: entry.path, message: `${entry.path} (${entry.kind}) is denied by ${sortedDenies.map((item) => item.specId).join(", ")}; deny overrides allow` });
    } else if (sortedAllows.length === 0) {
      routes.push({ path: entry.path, kind: entry.kind, decision: "uncovered", allows: [], denies: [], claims: [] });
      const hint = isEngineeringSpecFilename(entry.path) && hasMixedChanges
        ? "Split specification lifecycle or scope changes into a contract-only PR, merge it, then update the implementation branch from the trusted base."
        : "Merge a contract-only target amendment before implementing this path.";
      diagnostics.push({ code: Codes.routingUncovered, severity: "error", file: entry.path, message: `${entry.path} (${entry.kind}) is not claimed by any eligible EngineeringSpec`, hint });
    } else if (sortedAllows.length > 1) {
      routes.push({ path: entry.path, kind: entry.kind, decision: "ambiguous", allows: sortedAllows, denies: [], claims: sortedAllows });
      diagnostics.push({ code: Codes.routingAmbiguous, severity: "error", file: entry.path, message: `${entry.path} (${entry.kind}) is allowed by multiple EngineeringSpecs: ${sortedAllows.map((item) => item.specId).join(", ")}` });
    } else {
      routes.push({ path: entry.path, kind: entry.kind, decision: "selected", selected: sortedAllows[0]!, allows: sortedAllows, denies: [], claims: sortedAllows });
      diagnostics.push(...warnings);
    }
  }
  return { candidates: summaries, routes, diagnostics, changedDigest: digestRoutedChanges(changed) };
}
