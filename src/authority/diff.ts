import type { EngineeringSpec, Status, TargetSurface } from "../model/types.js";
import { compareCodePoints } from "../normalizer/canonicalize.js";
import { closureSemanticDigest, digest, isSafeImplementedClosure } from "../normalizer/digest.js";

export interface AuthorityItemChange {
  id: string;
  change: "added" | "removed" | "modified";
  beforeDigest?: string;
  afterDigest?: string;
}

export interface AuthorityDiff {
  format: "engineering-spec-authority-diff";
  formatVersion: "0.1";
  contractId: string;
  base: { contractId: string; revision: number; semanticDigest: string };
  head: { contractId: string; revision: number; semanticDigest: string };
  lifecycle: { from: Status; to: Status };
  pathAuthority: {
    writableAdded: string[];
    writableRemoved: string[];
    createAdded: string[];
    createRemoved: string[];
    protectedAdded: string[];
    protectedRemoved: string[];
  };
  targets: AuthorityItemChange[];
  constraints: AuthorityItemChange[];
  verifiers: AuthorityItemChange[];
  contracts: AuthorityItemChange[];
  sources: AuthorityItemChange[];
  sequencing: { changed:boolean; beforeDigest?:string; afterDigest?:string };
  otherSemanticChange: boolean;
  authorityChanged: boolean;
  safeMonotonicClose: boolean;
}

function pathSets(targets: TargetSurface[]): { writable: Set<string>; create: Set<string>; protected: Set<string> } {
  const writable = new Set<string>();
  const create = new Set<string>();
  const protectedPaths = new Set<string>();
  for (const target of targets) {
    const destination = target.changePolicy === "create" ? create
      : target.changePolicy === "read_only" || target.changePolicy === "observe" ? protectedPaths
        : writable;
    for (const item of target.paths) destination.add(`${target.id}:${target.changePolicy}:${item}`);
  }
  return { writable, create, protected: protectedPaths };
}

function added(left: Set<string>, right: Set<string>): string[] {
  return [...right].filter((item) => !left.has(item)).sort(compareCodePoints);
}

function keyed(items: Array<{ id: string }>): Map<string, { id: string }> {
  return new Map(items.map((item) => [item.id, item]));
}

function changes(beforeItems: Array<{ id: string }>, afterItems: Array<{ id: string }>): AuthorityItemChange[] {
  const before = keyed(beforeItems);
  const after = keyed(afterItems);
  const ids = [...new Set([...before.keys(), ...after.keys()])].sort(compareCodePoints);
  const result: AuthorityItemChange[] = [];
  for (const id of ids) {
    const left = before.get(id);
    const right = after.get(id);
    if (!left && right) { result.push({ id, change: "added", afterDigest: digest(right) }); continue; }
    if (left && !right) { result.push({ id, change: "removed", beforeDigest: digest(left) }); continue; }
    const beforeDigest = digest(left);
    const afterDigest = digest(right);
    if (beforeDigest !== afterDigest) result.push({ id, change: "modified", beforeDigest, afterDigest });
  }
  return result;
}

function remainder(spec: EngineeringSpec): unknown {
  return {
    metadata: { ...spec.metadata, status: undefined, updatedAt: undefined },
    decisions: spec.decisions ?? [],
    rollout: spec.rollout,
    evidence: spec.evidence ?? [],
    exceptions: spec.exceptions ?? [],
    prose: spec.prose,
    extensions: spec.extensions,
  };
}

export function buildAuthorityDiff(before: EngineeringSpec, after: EngineeringSpec): AuthorityDiff {
  const targets = changes(before.targets, after.targets);
  const constraints = changes(before.constraints ?? [], after.constraints ?? []);
  const verifiers = changes(before.verification, after.verification);
  const contracts = changes(before.contracts ?? [], after.contracts ?? []);
  const sources = changes(before.sourceRefs, after.sourceRefs);
  const beforeSequencing=before.authorityControls?digest(before.authorityControls):undefined;
  const afterSequencing=after.authorityControls?digest(after.authorityControls):undefined;
  const sequencing={changed:beforeSequencing!==afterSequencing,...(beforeSequencing?{beforeDigest:beforeSequencing}:{}),...(afterSequencing?{afterDigest:afterSequencing}:{})};
  const otherSemanticChange = digest(remainder(before)) !== digest(remainder(after));
  const beforePaths = pathSets(before.targets);
  const afterPaths = pathSets(after.targets);
  const authorityChanged = targets.length + constraints.length + verifiers.length + contracts.length + sources.length > 0 || sequencing.changed || otherSemanticChange;
  return {
    format: "engineering-spec-authority-diff",
    formatVersion: "0.1",
    contractId: after.metadata.id,
    base: { contractId: before.metadata.id, revision: before.metadata.specRevision, semanticDigest: closureSemanticDigest(before) },
    head: { contractId: after.metadata.id, revision: after.metadata.specRevision, semanticDigest: closureSemanticDigest(after) },
    lifecycle: { from: before.metadata.status, to: after.metadata.status },
    pathAuthority: {
      writableAdded: added(beforePaths.writable, afterPaths.writable),
      writableRemoved: added(afterPaths.writable, beforePaths.writable),
      createAdded: added(beforePaths.create, afterPaths.create),
      createRemoved: added(afterPaths.create, beforePaths.create),
      protectedAdded: added(beforePaths.protected, afterPaths.protected),
      protectedRemoved: added(afterPaths.protected, beforePaths.protected),
    },
    targets,
    constraints,
    verifiers,
    contracts,
    sources,
    sequencing,
    otherSemanticChange,
    authorityChanged,
    safeMonotonicClose: isSafeImplementedClosure(before, after),
  };
}

export function authorityDiffText(report: AuthorityDiff): string {
  const sections: Array<[string, string[]]> = [
    ["writable added", report.pathAuthority.writableAdded],
    ["writable removed", report.pathAuthority.writableRemoved],
    ["create added", report.pathAuthority.createAdded],
    ["create removed", report.pathAuthority.createRemoved],
    ["protected added", report.pathAuthority.protectedAdded],
    ["protected removed", report.pathAuthority.protectedRemoved],
  ];
  return [
    `authority diff: ${report.authorityChanged ? "CHANGED" : "NO AUTHORITY CHANGE"}`,
    `contract: ${report.contractId}`,
    `base semantic digest: ${report.base.semanticDigest}`,
    `head semantic digest: ${report.head.semanticDigest}`,
    `lifecycle: ${report.lifecycle.from} -> ${report.lifecycle.to}`,
    ...sections.flatMap(([label, values]) => values.map((value) => `${label}: ${value}`)),
    ...(["targets", "constraints", "verifiers", "contracts", "sources"] as const).flatMap((key) => report[key].map((item) => `${key}: ${item.id} ${item.change}`)),
    `sequencing changed: ${report.sequencing.changed}`,
    `other semantic change: ${report.otherSemanticChange}`,
    `safe monotonic close: ${report.safeMonotonicClose}`,
  ].join("\n");
}

export function authorityDiffMarkdown(report: AuthorityDiff): string {
  return [
    "### EngineeringSpec authority diff",
    "",
    report.authorityChanged ? "⚠️ **AUTHORITY CHANGED**" : "✅ **NO AUTHORITY CHANGE**",
    "",
    `- Contract: \`${report.contractId}\``,
    `- Lifecycle: \`${report.lifecycle.from}\` → \`${report.lifecycle.to}\``,
    `- Safe monotonic close: **${report.safeMonotonicClose ? "yes" : "no"}**`,
    "",
  ].join("\n");
}
