import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import { Codes } from "../diagnostics/codes.js";
import type { AdoptionMode, RepositoryPolicy, SelectionConfig } from "../config/repositoryConfig.js";
import { isEngineeringSpecId } from "../model/ids.js";
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
  /** Untrusted requests naming one contract; they can only narrow the positive claims considered. */
  selector?: SelectorSource[];
  /** Added plus deleted lines for the same range as `changed`; absent when counts are unavailable. */
  changedLines?: number;
}

export interface SelectorSource {
  source: "cli" | "label" | "branch" | "trailer";
  value: string;
}

export const CONTRACT_TRAILER = "EngineeringSpec-Contract";

/**
 * Collects selector requests. Labels and branch names count only when the trusted-base
 * configuration opts in with a prefix; explicit --contract values and commit trailers
 * (which survive into merge-queue commits) are always read (RFC 0014 §3, C20).
 */
export function selectorSources(
  request: { contract?: string; labels?: string[]; branch?: string; trailers?: string[] },
  selection: SelectionConfig | undefined,
): SelectorSource[] {
  const sources: SelectorSource[] = [];
  if (request.contract) sources.push({ source: "cli", value: request.contract });
  for (const trailer of request.trailers ?? []) if (trailer.trim()) sources.push({ source: "trailer", value: trailer.trim() });
  if (selection?.label) {
    for (const label of request.labels ?? []) if (label.startsWith(selection.label)) sources.push({ source: "label", value: label.slice(selection.label.length) });
  }
  if (selection?.branch && request.branch?.startsWith(selection.branch)) {
    sources.push({ source: "branch", value: request.branch.slice(selection.branch.length).split("/")[0] ?? "" });
  }
  return sources;
}

function resolveSelector(input: PolicyEvaluationInput, required: Status[]): { selected?: LoadedRoutingCandidate; diagnostics: Diagnostic[] } {
  const sources = input.selector ?? [];
  if (sources.length === 0) return { diagnostics: [] };
  const invalid = (message: string): Diagnostic => ({ code: Codes.routingSelector, severity: "error", message, hint: "Name exactly one approved, unexpired contract from the trusted base with --contract, a commit trailer, or the configured label or branch prefix." });
  const describe = sources.map((item) => `${item.source}=${JSON.stringify(item.value)}`).join(", ");
  const malformed = sources.filter((item) => !isEngineeringSpecId(item.value));
  if (malformed.length > 0) return { diagnostics: [invalid(`Selector ${malformed.map((item) => `${item.source}=${JSON.stringify(item.value)}`).join(", ")} is not a valid EngineeringSpec ID`)] };
  const ids = [...new Set(sources.map((item) => item.value))];
  if (ids.length > 1) return { diagnostics: [invalid(`Selector sources name different contracts (${describe})`)] };
  const matches = input.candidates.filter((candidate) => candidate.spec.metadata.id === ids[0]);
  if (matches.length !== 1) return { diagnostics: [invalid(`Selector ${ids[0]} matches ${matches.length} trusted-base contracts; exactly one is required`)] };
  const selected = matches[0]!;
  if (!required.includes(selected.spec.metadata.status)) return { diagnostics: [invalid(`Selector ${ids[0]} names a ${selected.spec.metadata.status} contract, which grants no authority`)] };
  if (isExpired(selected, input.baseTimestamp)) {
    return {
      diagnostics: [
        invalid(`Selector ${ids[0]} names expired standing authority`),
        { code: Codes.routingStandingExpired, severity: "error", message: `Standing authority ${ids[0]} has expired at the trusted base`, hint: "Approve a renewed standing contract or a change contract." },
      ],
    };
  }
  return { selected, diagnostics: [] };
}

export interface PolicyEvaluation {
  routes: ReportedRoute[];
  diagnostics: Diagnostic[];
  sequencing: SequencingAuditRecord[];
  /** True only when every path is authorized for this mode and no error was reported. */
  authorized: boolean;
  /** The contract a valid selector narrowed routing to. */
  selectedContract?: string;
  /** Whole-change decisions; present only when a change budget applied (RFC 0014 §7, C3). */
  changeDecisions?: Array<"over_budget">;
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
  const selector = resolveSelector(input, required);
  // An invalid selector never falls back to unselected routing (RFC 0014 §3).
  if (selector.diagnostics.length > 0) return { routes: [], diagnostics: selector.diagnostics, sequencing: [], authorized: false };
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
    // A selector narrows positive claims to one contract; every contract's denies were applied above.
    const scoped = selector.selected
      ? route.allows.filter((claim) => claim.specId === selector.selected!.spec.metadata.id && claim.specPath === selector.selected!.path)
      : route.allows;
    const expired = scoped.filter((claim) => { const candidate = candidateOf(claim); return candidate ? isExpired(candidate, input.baseTimestamp) : false; });
    const live = scoped.filter((claim) => !expired.includes(claim));
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

  const budget = evaluateBudget(input, routes, selector.selected, candidateOf);
  // Keep whole-change and sequencing findings; per-path routing findings are re-derived above.
  const rederived = new Set<string>([Codes.routingUncovered, Codes.routingAmbiguous, Codes.routingDenied]);
  const all = [...base.diagnostics.filter((item) => !(item.file && rederived.has(item.code))), ...diagnostics, ...budget.diagnostics];
  return {
    ...(selector.selected ? { selectedContract: selector.selected.spec.metadata.id } : {}),
    ...(budget.changeDecisions ? { changeDecisions: budget.changeDecisions } : {}),
    routes,
    diagnostics: all,
    sequencing: base.sequencing,
    authorized: routes.every((route) => isPassingDecision(route.decision, input.mode))
      && !all.some((item) => item.severity === "error"),
  };
}

/**
 * A single attributed change contract's budget overrides the repository default. Every
 * routed file counts, including exempt ones; a rename is one file (RFC 0014 C13, C21).
 */
function evaluateBudget(
  input: PolicyEvaluationInput,
  routes: ReportedRoute[],
  selected: LoadedRoutingCandidate | undefined,
  candidateOf: (claim: RoutingClaim) => LoadedRoutingCandidate | undefined,
): { changeDecisions?: Array<"over_budget">; diagnostics: Diagnostic[] } {
  const attributed = new Map<string, LoadedRoutingCandidate>();
  for (const route of routes) {
    if (route.decision !== "selected" || !route.selected) continue;
    const candidate = candidateOf(route.selected);
    if (candidate) attributed.set(`${candidate.spec.metadata.id}\0${candidate.path}`, candidate);
  }
  const owner = selected && !isStanding(selected) ? selected : attributed.size === 1 ? [...attributed.values()][0] : undefined;
  const limits = owner?.spec.metadata.changeBudget ?? input.policy.budgets;
  if (!limits) return { diagnostics: [] };
  const source = owner?.spec.metadata.changeBudget ? `contract ${owner.spec.metadata.id}` : "the repository policy";
  const files = input.changed.length;
  const lines = input.changedLines;
  const over: string[] = [];
  if (limits.maxFiles !== undefined && files > limits.maxFiles) over.push(`${files} files exceeds ${limits.maxFiles}`);
  if (limits.maxChangedLines !== undefined && lines !== undefined && lines > limits.maxChangedLines) over.push(`${lines} changed lines exceeds ${limits.maxChangedLines}`);
  const diagnostics: Diagnostic[] = [];
  if (limits.maxChangedLines !== undefined && lines === undefined) {
    diagnostics.push({ code: Codes.routingBudget, severity: "info", message: `Changed-line budget from ${source} was not evaluated because line counts are unavailable for explicitly listed paths` });
  }
  if (over.length > 0) {
    diagnostics.push({ code: Codes.routingBudget, severity: "error", message: `Change budget from ${source} exceeded: ${over.join("; ")}`, hint: "Split the change, or raise the budget in a reviewed contract-only change." });
  }
  return { changeDecisions: over.length > 0 ? ["over_budget"] : [], diagnostics };
}

/** Maps authorization to an exit-code outcome. Advisory never blocks, but never authorizes either. */
export function enforcementFor(mode: PolicyMode | "legacy", authorized: boolean, configError = false): EnforcementResult {
  if (configError) return { mode, outcome: "error", enforced: mode !== "advisory" && mode !== "bootstrap_advisory" };
  if (mode === "advisory" || mode === "bootstrap_advisory") return { mode, outcome: "pass", enforced: false };
  return { mode, outcome: authorized ? "pass" : "fail", enforced: true };
}
