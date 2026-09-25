import path from "node:path";
import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import { Codes } from "../diagnostics/codes.js";
import { discoverEngineeringSpecs, isEngineeringSpecFilename } from "../discovery/discover.js";
import { gitShowToplevel } from "../gate/loadSpec.js";
import { assertSafeRepoPath } from "../gate/collectDiff.js";
import type { ChangedFile } from "../gate/types.js";
import type { Status } from "../model/types.js";
import { buildAuthorityDiff, type AuthorityDiff } from "../authority/diff.js";
import { canonicalJson } from "../normalizer/canonicalize.js";
import { normalize } from "../normalizer/normalize.js";
import { validateFile } from "../validator/validateFile.js";
import type { LoadedRoutingCandidate } from "./types.js";

export type ChangeClassification = "none" | "contract_only" | "implementation" | "implementation_with_monotonic_close";

export interface GovernanceTransition {
  path: string;
  from: Status;
  to: Status;
}

export interface GovernanceReport {
  enabled: boolean;
  classification: ChangeClassification;
  workspaceDocuments?: number;
  workspaceErrors?: number;
  workspaceWarnings?: number;
  lifecycleOnly?: boolean;
  implementationCloseOnly?: boolean;
  transitions?: GovernanceTransition[];
  authorityDiffs?: AuthorityDiff[];
}

function pathInside(directory: string, candidate: string): boolean {
  return candidate === directory || candidate.startsWith(`${directory}/`);
}

export function classifyGovernanceChanges(directory: string, changed: ChangedFile[]): ChangeClassification {
  if (directory === ".") throw new Error("Contract-only governance requires a non-root specification directory");
  if (changed.length === 0) return "none";
  for (const change of changed) {
    assertSafeRepoPath(change.path);
    if (change.fromPath) assertSafeRepoPath(change.fromPath);
  }
  const allInside = changed.every((change) => pathInside(directory, change.path)
    && isEngineeringSpecFilename(change.path)
    && (!change.fromPath || (pathInside(directory, change.fromPath) && isEngineeringSpecFilename(change.fromPath))));
  return allInside ? "contract_only" : "implementation";
}

function statusOnly(candidate: LoadedRoutingCandidate["spec"], status: Status): string {
  return canonicalJson({ ...candidate, metadata: { ...candidate.metadata, status } });
}

export const DEFAULT_MAX_STANDING_DAYS = 180;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * RFC 0014 C19: when a changed standing contract is (or becomes) approved, or its expiry changes,
 * its expiry must lie after the trusted base commit and within the maximum lifetime.
 */
function standingLifetimeDiagnostics(
  options: { changed: ChangedFile[]; baseTimestamp?: string; maxStandingDays?: number },
  workspace: Map<string, LoadedRoutingCandidate["spec"]>,
  base: Map<string, LoadedRoutingCandidate["spec"]>,
): Diagnostic[] {
  const out: Diagnostic[] = [];
  const baseTime = Date.parse(options.baseTimestamp ?? "");
  const maxDays = options.maxStandingDays ?? DEFAULT_MAX_STANDING_DAYS;
  for (const change of options.changed) {
    const after = workspace.get(change.path);
    if (!after || after.metadata.authorityKind !== "standing" || after.metadata.status !== "approved") continue;
    const before = base.get(change.path);
    if (before?.metadata.status === "approved" && before.metadata.authorityKind === "standing" && before.metadata.expiresAt === after.metadata.expiresAt) continue;
    const expires = Date.parse(after.metadata.expiresAt ?? "");
    if (Number.isNaN(baseTime) || Number.isNaN(expires) || expires <= baseTime) {
      out.push({ code: Codes.routingStandingExpired, severity: "error", file: change.path, message: `Standing authority ${after.metadata.id} cannot be approved with expiry ${after.metadata.expiresAt ?? "(none)"} at or before the trusted base commit` });
    } else if (expires - baseTime > maxDays * DAY_MS) {
      out.push({ code: Codes.routingStandingExpired, severity: "error", file: change.path, message: `Standing authority ${after.metadata.id} expires ${Math.ceil((expires - baseTime) / DAY_MS)} days after the trusted base commit; the maximum is ${maxDays}`, hint: "Shorten expires_at, or raise policy.maxStandingDays in a reviewed change to engineering-spec.json." });
    }
  }
  return out;
}

export async function inspectWorkspaceGovernance(options: {
  directory: string;
  changed: ChangedFile[];
  baseCandidates: LoadedRoutingCandidate[];
  strict?: boolean;
  cwd?: string;
  /** Trusted base commit time; standing lifetimes are measured from it, never from PR commit dates. */
  baseTimestamp?: string;
  maxStandingDays?: number;
}): Promise<{ report: GovernanceReport; diagnostics: Diagnostic[] }> {
  const root = await gitShowToplevel(options.cwd);
  const absoluteDirectory = path.join(root, ...options.directory.split("/"));
  const discovered = await discoverEngineeringSpecs(absoluteDirectory);
  const diagnostics: Diagnostic[] = [];
  const workspace = new Map<string, LoadedRoutingCandidate["spec"]>();
  let warnings = 0;
  let errors = 0;

  if (discovered.length === 0) {
    diagnostics.push({
      code: Codes.noDocuments,
      severity: "error",
      file: options.directory,
      message: `No EngineeringSpec documents were found under ${options.directory}`,
    });
    errors += 1;
  }

  const ids = new Map<string, string[]>();
  for (const file of discovered) {
    const relative = path.relative(root, file).split(path.sep).join("/");
    const validation = await validateFile(file, { resolveProfiles: false });
    diagnostics.push(...validation.diagnostics);
    const fileWarnings = validation.diagnostics.filter((item) => item.severity === "warning").length;
    const fileErrors = validation.diagnostics.filter((item) => item.severity === "error").length;
    warnings += fileWarnings;
    errors += fileErrors;
    if (validation.spec && fileErrors === 0) {
      const spec = normalize(validation.spec);
      workspace.set(relative, spec);
      ids.set(spec.metadata.id, [...(ids.get(spec.metadata.id) ?? []), relative]);
    }
  }
  for (const [id, files] of ids) {
    if (files.length < 2) continue;
    diagnostics.push({
      code: Codes.routingDuplicateId,
      severity: "error",
      message: `Workspace EngineeringSpec id ${JSON.stringify(id)} is duplicated by ${files.sort().join(", ")}`,
    });
    errors += 1;
  }

  for (const change of options.changed) {
    if (change.kind === "deleted") continue;
    if (workspace.has(change.path)) continue;
    diagnostics.push({
      code: Codes.routingUncovered,
      severity: "error",
      file: change.path,
      message: `Governance path ${change.path} is not a validated workspace EngineeringSpec`,
      hint: "Fix the specification's validation errors, or exclude this path from the contract-only change.",
    });
    errors += 1;
  }

  const base = new Map(options.baseCandidates.map((candidate) => [candidate.path, candidate.spec]));
  diagnostics.push(...standingLifetimeDiagnostics(options, workspace, base));
  errors += diagnostics.filter((item) => item.code === Codes.routingStandingExpired).length;
  const transitions: GovernanceTransition[] = [];
  const authorityDiffs: AuthorityDiff[] = [];
  let lifecycleOnly = options.changed.length > 0;
  let implementationCloseOnly = options.changed.length > 0;
  for (const change of options.changed) {
    const before = base.get(change.path);
    const after = workspace.get(change.path);
    if (change.kind !== "modified" || change.fromPath || !before || !after
      || before.metadata.status !== "approved") {
      lifecycleOnly = false;
      continue;
    }
    const authorityDiff = buildAuthorityDiff(before, after);
    authorityDiffs.push(authorityDiff);
    const legacyTerminalClose = (["implemented", "superseded", "rejected"] as Status[]).includes(after.metadata.status)
      && statusOnly(after, before.metadata.status) === canonicalJson(before);
    if (!authorityDiff.safeMonotonicClose && !legacyTerminalClose) {
      lifecycleOnly = false;
    }
    if (!authorityDiff.safeMonotonicClose) implementationCloseOnly = false;
    if (authorityDiff.safeMonotonicClose || legacyTerminalClose) transitions.push({ path: change.path, from: before.metadata.status, to: after.metadata.status });
  }
  lifecycleOnly = lifecycleOnly && transitions.length === options.changed.length;
  implementationCloseOnly = implementationCloseOnly && authorityDiffs.length === options.changed.length
    && authorityDiffs.every((item) => item.safeMonotonicClose);

  return {
    report: {
      enabled: true,
      classification: "contract_only",
      workspaceDocuments: discovered.length,
      workspaceErrors: errors,
      workspaceWarnings: warnings,
      lifecycleOnly,
      implementationCloseOnly,
      transitions,
      authorityDiffs,
    },
    diagnostics,
  };
}
