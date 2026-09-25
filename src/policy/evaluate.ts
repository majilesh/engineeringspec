import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import { Codes } from "../diagnostics/codes.js";
import type { AdoptionMode, RepositoryPolicy } from "../config/repositoryConfig.js";
import type { ChangedFile } from "../gate/types.js";
import type { Status } from "../model/types.js";
import { compareCodePoints } from "../normalizer/canonicalize.js";
import { matchTargetGlob } from "../path/targetGlob.js";
import { expandedChanges, routeChanges } from "../routing/route.js";
import type {
  EnforcementResult,
  LoadedRoutingCandidate,
  ReportedRoute,
  RouteDecision,
  RoutingClaim,
  SequencingAuditRecord,
} from "../routing/types.js";

/** Always protected in any configured mode, in addition to the specification directory (RFC 0014 §1). */
export const IMPLICITLY_PROTECTED_PATHS: readonly string[] = ["engineering-spec.json", ".github/CODEOWNERS", "CODEOWNERS", "docs/CODEOWNERS"];

export const DEFAULT_POLICY: RepositoryPolicy = { governedPaths: ["**"], exemptPaths: [], protectedPaths: [], grantBeforeSpendPaths: [] };

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
  /** Trusted base commit time (ISO 8601). Standing expiry is judged against it, never wall-clock time. */
  baseTimestamp?: string;
}

export interface PolicyEvaluation {
  routes: ReportedRoute[];
  diagnostics: Diagnostic[];
  sequencing: SequencingAuditRecord[];
  /** True only when every path is authorized for this mode and no error was reported. */
  authorized: boolean;
}

/** Decisions that authorize a path. `standing` does not in controlled mode (RFC 0014 C7). */
export function isPassingDecision(decision: RouteDecision, mode: PolicyMode | "legacy"): boolean {
  if (decision === "standing") return mode !== "controlled";
  return decision === "selected" || decision === "exempt" || decision === "ungoverned";
}

function matchesAny(file: string, globs: readonly string[]): boolean {
  return globs.some((glob) => matchTargetGlob(file, glob));
}

export function protectedGlobs(policy: RepositoryPolicy, specDirectory: string): string[] {
  return [...policy.protectedPaths, ...IMPLICITLY_PROTECTED_PATHS, ...(specDirectory === "." ? [] : [`${specDirectory}/**`])];
}

export function isStanding(candidate: LoadedRoutingCandidate): boolean {
  return candidate.spec.metadata.authorityKind === "standing";
}

/** Standing authority without a valid future expiry is ineligible to allow; its denies still apply. */
export function isExpired(candidate: LoadedRoutingCandidate, baseTimestamp: string | undefined): boolean {
  if (!isStanding(candidate)) return false;
  const expires = Date.parse(candidate.spec.metadata.expiresAt ?? "");
  const base = Date.parse(baseTimestamp ?? "");
  return Number.isNaN(expires) || Number.isNaN(base) || expires <= base;
}

function isFullProfile(candidate: LoadedRoutingCandidate | undefined): boolean {
  return Boolean(candidate) && !(candidate!.spec.metadata.profiles ?? []).some((profile) => profile.name === "lite");
}

const describeClaims = (claims: RoutingClaim[]): string =>
  claims.map((item) => `${item.specId}@r${item.specRevision} (${item.specPath}, ${item.semanticDigest})`).join(", ");

/**
 * RFC 0014 §2 decision order: deny, protected, exempt, ungoverned, grant-before-spend,
 * then governed claims with change authority ahead of standing authority. Routing runs
 * once over every eligible contract, so maintenance sequencing and denies see the full
 * trusted-base candidate set; claims are only partitioned afterwards.
 */
export function evaluatePolicyRouting(input: PolicyEvaluationInput): PolicyEvaluation {
  const required = input.requiredStatuses ?? ["approved"];
  const eligible = input.candidates.filter((candidate) => required.includes(candidate.spec.metadata.status));
  const base = eligible.length > 0
    ? routeChanges(input.candidates, input.changed, required, input.baseSha ? { baseSha: input.baseSha } : {})
    : {
        routes: expandedChanges(input.changed)
          .sort((left, right) => compareCodePoints(left.path, right.path) || compareCodePoints(left.kind, right.kind))
          .map((entry): ReportedRoute => ({ path: entry.path, kind: entry.kind, decision: "uncovered", allows: [], denies: [], claims: [] })),
        diagnostics: [] as Diagnostic[],
        sequencing: [] as SequencingAuditRecord[],
      };
  const byClaim = new Map(input.candidates.map((candidate) => [`${candidate.spec.metadata.id}\0${candidate.path}`, candidate]));
  const candidateOf = (claim: RoutingClaim): LoadedRoutingCandidate | undefined => byClaim.get(`${claim.specId}\0${claim.specPath}`);
  const protectedList = protectedGlobs(input.policy, input.specDirectory);
  const diagnostics: Diagnostic[] = [];

  const routes = base.routes.map((route): ReportedRoute => {
    const at = `${route.path} (${route.kind})`;
    const decide = (decision: RouteDecision, selected?: RoutingClaim): ReportedRoute => {
      const rest: ReportedRoute = { ...route, decision };
      delete rest.selected;
      return selected ? { ...rest, selected } : rest;
    };
    if (route.denies.length > 0) {
      diagnostics.push({ code: Codes.routingDenied, severity: "error", file: route.path, message: `${at} is denied by ${route.denies.map((item) => item.specId).join(", ")}; deny overrides allow` });
      return decide("denied");
    }
    const expired = route.allows.filter((claim) => { const candidate = candidateOf(claim); return candidate ? isExpired(candidate, input.baseTimestamp) : false; });
    const live = route.allows.filter((claim) => !expired.includes(claim));
    const change = live.filter((claim) => { const candidate = candidateOf(claim); return !candidate || !isStanding(candidate); });
    const standing = live.filter((claim) => { const candidate = candidateOf(claim); return Boolean(candidate && isStanding(candidate)); });
    const reportExpired = (severity: Diagnostic["severity"]): void => {
      for (const claim of expired) {
        diagnostics.push({ code: Codes.routingStandingExpired, severity, file: route.path, message: `Standing authority ${claim.specId} has expired at the trusted base and no longer allows ${at}`, hint: "Approve a renewed standing contract or a change contract for this path." });
      }
    };
    const standingNotPermitted = (): void => {
      if (standing.length === 0) return;
      diagnostics.push({ code: Codes.routingStandingProtected, severity: "error", file: route.path, message: `${at} is claimed by standing authority (${standing.map((item) => item.specId).join(", ")}), which never satisfies protected or grant-before-spend paths`, hint: "Merge an approved change contract for this path." });
    };
    const uncovered = (): ReportedRoute => {
      reportExpired("error");
      diagnostics.push({ code: Codes.routingUncovered, severity: "error", file: route.path, message: `${at} is not claimed by any eligible EngineeringSpec`, hint: "Merge a contract-only change that grants this path, or exempt it in the trusted-base engineering-spec.json policy." });
      return decide("uncovered");
    };
    const ambiguous = (claims: RoutingClaim[]): ReportedRoute => {
      diagnostics.push({ code: Codes.routingAmbiguous, severity: "error", file: route.path, message: `${at} is allowed by multiple EngineeringSpecs: ${describeClaims(claims)}`, hint: "Name one contract with a selector, narrow the paths, or revise authority in a contract-only change." });
      return decide("ambiguous");
    };
    const selectedBy = (claim: RoutingClaim, decision: RouteDecision = "selected"): ReportedRoute => {
      reportExpired("info");
      return decide(decision, claim);
    };
    const changeOnly = (): ReportedRoute => {
      if (change.length === 1) return selectedBy(change[0]!);
      if (change.length > 1) return ambiguous(change);
      standingNotPermitted();
      return uncovered();
    };

    if (matchesAny(route.path, protectedList)) {
      if (change.length === 1 && isFullProfile(candidateOf(change[0]!))) return selectedBy(change[0]!);
      standingNotPermitted();
      diagnostics.push({ code: Codes.routingProtected, severity: "error", file: route.path, message: `${at} is protected and needs authority from exactly one approved full-profile change contract`, hint: "Merge a contract-only change that grants this path, or change protectedPaths in the trusted-base engineering-spec.json." });
      return decide("protected_unauthorized");
    }
    if (matchesAny(route.path, input.policy.exemptPaths)) return decide("exempt");
    if (!matchesAny(route.path, input.policy.governedPaths)) return decide("ungoverned");
    if (matchesAny(route.path, input.policy.grantBeforeSpendPaths) || change.length > 0) return changeOnly();
    if (standing.length === 1) return selectedBy(standing[0]!, "standing");
    if (standing.length > 1) return ambiguous(standing);
    return uncovered();
  });

  // Keep whole-change and sequencing findings; per-path routing findings are re-derived above.
  const rederived = new Set<string>([Codes.routingUncovered, Codes.routingAmbiguous, Codes.routingDenied]);
  const all = [...base.diagnostics.filter((item) => !(item.file && rederived.has(item.code))), ...diagnostics];
  return {
    routes,
    diagnostics: all,
    sequencing: base.sequencing,
    authorized: routes.every((route) => isPassingDecision(route.decision, input.mode))
      && !all.some((item) => item.severity === "error"),
  };
}

/** Maps authorization to an exit-code outcome. Advisory never blocks, but never authorizes either. */
export function enforcementFor(mode: PolicyMode | "legacy", authorized: boolean, configError = false): EnforcementResult {
  if (configError) return { mode, outcome: "error", enforced: mode !== "advisory" && mode !== "bootstrap_advisory" };
  if (mode === "advisory" || mode === "bootstrap_advisory") return { mode, outcome: "pass", enforced: false };
  return { mode, outcome: authorized ? "pass" : "fail", enforced: true };
}
