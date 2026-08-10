import path from "node:path";
import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import { Codes } from "../diagnostics/codes.js";
import { discoverEngineeringSpecs, isEngineeringSpecFilename } from "../discovery/discover.js";
import { gitShowToplevel } from "../gate/loadSpec.js";
import { assertSafeRepoPath } from "../gate/collectDiff.js";
import type { ChangedFile } from "../gate/types.js";
import type { Status } from "../model/types.js";
import { canonicalJson } from "../normalizer/canonicalize.js";
import { normalize } from "../normalizer/normalize.js";
import { validateFile } from "../validator/validateFile.js";
import type { LoadedRoutingCandidate } from "./types.js";

export type ChangeClassification = "none" | "contract_only" | "implementation";

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
  transitions?: GovernanceTransition[];
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

function withoutStatus(candidate: LoadedRoutingCandidate["spec"], status: Status): string {
  return canonicalJson({
    ...candidate,
    metadata: { ...candidate.metadata, status },
  });
}

export async function inspectWorkspaceGovernance(options: {
  directory: string;
  changed: ChangedFile[];
  baseCandidates: LoadedRoutingCandidate[];
  strict?: boolean;
  cwd?: string;
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
    });
    errors += 1;
  }

  const base = new Map(options.baseCandidates.map((candidate) => [candidate.path, candidate.spec]));
  const transitions: GovernanceTransition[] = [];
  let lifecycleOnly = options.changed.length > 0;
  for (const change of options.changed) {
    const before = base.get(change.path);
    const after = workspace.get(change.path);
    if (change.kind !== "modified" || change.fromPath || !before || !after
      || before.metadata.status !== "approved"
      || !(["implemented", "superseded", "rejected"] as Status[]).includes(after.metadata.status)
      || withoutStatus(after, before.metadata.status) !== canonicalJson(before)) {
      lifecycleOnly = false;
      continue;
    }
    transitions.push({ path: change.path, from: before.metadata.status, to: after.metadata.status });
  }
  lifecycleOnly = lifecycleOnly && transitions.length === options.changed.length;

  return {
    report: {
      enabled: true,
      classification: "contract_only",
      workspaceDocuments: discovered.length,
      workspaceErrors: errors,
      workspaceWarnings: warnings,
      lifecycleOnly,
      transitions,
    },
    diagnostics,
  };
}
