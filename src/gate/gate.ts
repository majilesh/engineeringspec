import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import { Codes } from "../diagnostics/codes.js";
import type { EngineeringSpec, TargetSurface } from "../model/types.js";
import { applicableTargets } from "../query/applicability.js";
import type { ChangedFile, ChangeKind, GateMatch, GateReport, GateViolation } from "./types.js";

const WRITE_POLICIES = new Set(["modify", "create", "delete", "interface_only"]);
const FORBIDDEN_POLICIES = new Set(["read_only", "observe"]);

function policyAllows(kind: ChangeKind, policy: TargetSurface["changePolicy"]): boolean {
  if (FORBIDDEN_POLICIES.has(policy)) return false;
  if (!WRITE_POLICIES.has(policy)) return false;
  switch (kind) {
    case "added":
      return policy === "create" || policy === "modify" || policy === "interface_only";
    case "deleted":
      return policy === "delete" || policy === "modify";
    case "modified":
    case "renamed":
      return policy === "modify" || policy === "interface_only";
    default:
      return false;
  }
}

function summarizeTargets(targets: TargetSurface[]): Array<Pick<TargetSurface, "id" | "changePolicy">> {
  return targets.map((target) => ({ id: target.id, changePolicy: target.changePolicy }));
}

function evaluatePath(
  spec: EngineeringSpec,
  filePath: string,
  kind: ChangeKind,
): { allowed?: GateMatch; violation?: GateViolation } {
  const targets = applicableTargets(spec, filePath);
  const summary = summarizeTargets(targets);
  if (targets.length === 0) {
    return {
      violation: {
        file: filePath,
        kind,
        reason: "out_of_scope",
        message: `${filePath} (${kind}) is outside all declared targets`,
        targets: summary,
      },
    };
  }
  if (targets.every((target) => FORBIDDEN_POLICIES.has(target.changePolicy))) {
    return {
      violation: {
        file: filePath,
        kind,
        reason: "read_only",
        message: `${filePath} (${kind}) matches only read_only/observe targets`,
        targets: summary,
      },
    };
  }
  const allowing = targets.filter((target) => policyAllows(kind, target.changePolicy));
  if (allowing.length === 0) {
    return {
      violation: {
        file: filePath,
        kind,
        reason: "policy",
        message: `${filePath} (${kind}) is not allowed by matching change_policy values (${targets.map((t) => `${t.id}:${t.changePolicy}`).join(", ")})`,
        targets: summary,
      },
    };
  }
  return {
    allowed: {
      file: filePath,
      kind,
      targets: summarizeTargets(allowing),
    },
  };
}

export function gateDiff(spec: EngineeringSpec, changed: ChangedFile[]): GateReport {
  const allowed: GateMatch[] = [];
  const violations: GateViolation[] = [];
  const diagnostics: Diagnostic[] = [];

  for (const change of changed) {
    const paths =
      change.kind === "renamed" && change.fromPath
        ? [
            { path: change.fromPath, kind: "deleted" as const },
            { path: change.path, kind: "added" as const },
          ]
        : [{ path: change.path, kind: change.kind }];

    for (const entry of paths) {
      const result = evaluatePath(spec, entry.path, entry.kind);
      if (result.allowed) allowed.push(result.allowed);
      if (result.violation) {
        violations.push(result.violation);
        diagnostics.push({
          code:
            result.violation.reason === "out_of_scope"
              ? Codes.gateOutOfScope
              : result.violation.reason === "read_only"
                ? Codes.gateReadOnly
                : Codes.gatePolicy,
          severity: "error",
          message: result.violation.message,
          file: entry.path,
          hint: "Update the EngineeringSpec targets/change_policy or remove the out-of-scope change.",
        });
      }
    }
  }

  return {
    valid: violations.length === 0,
    specId: spec.metadata.id,
    changed,
    allowed,
    violations,
    diagnostics,
  };
}
