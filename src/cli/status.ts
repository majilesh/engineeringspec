import type { ChangedFile } from "../gate/types.js";
import type { Status } from "../model/types.js";
import { compareCodePoints } from "../normalizer/canonicalize.js";
import { selectSpecs } from "../routing/select.js";
import type { RoutingReport } from "../routing/types.js";

export type LifecycleStage = "explore" | "propose" | "approve" | "implement" | "verify" | "close" | "blocked";

export interface LifecycleAction {
  stage: LifecycleStage;
  message: string;
}

export interface WorkflowStatusReport {
  valid: boolean;
  base: string;
  baseSha: string;
  candidateDirectory: string;
  candidates: number;
  lifecycle: Record<Status, number>;
  workingState: {
    changed: number;
    selected: number;
    violations: number;
  };
  selectedContracts: string[];
  routedTargets: string[];
  coverage: RoutingReport["coverage"];
  next: LifecycleAction;
  routing: RoutingReport;
}

export interface WorkflowStatusOptions {
  specDirectory: string;
  base: string;
  head?: string;
  strict?: boolean;
  staged?: boolean;
  worktree?: boolean;
  changed?: ChangedFile[];
  cwd?: string;
}

function lifecycleCounts(report: RoutingReport): Record<Status, number> {
  const counts: Record<Status, number> = { draft: 0, proposed: 0, approved: 0, implemented: 0, superseded: 0, rejected: 0 };
  for (const candidate of report.candidates) counts[candidate.status] += 1;
  return counts;
}

export function nextLifecycleAction(report: RoutingReport): LifecycleAction {
  const counts = lifecycleCounts(report);
  if (!report.valid) return { stage: "blocked", message: "Resolve the reported contract or routing diagnostics before changing code." };
  if (report.changed.length > 0) return { stage: "verify", message: "Run separately trusted repository checks, then complete the EngineeringSpec check before review." };
  if (counts.approved > 0) return { stage: "implement", message: "Load base-pinned context for the approved contract before editing its declared targets." };
  if (counts.proposed > 0) return { stage: "approve", message: "Review and merge the contract-only proposal before implementation begins." };
  if (counts.draft > 0) return { stage: "propose", message: "Complete and review the draft contract without treating it as implementation authority." };
  return { stage: "explore", message: "Explore the intended change and create a draft contract when the scope is understood." };
}

export async function workflowStatus(options: WorkflowStatusOptions): Promise<WorkflowStatusReport> {
  const routing = await selectSpecs({
    directory: options.specDirectory,
    base: options.base,
    head: options.head ?? "HEAD",
    strict: Boolean(options.strict),
    staged: Boolean(options.staged),
    worktree: options.staged ? false : options.worktree !== false,
    ...(options.changed ? { changed: options.changed } : {}),
    ...(options.cwd ? { cwd: options.cwd } : {}),
  });
  const selectedRoutes = routing.routes.filter((route) => route.decision === "selected" && route.selected);
  const selectedContracts = [...new Set(selectedRoutes.map((route) => route.selected!.specId))].sort(compareCodePoints);
  const routedTargets = [...new Set(selectedRoutes.flatMap((route) => route.selected!.targetIds))].sort(compareCodePoints);
  return {
    valid: routing.valid,
    base: routing.base,
    baseSha: routing.baseSha,
    candidateDirectory: routing.candidateDirectory,
    candidates: routing.candidates.length,
    lifecycle: lifecycleCounts(routing),
    workingState: {
      changed: routing.changed.length,
      selected: selectedRoutes.length,
      violations: routing.routes.filter((route) => route.decision !== "selected").length,
    },
    selectedContracts,
    routedTargets,
    coverage: routing.coverage,
    next: nextLifecycleAction(routing),
    routing,
  };
}

