import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import { Codes } from "../diagnostics/codes.js";
import type { EngineeringSpec, TargetSurface } from "../model/types.js";
import { matchTargetGlob, validateTargetGlob } from "../path/targetGlob.js";
import { isSafeRelativePath } from "./pathSafety.js";

const digestPattern = /^sha256:[a-fA-F0-9]{64}$/;
const FORBIDDEN_POLICIES = new Set(["read_only", "observe"]);

function digestValid(value: unknown): boolean {
  if (typeof value === "string") return digestPattern.test(value);
  if (value && typeof value === "object") {
    const d = value as Record<string, unknown>;
    return (d.algorithm === undefined || d.algorithm === "sha256") && typeof d.value === "string" && /^[a-fA-F0-9]{64}$/.test(d.value);
  }
  return false;
}

/** Best-effort probe path for nested glob overlap detection (not a full glob algebra). */
function probePath(pattern: string): string {
  return pattern
    .replace(/\/\*\*$/g, "/__es_probe__")
    .replace(/\/\*$/g, "/__es_probe__")
    .replace(/\*\*/g, "__es_dstar__")
    .replace(/\*/g, "__es_star__")
    .replace(/\?/g, "x");
}

function patternsLikelyOverlap(a: string, b: string): boolean {
  if (a === b) return true;
  const pa = probePath(a);
  const pb = probePath(b);
  return matchTargetGlob(pa, b) || matchTargetGlob(pb, a);
}

function policiesIncompatible(a: TargetSurface["changePolicy"], b: TargetSurface["changePolicy"]): boolean {
  return FORBIDDEN_POLICIES.has(a) !== FORBIDDEN_POLICIES.has(b);
}

function warnOverlappingTargetPolicies(spec: EngineeringSpec, add: (d: Omit<Diagnostic, "file">) => void): void {
  const entries = spec.targets.flatMap((target) => target.paths.map((pattern) => ({ target, pattern })));
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const left = entries[i]!;
      const right = entries[j]!;
      if (left.pattern === right.pattern) continue;
      if (!policiesIncompatible(left.target.changePolicy, right.target.changePolicy)) continue;
      if (!patternsLikelyOverlap(left.pattern, right.pattern)) continue;
      add({
        code: Codes.conflict,
        severity: "warning",
        message: `Target patterns ${JSON.stringify(left.pattern)} (${left.target.changePolicy}, ${left.target.id}) and ${JSON.stringify(right.pattern)} (${right.target.changePolicy}, ${right.target.id}) likely overlap with incompatible policies; gate uses deny-overrides for read_only/observe`,
      });
    }
  }
}

function requireTyped(
  id: string,
  expected: Set<string>,
  expectedLabel: string,
  add: (d: Omit<Diagnostic, "file">) => void,
  context: string,
  registry: Map<string, string>,
): void {
  if (expected.has(id)) return;
  if (registry.has(id)) {
    add({
      code: Codes.typedRef,
      severity: "error",
      message: `${context} references ${JSON.stringify(id)} which is not a ${expectedLabel}`,
    });
    return;
  }
  add({
    code: Codes.dangling,
    severity: "error",
    message: `${context} references missing ${expectedLabel} ${JSON.stringify(id)}`,
  });
}

export function validateSemantics(spec: EngineeringSpec, file?: string): Diagnostic[] {
  const out: Diagnostic[] = [];
  const add = (d: Omit<Diagnostic, "file">) => out.push({ ...d, ...(file ? { file } : {}) });
  if (!spec.metadata || !Array.isArray(spec.sourceRefs) || !Array.isArray(spec.targets) || !Array.isArray(spec.verification)) return out;

  const groups: unknown[][] = [
    spec.sourceRefs,
    spec.targets,
    spec.decisions ?? [],
    spec.contracts ?? [],
    spec.constraints ?? [],
    spec.verification,
    spec.evidence ?? [],
    spec.exceptions ?? [],
  ];
  const registry = new Map<string, string>();
  for (const [index, group] of groups.entries()) {
    for (const item of group) {
      if (item && typeof item === "object" && "id" in item && typeof item.id === "string") {
        const first = registry.get(item.id);
        if (first) add({ code: Codes.duplicateId, severity: "error", message: `ID ${JSON.stringify(item.id)} duplicates a definition in ${first}` });
        else registry.set(item.id, `group ${index + 1}`);
      }
    }
  }

  const targetIds = new Set(spec.targets.map((item) => item.id));
  const contractIds = new Set((spec.contracts ?? []).map((item) => item.id));
  const constraintIds = new Set((spec.constraints ?? []).map((item) => item.id));
  const verifierIds = new Set(spec.verification.map((item) => item.id));
  const sourceItems = new Set(spec.sourceRefs.flatMap((source) => source.itemIds ?? []));
  const recognised = (id: string) => registry.has(id) || sourceItems.has(id);

  const checkPath = (value: string, label: string) => {
    if (!isSafeRelativePath(value)) add({ code: Codes.path, severity: "error", message: `${label} must be a safe repository-relative path: ${JSON.stringify(value)}` });
  };

  for (const source of spec.sourceRefs) {
    if (source.path) checkPath(source.path, `Source ${source.id} path`);
    if (source.digest && !digestValid(source.digest)) add({ code: Codes.invalidDigest, severity: "error", message: `Source ${source.id} has an invalid SHA-256 digest` });
  }
  for (const target of spec.targets) {
    for (const p of target.paths) {
      checkPath(p, `Target ${target.id} path`);
      const globError = validateTargetGlob(p);
      if (globError) add({ code: Codes.glob, severity: "error", message: `Target ${target.id} path ${JSON.stringify(p)}: ${globError}` });
    }
  }
  for (const contract of spec.contracts ?? []) {
    if (contract.path) checkPath(contract.path, `Contract ${contract.id} path`);
    if (contract.digest && !digestValid(contract.digest)) add({ code: Codes.invalidDigest, severity: "error", message: `Contract ${contract.id} has an invalid SHA-256 digest` });
  }

  const policies = new Map<string, { id: string; policy: string }>();
  for (const target of spec.targets) {
    for (const p of target.paths) {
      const previous = policies.get(p);
      if (previous && previous.policy !== target.changePolicy) {
        add({
          code: Codes.conflict,
          severity: "error",
          message: `Target path ${JSON.stringify(p)} has conflicting policies ${previous.policy} (${previous.id}) and ${target.changePolicy} (${target.id})`,
        });
      } else policies.set(p, { id: target.id, policy: target.changePolicy });
    }
  }
  warnOverlappingTargetPolicies(spec, add);

  for (const constraint of spec.constraints ?? []) {
    for (const id of constraint.appliesTo ?? []) {
      requireTyped(id, targetIds, "target", add, `Constraint ${constraint.id}`, registry);
    }
    for (const id of constraint.satisfies ?? []) {
      if (!recognised(id)) add({ code: Codes.dangling, severity: "error", message: `Constraint ${constraint.id} satisfies unknown item ${JSON.stringify(id)}` });
    }
    if (constraint.level === "escalate" && !(constraint.exceptionRequires?.length)) {
      add({ code: Codes.schema, severity: "error", message: `Escalating constraint ${constraint.id} requires exceptionRequires` });
    }
    const e = constraint.enforcement;
    if (e?.kind === "policy") {
      if (!e.adapter?.trim() || !e.ruleRef?.trim()) add({ code: Codes.schema, severity: "error", message: `Policy enforcement on ${constraint.id} requires adapter and ruleRef` });
    } else if (e?.kind === "test") {
      if (!e.verifierRef?.trim()) add({ code: Codes.schema, severity: "error", message: `Test enforcement on ${constraint.id} requires verifierRef` });
      else requireTyped(e.verifierRef, verifierIds, "verifier", add, `Constraint ${constraint.id}`, registry);
    } else if (e?.kind === "contract") {
      if (!e.contractRef?.trim()) add({ code: Codes.schema, severity: "error", message: `Contract enforcement on ${constraint.id} requires contractRef` });
      else requireTyped(e.contractRef, contractIds, "contract", add, `Constraint ${constraint.id}`, registry);
    } else if (e?.kind === "review") {
      if (!e.reviewerRole?.trim()) add({ code: Codes.schema, severity: "error", message: `Review enforcement on ${constraint.id} requires reviewerRole` });
    }
    if ((constraint.level === "must" || constraint.level === "must_not") && !constraint.enforcement) {
      add({ code: Codes.traceability, severity: "warning", message: `Absolute constraint ${constraint.id} has no declared enforcement` });
    }
    if (e?.kind === "none") add({ code: Codes.traceability, severity: "warning", message: `Absolute constraint ${constraint.id} is explicitly unenforced` });
  }

  for (const verifier of spec.verification) {
    for (const id of verifier.proves) {
      if (!recognised(id)) add({ code: Codes.dangling, severity: "error", message: `Verifier ${verifier.id} proves unknown item ${JSON.stringify(id)}` });
    }
    if (verifier.runner?.workingDirectory) checkPath(verifier.runner.workingDirectory, `Verifier ${verifier.id} working directory`);
    const rawRunner = verifier.runner as unknown as Record<string, unknown> | undefined;
    if (rawRunner && (typeof rawRunner.command === "string" || typeof rawRunner.shell === "string" || ("argv" in rawRunner && !Array.isArray(rawRunner.argv)))) {
      add({ code: Codes.commandString, severity: "error", message: `Shell command strings are not allowed for ${verifier.id}; use argv` });
    }
    if (verifier.runner?.type === "command" && !verifier.runner.argv?.length) {
      add({ code: Codes.commandString, severity: "error", message: `Command verifier ${verifier.id} must declare argv as an array` });
    }
    if ((verifier.runner?.type === "reference" || verifier.runner?.type === "external") && !verifier.runner.reference?.trim()) {
      add({ code: Codes.schema, severity: "error", message: `${verifier.runner.type} runner on ${verifier.id} requires reference` });
    }
    if (verifier.kind === "human_review" && verifier.runner && !(["manual", "reference"] as string[]).includes(verifier.runner.type)) {
      add({ code: Codes.schema, severity: "error", message: `Human review verifier ${verifier.id} must use a manual or reference runner` });
    }
    if (verifier.kind === "ai_eval" && !verifier.definitionRef && verifier.runner?.type !== "external") {
      add({ code: Codes.schema, severity: "error", message: `AI eval verifier ${verifier.id} requires definitionRef or an external runner` });
    }
  }

  for (const evidence of spec.evidence ?? []) {
    if (evidence.verifierRef) requireTyped(evidence.verifierRef, verifierIds, "verifier", add, `Evidence ${evidence.id}`, registry);
  }
  for (const exception of spec.exceptions ?? []) {
    requireTyped(exception.constraintRef, constraintIds, "constraint", add, `Exception ${exception.id}`, registry);
    if (exception.expiresAt && new Date(exception.expiresAt).getTime() < Date.now()) {
      add({
        code: Codes.expiredException,
        severity: ["approved", "implemented"].includes(spec.metadata.status) ? "error" : "warning",
        message: `Exception ${exception.id} expired at ${exception.expiresAt}`,
      });
    }
  }
  return out;
}
