import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import { Codes } from "../diagnostics/codes.js";
import type { AdoptionMode, RepositoryPolicy } from "../config/repositoryConfig.js";
import type { ChangedFile } from "../gate/types.js";
import type { Status } from "../model/types.js";
import { compareCodePoints } from "../normalizer/canonicalize.js";
import { matchTargetGlob } from "../path/targetGlob.js";
import { expandedChanges, routeChanges } from "../routing/route.js";
import {
  PASSING_DECISIONS,
  type EnforcementResult,
  type LoadedRoutingCandidate,
  type ReportedRoute,
  type RouteDecision,
  type SequencingAuditRecord,
} from "../routing/types.js";

/** Always protected in any configured mode, in addition to the specification directory (RFC 0014 §1). */
export const IMPLICITLY_PROTECTED_PATHS: readonly string[] = ["engineering-spec.json", ".github/CODEOWNERS", "CODEOWNERS", "docs/CODEOWNERS"];

export const DEFAULT_POLICY: RepositoryPolicy = { governedPaths: ["**"], exemptPaths: [], protectedPaths: [] };

export type PolicyMode = AdoptionMode | "bootstrap_advisory";

export interface PolicyEvaluationInput {
  mode: PolicyMode;
  policy: RepositoryPolicy;
  /** Repository-relative specification directory; "." disables its implicit protection. */
  specDirectory: string;
  candidates: LoadedRoutingCandidate[];
  /** Changes routed as implementation paths (contract-only changes never reach this layer). */
  changed: ChangedFile[];
  requiredStatuses?: Status[];
  baseSha?: string;
}

export interface PolicyEvaluation {
  routes: ReportedRoute[];
  diagnostics: Diagnostic[];
  sequencing: SequencingAuditRecord[];
  /** True only when every path is authorized and no error was reported; independent of mode. */
  authorized: boolean;
}

function matchesAny(file: string, globs: readonly string[]): boolean {
  return globs.some((glob) => matchTargetGlob(file, glob));
}

export function protectedGlobs(policy: RepositoryPolicy, specDirectory: string): string[] {
  return [...policy.protectedPaths, ...IMPLICITLY_PROTECTED_PATHS, ...(specDirectory === "." ? [] : [`${specDirectory}/**`])];
}

function isFullProfile(candidate: LoadedRoutingCandidate | undefined): boolean {
  return Boolean(candidate) && !(candidate!.spec.metadata.profiles ?? []).some((profile) => profile.name === "lite");
}

function withoutSelection(route: ReportedRoute, decision: RouteDecision): ReportedRoute {
  const rest = { ...route };
  delete rest.selected;
  return { ...rest, decision };
}

/**
 * RFC 0014 §2 decision order for the modes implemented so far: deny, protected,
 * exempt, ungoverned, then governed claims. Decisions never depend on mode;
 * only `enforcementFor` does (CON-MODES).
 */
export function evaluatePolicyRouting(input: PolicyEvaluationInput): PolicyEvaluation {
  const required = input.requiredStatuses ?? ["approved"];
  const eligible = input.candidates.filter((candidate) => required.includes(candidate.spec.metadata.status));
  // With a mode configured, "no eligible contracts" is decided per path, not as a whole-change error (C9).
  const base = eligible.length > 0
    ? routeChanges(input.candidates, input.changed, required, input.baseSha ? { baseSha: input.baseSha } : {})
    : {
        routes: expandedChanges(input.changed)
          .sort((left, right) => compareCodePoints(left.path, right.path) || compareCodePoints(left.kind, right.kind))
          .map((entry): ReportedRoute => ({ path: entry.path, kind: entry.kind, decision: "uncovered", allows: [], denies: [], claims: [] })),
        diagnostics: expandedChanges(input.changed).map((entry): Diagnostic => ({
          code: Codes.routingUncovered,
          severity: "error",
          file: entry.path,
          message: `${entry.path} (${entry.kind}) is not claimed by any eligible EngineeringSpec`,
          hint: "Merge a contract-only change that grants this path, or exempt it in the trusted-base engineering-spec.json policy.",
        })),
        sequencing: [] as SequencingAuditRecord[],
      };
  const byClaim = new Map(input.candidates.map((candidate) => [`${candidate.spec.metadata.id}\0${candidate.path}`, candidate]));
  const protectedList = protectedGlobs(input.policy, input.specDirectory);
  const remapped = new Set<string>();
  const added: Diagnostic[] = [];
  const routes = base.routes.map((route): ReportedRoute => {
    if (route.decision === "denied") return route;
    if (matchesAny(route.path, protectedList)) {
      const selected = route.decision === "selected" && route.selected
        ? byClaim.get(`${route.selected.specId}\0${route.selected.specPath}`)
        : undefined;
      if (isFullProfile(selected)) return route;
      remapped.add(route.path);
      added.push({
        code: Codes.routingProtected,
        severity: "error",
        file: route.path,
        message: `${route.path} (${route.kind}) is protected and needs authority from exactly one approved full-profile change contract`,
        hint: "Merge a contract-only change that grants this path, or change protectedPaths in the trusted-base engineering-spec.json.",
      });
      return withoutSelection(route, "protected_unauthorized");
    }
    if (matchesAny(route.path, input.policy.exemptPaths)) {
      remapped.add(route.path);
      return withoutSelection(route, "exempt");
    }
    if (!matchesAny(route.path, input.policy.governedPaths)) {
      remapped.add(route.path);
      return withoutSelection(route, "ungoverned");
    }
    return route;
  });
  // Policy decisions replace the uncovered/ambiguous findings for the same path.
  const superseded = new Set<string>([Codes.routingUncovered, Codes.routingAmbiguous]);
  const diagnostics = [
    ...base.diagnostics.filter((item) => !(item.file && remapped.has(item.file) && superseded.has(item.code))),
    ...added,
  ];
  return {
    routes,
    diagnostics,
    sequencing: base.sequencing,
    authorized: routes.every((route) => PASSING_DECISIONS.has(route.decision))
      && !diagnostics.some((item) => item.severity === "error"),
  };
}

/** Maps authorization to an exit-code outcome. Advisory never blocks, but never authorizes either. */
export function enforcementFor(mode: PolicyMode | "legacy", authorized: boolean, configError = false): EnforcementResult {
  if (configError) return { mode, outcome: "error", enforced: mode !== "advisory" && mode !== "bootstrap_advisory" };
  if (mode === "advisory" || mode === "bootstrap_advisory") return { mode, outcome: "pass", enforced: false };
  return { mode, outcome: authorized ? "pass" : "fail", enforced: true };
}
