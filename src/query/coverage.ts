import type { ConstraintEnforcement, EngineeringSpec } from "../model/types.js";

export type CoverageLevel = "complete" | "partial" | "unknown" | "not_applicable";
export interface CoverageItem { id: string; covered: boolean; by: string[] }
export interface CoverageReport {
  status: CoverageLevel;
  sourceItems: CoverageItem[];
  constraints: CoverageItem[];
  contracts: CoverageItem[];
  evidence: CoverageItem[];
  dangling: string[];
  unknownExternal: boolean;
}

/** Declared-link coverage only — does not mean verifiers ran successfully. */
function enforcementLinks(enforcement: ConstraintEnforcement | undefined): string[] {
  if (!enforcement || enforcement.kind === "none") return [];
  if (enforcement.kind === "contract") return [enforcement.contractRef];
  if (enforcement.kind === "test") return [enforcement.verifierRef];
  if (enforcement.kind === "policy") return [enforcement.adapter, enforcement.ruleRef];
  if (enforcement.kind === "review") return [enforcement.reviewerRole];
  return [];
}

export function coverage(spec: EngineeringSpec, options: { unknownExternal?: boolean } = {}): CoverageReport {
  const byProof = (id: string) => spec.verification.filter((v) => v.proves.includes(id)).map((v) => v.id);
  const sourceItems = [...new Set(spec.sourceRefs.flatMap((s) => s.itemIds ?? []))].map((id) => {
    const direct = byProof(id);
    const intermediates = [
      ...(spec.contracts ?? []).filter((c) => c.satisfies?.includes(id)),
      ...(spec.constraints ?? []).filter((c) => c.satisfies?.includes(id)),
    ];
    return {
      id,
      covered: direct.length > 0 || intermediates.some((i) => byProof(i.id).length > 0),
      by: [...direct, ...intermediates.flatMap((i) => byProof(i.id))],
    };
  });
  const constraints = (spec.constraints ?? []).map((c) => {
    const by = byProof(c.id);
    const enforced = enforcementLinks(c.enforcement);
    const links = [...new Set([...by, ...enforced])];
    return { id: c.id, covered: links.length > 0, by: links };
  });
  const contracts = (spec.contracts ?? []).map((c) => {
    const by = byProof(c.id);
    return { id: c.id, covered: by.length > 0, by };
  });
  const evidence = (spec.evidence ?? []).map((e) => ({
    id: e.id,
    covered: Boolean(e.verifierRef && spec.verification.some((v) => v.id === e.verifierRef)),
    by: e.verifierRef ? [e.verifierRef] : [],
  }));
  const known = new Set([
    spec.metadata.id,
    ...spec.sourceRefs.flatMap((s) => [s.id, ...(s.itemIds ?? [])]),
    ...spec.targets.map((x) => x.id),
    ...(spec.decisions ?? []).map((x) => x.id),
    ...(spec.contracts ?? []).map((x) => x.id),
    ...(spec.constraints ?? []).map((x) => x.id),
    ...spec.verification.map((x) => x.id),
    ...(spec.evidence ?? []).map((x) => x.id),
    ...(spec.exceptions ?? []).map((x) => x.id),
  ]);
  const refs = [
    ...spec.verification.flatMap((v) => v.proves),
    ...(spec.constraints ?? []).flatMap((c) => [...(c.appliesTo ?? []), ...(c.satisfies ?? [])]),
  ];
  const dangling = refs.filter((id) => !known.has(id));
  const requiredConstraints = constraints.filter((c) => {
    const level = (spec.constraints ?? []).find((x) => x.id === c.id)?.level;
    return level !== "should" && level !== "should_not";
  });
  const all = [...sourceItems, ...requiredConstraints, ...contracts, ...evidence];
  const unknownExternal = Boolean(options.unknownExternal);
  const status: CoverageLevel = unknownExternal
    ? "unknown"
    : all.length === 0
      ? "not_applicable"
      : all.every((i) => i.covered) && dangling.length === 0
        ? "complete"
        : "partial";
  return { status, sourceItems, constraints, contracts, evidence, dangling, unknownExternal };
}
