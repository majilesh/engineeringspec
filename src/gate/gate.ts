import { createHash } from "node:crypto";
import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import { Codes } from "../diagnostics/codes.js";
import type { EngineeringSpec, Status, TargetSurface } from "../model/types.js";
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
): { allowed?: GateMatch; violation?: GateViolation; warnings?: Diagnostic[] } {
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

  // Deny overrides allow: any matching read_only/observe target blocks the path.
  const denied = targets.filter((target) => FORBIDDEN_POLICIES.has(target.changePolicy));
  if (denied.length > 0) {
    return {
      violation: {
        file: filePath,
        kind,
        reason: "read_only",
        message: `${filePath} (${kind}) matches read_only/observe target(s) (${denied.map((t) => t.id).join(", ")}); deny overrides allow`,
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

  const warnings: Diagnostic[] = [];
  if (allowing.some((target) => target.changePolicy === "interface_only")) {
    warnings.push({
      code: Codes.gateInterfaceOnly,
      severity: "warning",
      message: `${filePath}: interface_only is path-scoped only; contents are not checked for interface-surface changes`,
      file: filePath,
      hint: "Use an API/schema/ABI diff adapter for true interface enforcement, or rename the policy intent in docs.",
    });
  }

  return {
    allowed: {
      file: filePath,
      kind,
      targets: summarizeTargets(allowing),
    },
    warnings,
  };
}

export interface GateDiffOptions {
  base?: string;
  head?: string;
  baseSha?: string;
  headSha?: string;
  specDigest?: string;
  specSource?: "workspace" | "base";
  requireStatus?: Status[];
}

function digestChangedFiles(changed: ChangedFile[]): string {
  const lines = [...changed]
    .map((item) => `${item.kind}\t${item.fromPath ?? ""}\t${item.path}`)
    .sort();
  const payload = `${lines.join("\n")}\n`;
  return `sha256:${createHash("sha256").update(payload, "utf8").digest("hex")}`;
}

export function gateDiff(spec: EngineeringSpec, changed: ChangedFile[], options: GateDiffOptions = {}): GateReport {
  const allowed: GateMatch[] = [];
  const violations: GateViolation[] = [];
  const diagnostics: Diagnostic[] = [];

  if (options.requireStatus?.length) {
    const status = spec.metadata.status;
    if (!options.requireStatus.includes(status)) {
      diagnostics.push({
        code: Codes.gateStatus,
        severity: "error",
        message: `Spec status ${JSON.stringify(status)} is not in required set [${options.requireStatus.join(", ")}]`,
        hint: "Approve the EngineeringSpec (or pass an allowed --require-status) before enforcing the gate.",
      });
      violations.push({
        file: spec.metadata.id,
        kind: "modified",
        reason: "status",
        message: `status ${status} rejected by --require-status`,
        targets: [],
      });
    }
  }

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
      if (result.warnings) diagnostics.push(...result.warnings);
      if (result.violation) {
        violations.push(result.violation);
        diagnostics.push({
          code:
            result.violation.reason === "out_of_scope"
              ? Codes.gateOutOfScope
              : result.violation.reason === "read_only"
                ? Codes.gateReadOnly
                : result.violation.reason === "status"
                  ? Codes.gateStatus
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
    specStatus: spec.metadata.status,
    ...(options.specDigest !== undefined ? { specDigest: options.specDigest } : {}),
    ...(options.specSource !== undefined ? { specSource: options.specSource } : {}),
    ...(options.base !== undefined ? { base: options.base } : {}),
    ...(options.head !== undefined ? { head: options.head } : {}),
    ...(options.baseSha !== undefined ? { baseSha: options.baseSha } : {}),
    ...(options.headSha !== undefined ? { headSha: options.headSha } : {}),
    changedDigest: digestChangedFiles(changed),
    changed,
    allowed,
    violations,
    diagnostics,
  };
}
