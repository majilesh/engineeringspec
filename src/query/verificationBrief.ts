import { readFile, stat } from "node:fs/promises";
import type { EngineeringSpec } from "../model/types.js";
import type { ReviewReport } from "../cli/review.js";
import { readGitBlob } from "../gate/loadSpec.js";
import { normalize } from "../normalizer/normalize.js";
import { closureSemanticDigest, digest } from "../normalizer/digest.js";
import { compareCodePoints } from "../normalizer/canonicalize.js";
import { validateMarkdown } from "../validator/validateFile.js";
import { readEvidenceFile, type VerificationEvidence } from "../evidence/receipt.js";

export type BriefEvaluationScope = "complete_working_state" | "committed_and_staged" | "committed_only" | "explicit_paths";
export interface BriefContractSource { path: string; spec: EngineeringSpec }
export interface VerificationBriefContract {
  id: string;
  title: string;
  status: string;
  path: string;
  specRevision: number;
  /** Full normalized digest used by existing implementation-evidence envelopes. */
  semanticDigest: string;
  targets: Array<{ id: string; paths: string[]; changePolicy: string }>;
  constraints: Array<{ id: string; level: string; statement: string; targetIds: string[]; verifierIds: string[] }>;
  verification: Array<VerificationEvidence & { kind: string; proves: string[]; source: "declaration" | "supplied" }>;
  excludedEvidenceCount: number;
}
export interface VerificationBrief {
  format: "engineering-spec-verification-brief";
  formatVersion: "0.1";
  authority: "read_only_projection";
  baseSha: string;
  headSha: string;
  changedDigest: string;
  evaluation: { scope: BriefEvaluationScope; completeWorkingState: boolean };
  authorized: boolean;
  enforcement: ReviewReport["enforcement"];
  classification: string;
  workingState: ReviewReport["workingState"];
  coverage: ReviewReport["coverage"];
  next: ReviewReport["next"];
  routes: ReviewReport["routes"];
  sequencing: ReviewReport["sequencing"];
  authorityDiffs: ReviewReport["authorityDiffs"];
  diagnostics: ReviewReport["diagnostics"];
  contracts: VerificationBriefContract[];
}

function selectedTargets(report: ReviewReport): Map<string, Set<string>> {
  const ids = new Map<string, Set<string>>();
  for (const route of report.routes) {
    if (!["selected", "standing"].includes(route.decision) || !route.selected) continue;
    const targetIds = ids.get(route.selected.specId) ?? new Set<string>();
    for (const id of route.selected.targetIds) targetIds.add(id);
    ids.set(route.selected.specId, targetIds);
  }
  return ids;
}

/** Pure projection. Local IDs are always nested under their contract identity. */
export function projectVerificationBrief(
  report: ReviewReport,
  sources: BriefContractSource[],
  scope: BriefEvaluationScope,
  evidence: ReadonlyMap<string, VerificationEvidence[]> = new Map(),
): VerificationBrief {
  const selected = selectedTargets(report);
  const contracts = sources.filter(({ spec }) => selected.has(spec.metadata.id)).map(({ spec: raw, path }) => {
    const spec = normalize(raw);
    const targetIds = selected.get(spec.metadata.id)!;
    const constraints = (spec.constraints ?? []).filter((item) => !item.appliesTo?.length || item.appliesTo.some((id) => targetIds.has(id)));
    const relevantIds = new Set(constraints.map((item) => item.id));
    const verifiers = spec.verification.filter((item) => item.proves.some((id) => relevantIds.has(id)));
    const supplied = new Map((evidence.get(spec.metadata.id) ?? []).map((item) => [item.verifierId, item]));
    const visibleIds = new Set(verifiers.map((item) => item.id));
    return {
      id: spec.metadata.id, title: spec.metadata.title, status: spec.metadata.status, path,
      specRevision: spec.metadata.specRevision, semanticDigest: digest(spec),
      targets: spec.targets.filter((item) => targetIds.has(item.id)).map((item) => ({ id: item.id, paths: [...item.paths].sort(compareCodePoints), changePolicy: item.changePolicy })).sort((a, b) => compareCodePoints(a.id, b.id)),
      constraints: constraints.map((item) => ({
        id: item.id, level: item.level, statement: item.statement,
        targetIds: [...(item.appliesTo?.length ? item.appliesTo.filter((id) => targetIds.has(id)) : targetIds)].sort(compareCodePoints),
        verifierIds: verifiers.filter((verifier) => verifier.proves.includes(item.id)).map((verifier) => verifier.id).sort(compareCodePoints),
      })).sort((a, b) => compareCodePoints(a.id, b.id)),
      verification: verifiers.map((item) => ({
        ...(supplied.get(item.id) ?? { verifierId: item.id, state: "declared" as const }),
        kind: item.kind, proves: [...item.proves].sort(compareCodePoints),
        source: supplied.has(item.id) ? "supplied" as const : "declaration" as const,
      })).sort((a, b) => compareCodePoints(a.verifierId, b.verifierId)),
      excludedEvidenceCount: [...supplied.keys()].filter((id) => !visibleIds.has(id)).length,
    };
  }).sort((a, b) => compareCodePoints(a.id, b.id));
  return {
    format: "engineering-spec-verification-brief", formatVersion: "0.1", authority: "read_only_projection",
    baseSha: report.baseSha, headSha: report.headSha, changedDigest: report.changedDigest,
    evaluation: { scope, completeWorkingState: scope === "complete_working_state" },
    authorized: report.valid, enforcement: report.enforcement, classification: report.classification,
    workingState: report.workingState, coverage: report.coverage, next: report.next,
    routes: report.routes, sequencing: report.sequencing, authorityDiffs: report.authorityDiffs,
    diagnostics: report.diagnostics, contracts,
  };
}

/** Load only immutable contract blobs referenced by the already-computed review. Never reroute. */
export async function buildVerificationBrief(report: ReviewReport, options: {
  scope: BriefEvaluationScope; evidenceFiles?: string[]; cwd?: string; strict?: boolean;
}): Promise<VerificationBrief> {
  const identities = new Map<string, NonNullable<ReviewReport["routes"][number]["selected"]>>();
  for (const route of report.routes) {
    if (!["selected", "standing"].includes(route.decision) || !route.selected) continue;
    const previous = identities.get(route.selected.specId);
    if (previous && (previous.specPath !== route.selected.specPath || previous.specRevision !== route.selected.specRevision || previous.semanticDigest !== route.selected.semanticDigest)) {
      throw new Error(`Inconsistent checked identity for ${route.selected.specId}`);
    }
    identities.set(route.selected.specId, route.selected);
  }
  const sources: BriefContractSource[] = [];
  for (const [id, identity] of [...identities].sort(([a], [b]) => compareCodePoints(a, b))) {
    const result = await validateMarkdown(await readGitBlob(report.baseSha, identity.specPath, options.cwd), `${report.baseSha}:${identity.specPath}`, { resolveProfiles: false });
    if (!result.spec || result.diagnostics.some((item) => item.severity === "error" || (options.strict && item.severity === "warning"))) {
      throw new Error(`Checked base contract ${id} failed validation`);
    }
    const spec = normalize(result.spec);
    if (spec.metadata.id !== id || spec.metadata.specRevision !== identity.specRevision || closureSemanticDigest(spec) !== identity.semanticDigest) {
      throw new Error(`Checked base contract ${id} has a mismatched identity`);
    }
    sources.push({ path: identity.specPath, spec });
  }
  const evidence = new Map<string, VerificationEvidence[]>();
  const files = options.evidenceFiles ?? [];
  if (files.length > sources.length) throw new Error("Evidence envelope count exceeds selected contract count; duplicate or unselected contract input");
  for (const file of files) {
    const metadata = await stat(file);
    if (!metadata.isFile() || metadata.size > 1024 * 1024) throw new Error("Evidence input must be a regular file of at most 1 MiB");
    const text = await readFile(file, "utf8");
    if (Buffer.byteLength(text, "utf8") > 1024 * 1024) throw new Error("Evidence input exceeds the 1 MiB limit");
    const envelope: unknown = JSON.parse(text);
    const id = envelope && typeof envelope === "object" && "authority" in envelope
      && envelope.authority && typeof envelope.authority === "object" && "contractId" in envelope.authority
      ? envelope.authority.contractId : undefined;
    const source = sources.find(({ spec }) => spec.metadata.id === id);
    if (!source) throw new Error("Evidence references an unselected contract or lacks an authority binding");
    const contractId = source.spec.metadata.id;
    if (evidence.has(contractId)) throw new Error(`Duplicate evidence envelope for ${contractId}`);
    const entries = await readEvidenceFile(file, new Set(source.spec.verification.map((item) => item.id)), {
      baseSha: report.baseSha, contractId, specRevision: source.spec.metadata.specRevision,
      semanticDigest: digest(source.spec), changeDigest: report.changedDigest,
    });
    if (new Set(entries.map((item) => item.verifierId)).size !== entries.length) throw new Error(`Duplicate verifier evidence for ${contractId}`);
    evidence.set(contractId, entries);
  }
  return projectVerificationBrief(report, sources, options.scope, evidence);
}
