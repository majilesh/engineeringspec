import type {
  EngineeringConstraint,
  EngineeringSpec,
  SourceReference,
  TargetSurface,
  TechnicalContract,
  VerificationObligation,
} from "../model/types.js";
import { compareCodePoints } from "../normalizer/canonicalize.js";

const WRITABLE_POLICIES = new Set<TargetSurface["changePolicy"]>(["modify", "create", "delete", "interface_only"]);

export function briefDisplaySafe(value: string): string {
  const withoutControls = [...value].map((character) => {
    const codePoint = character.codePointAt(0)!;
    const unsafe = codePoint <= 0x1f
      || (codePoint >= 0x7f && codePoint <= 0x9f)
      || codePoint === 0x200e
      || codePoint === 0x200f
      || (codePoint >= 0x202a && codePoint <= 0x202e)
      || (codePoint >= 0x2066 && codePoint <= 0x2069);
    return unsafe ? " " : character;
  }).join("");
  return withoutControls.replace(/\s+/gu, " ").trim();
}

function sanitizeBriefValue<T>(value: T): T {
  if (typeof value === "string") return briefDisplaySafe(value) as T;
  if (Array.isArray(value)) return value.map((item) => sanitizeBriefValue(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeBriefValue(item)])) as T;
  }
  return value;
}

export interface ChangeBriefAuthority {
  baseRef: string;
  baseSha: string;
  specPath: string;
  specDigest: string;
}

export interface BriefSurface {
  id: string;
  component?: string;
  paths: string[];
  changePolicy: TargetSurface["changePolicy"];
  notes?: string;
  enforcementNote?: string;
}

export interface BriefConstraint {
  id: string;
  level: EngineeringConstraint["level"];
  severity?: EngineeringConstraint["severity"];
  statement: string;
  appliesTo: string[];
  verifierRef?: string;
  reviewerRole?: string;
}

export interface BriefVerification {
  id: string;
  kind: VerificationObligation["kind"];
  proves: string[];
  runnerType?: NonNullable<VerificationObligation["runner"]>["type"];
  runnerInert: true;
}

export interface BriefSourceIntent {
  id: string;
  type: SourceReference["type"];
  locator: string;
  title?: string;
  revision?: string | number;
  digest?: string;
}

export interface BriefTechnicalContract {
  id: string;
  kind: TechnicalContract["kind"];
  locator?: string;
  compatibility?: TechnicalContract["compatibility"];
}

export interface ChangeBrief {
  result: "ready" | "blocked";
  permission: "implementation" | "none";
  reason?: string;
  action?: string;
  authority: {
    kind: "base_pinned";
    baseRef: string;
    baseSha: string;
    specPath: string;
    specDigest: string;
  };
  contract: {
    id: string;
    title: string;
    status: EngineeringSpec["metadata"]["status"];
    specRevision: number;
    repository?: string;
    declaredBaseRevision?: string;
  };
  access: {
    reading: "repository_reading_allowed_for_correctness";
    writing: "only_declared_writable_surfaces" | "not_authorized";
    outsideDeclaredTargets: "not_writable";
    finalPathAuthorization: "subject_to_multi_contract_routing";
  };
  writableSurfaces: BriefSurface[];
  protectedSurfaces: BriefSurface[];
  constraints: BriefConstraint[];
  technicalContracts: BriefTechnicalContract[];
  verification: BriefVerification[];
  sourceIntent: BriefSourceIntent[];
  unresolvedQuestions: Array<{ id: string; question: string }>;
}

function surface(target: TargetSurface): BriefSurface {
  return {
    id: target.id,
    ...(target.component ? { component: target.component } : {}),
    paths: [...target.paths].sort(compareCodePoints),
    changePolicy: target.changePolicy,
    ...(target.notes ? { notes: target.notes } : {}),
    ...(target.changePolicy === "interface_only" ? {
      enforcementNote: "interface_only grants path-level write access only; this brief does not verify interface semantics. Use separately trusted API or schema verification.",
    } : {}),
  };
}

function sourceLocator(source: SourceReference): string {
  return source.path ?? source.ref ?? source.uri ?? "unavailable";
}

function sourceDigest(source: SourceReference): string | undefined {
  if (typeof source.digest === "string") return source.digest;
  if (source.digest?.value) return `${source.digest.algorithm ?? "sha256"}:${source.digest.value}`;
  return undefined;
}

function constraint(item: EngineeringConstraint): BriefConstraint {
  const enforcement = item.enforcement;
  return {
    id: item.id,
    level: item.level,
    ...(item.severity ? { severity: item.severity } : {}),
    statement: item.statement,
    appliesTo: [...(item.appliesTo ?? [])].sort(compareCodePoints),
    ...(enforcement?.kind === "test" ? { verifierRef: enforcement.verifierRef } : {}),
    ...(enforcement?.kind === "review" ? { reviewerRole: enforcement.reviewerRole } : {}),
  };
}

export function buildChangeBrief(spec: EngineeringSpec, authority: ChangeBriefAuthority): ChangeBrief {
  const approved = spec.metadata.status === "approved";
  const targets = [...spec.targets].sort((left, right) => compareCodePoints(left.id, right.id));
  const constraints = [...(spec.constraints ?? [])]
    .sort((left, right) => compareCodePoints(left.id, right.id));
  const technicalContracts = [...(spec.contracts ?? [])]
    .sort((left, right) => compareCodePoints(left.id, right.id));
  const verification = [...spec.verification]
    .sort((left, right) => compareCodePoints(left.id, right.id));
  const sourceIntent = [...spec.sourceRefs]
    .sort((left, right) => compareCodePoints(left.id, right.id));

  const report: ChangeBrief = {
    result: approved ? "ready" : "blocked",
    permission: approved ? "implementation" : "none",
    ...(!approved ? {
      reason: `Contract ${spec.metadata.id} has lifecycle status ${spec.metadata.status}; only an approved base contract grants implementation authority.`,
      action: "Review and merge an approval-only contract change, then rerun prepare against the updated base.",
    } : {}),
    authority: {
      kind: "base_pinned",
      baseRef: authority.baseRef,
      baseSha: authority.baseSha,
      specPath: authority.specPath,
      specDigest: authority.specDigest,
    },
    contract: {
      id: spec.metadata.id,
      title: spec.metadata.title,
      status: spec.metadata.status,
      specRevision: spec.metadata.specRevision,
      ...(spec.metadata.repository?.ref ? { repository: spec.metadata.repository.ref } : {}),
      ...(spec.metadata.baseRevision ? { declaredBaseRevision: spec.metadata.baseRevision } : {}),
    },
    access: {
      reading: "repository_reading_allowed_for_correctness",
      writing: approved ? "only_declared_writable_surfaces" : "not_authorized",
      outsideDeclaredTargets: "not_writable",
      finalPathAuthorization: "subject_to_multi_contract_routing",
    },
    writableSurfaces: approved
      ? targets.filter((target) => WRITABLE_POLICIES.has(target.changePolicy)).map(surface)
      : [],
    protectedSurfaces: targets.filter((target) => !WRITABLE_POLICIES.has(target.changePolicy)).map(surface),
    constraints: constraints.map(constraint),
    technicalContracts: technicalContracts.map((item) => ({
      id: item.id,
      kind: item.kind,
      ...(item.path || item.uri ? { locator: item.path ?? item.uri } : {}),
      ...(item.compatibility ? { compatibility: item.compatibility } : {}),
    })),
    verification: verification.map((item) => ({
      id: item.id,
      kind: item.kind,
      proves: [...item.proves].sort(compareCodePoints),
      ...(item.runner ? { runnerType: item.runner.type } : {}),
      runnerInert: true,
    })),
    sourceIntent: sourceIntent.map((item) => {
      const itemDigest = sourceDigest(item);
      return {
        id: item.id,
        type: item.type,
        locator: sourceLocator(item),
        ...(item.title ? { title: item.title } : {}),
        ...(item.revision !== undefined ? { revision: item.revision } : {}),
        ...(itemDigest ? { digest: itemDigest } : {}),
      };
    }),
    unresolvedQuestions: constraints
      .filter((item) => item.level === "escalate")
      .map((item) => ({ id: item.id, question: item.statement })),
  };
  return sanitizeBriefValue(report);
}
