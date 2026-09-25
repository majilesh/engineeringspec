import { isPassingDecision } from "../policy/evaluate.js";
import type { ChangeKind } from "../gate/types.js";
import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import type { EnforcementResult, ReportedRoute, RouteDecision } from "../routing/types.js";

export interface GuardPathVerdict {
  path: string;
  kind: ChangeKind;
  decision: RouteDecision;
  allow: boolean;
}

/**
 * The edit guard's answer for a proposed change (RFC 0014 §9). It is a projection of the
 * same trusted-base routing CI runs, so it can never be more permissive than CI.
 * `deny` only when the repository enforces; advisory repositories get `warn`.
 */
export interface GuardResult {
  verdict: "allow" | "deny" | "warn";
  enforcement: EnforcementResult;
  paths: GuardPathVerdict[];
  reasons: string[];
}

export function guardVerdict(report: { valid: boolean; routes: ReportedRoute[]; diagnostics: Diagnostic[]; enforcement: EnforcementResult }): GuardResult {
  const paths = report.routes.map((route) => ({
    path: route.path,
    kind: route.kind,
    decision: route.decision,
    allow: isPassingDecision(route.decision, report.enforcement.mode),
  }));
  const reasons = report.diagnostics.filter((item) => item.severity === "error").map((item) => `${item.code} ${item.message}`);
  const verdict = report.valid ? "allow" : report.enforcement.enforced ? "deny" : "warn";
  return { verdict, enforcement: report.enforcement, paths, reasons };
}
