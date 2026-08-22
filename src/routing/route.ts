import { createHash } from "node:crypto";
import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import { Codes } from "../diagnostics/codes.js";
import { isEngineeringSpecFilename } from "../discovery/discover.js";
import type { ChangedFile, ChangeKind } from "../gate/types.js";
import type { EngineeringSpec, Status, TargetSurface } from "../model/types.js";
import { compareCodePoints } from "../normalizer/canonicalize.js";
import { applicableTargets } from "../query/applicability.js";
import { closureSemanticDigest } from "../normalizer/digest.js";
import type { LoadedRoutingCandidate, PathRoute, RoutingCandidateSummary, RoutingClaim, SequencingAuditRecord } from "./types.js";

const WRITABLE = new Set(["modify", "create", "delete", "interface_only"]);
const FORBIDDEN = new Set(["read_only", "observe"]);

function policyAllows(kind: ChangeKind, policy: TargetSurface["changePolicy"]): boolean {
  if (!WRITABLE.has(policy) || FORBIDDEN.has(policy)) return false;
  if (kind === "added") return policy === "create" || policy === "modify" || policy === "interface_only";
  if (kind === "deleted") return policy === "delete" || policy === "modify";
  return policy === "modify" || policy === "interface_only";
}

function evaluatePath(spec: EngineeringSpec, file: string, kind: ChangeKind): {
  allowedTargetIds: string[];
  deniedTargetIds: string[];
  warnings: Diagnostic[];
} {
  const targets = applicableTargets(spec, file);
  const denied = targets.filter((target) => FORBIDDEN.has(target.changePolicy));
  const allowing = targets.filter((target) => policyAllows(kind, target.changePolicy));
  const policyDenied = targets.length > 0 && allowing.length === 0 ? targets : [];
  return {
    allowedTargetIds: allowing.map((target) => target.id),
    deniedTargetIds: [...new Set([...denied, ...policyDenied].map((target) => target.id))],
    warnings: allowing.some((target) => target.changePolicy === "interface_only") ? [{
      code: Codes.gateInterfaceOnly,
      severity: "info",
      file,
      message: `${file}: interface_only is path-scoped only; contents are not checked for interface-surface changes`,
    }] : [],
  };
}

export function digestRoutedChanges(changed: ChangedFile[]): string {
  const payload = `${[...changed]
    .map((item) => `${item.kind}\t${item.fromPath ?? ""}\t${item.path}`)
    .sort(compareCodePoints)
    .join("\n")}\n`;
  return `sha256:${createHash("sha256").update(payload, "utf8").digest("hex")}`;
}

function expandedChanges(changed: ChangedFile[]): Array<{ path: string; kind: ChangeKind }> {
  return changed.flatMap((change) => change.kind === "renamed" && change.fromPath
    ? [{ path: change.fromPath, kind: "deleted" as const }, { path: change.path, kind: "added" as const }]
    : [{ path: change.path, kind: change.kind }]);
}

function claim(candidate: LoadedRoutingCandidate, targetIds: string[]): RoutingClaim {
  return {
    specId: candidate.spec.metadata.id,
    specPath: candidate.path,
    targetIds: [...targetIds].sort(compareCodePoints),
    specRevision:candidate.spec.metadata.specRevision,
    semanticDigest:closureSemanticDigest(candidate.spec),
  };
}

export function routeChanges(
  candidates: LoadedRoutingCandidate[],
  changed: ChangedFile[],
  requiredStatuses: Status[] = ["approved"],
  options: { baseSha?:string } = {},
): { candidates: RoutingCandidateSummary[]; routes: PathRoute[]; diagnostics: Diagnostic[]; changedDigest: string; sequencing:SequencingAuditRecord[] } {
  const required = new Set(requiredStatuses);
  const ordered = [...candidates].sort((left, right) => compareCodePoints(left.path, right.path));
  const summaries = ordered.map((candidate) => ({
    path: candidate.path,
    digest: candidate.digest,
    specId: candidate.spec.metadata.id,
    status: candidate.spec.metadata.status,
    eligible: required.has(candidate.spec.metadata.status),
    specRevision:candidate.spec.metadata.specRevision,
    semanticDigest:closureSemanticDigest(candidate.spec),
  }));
  const eligible = ordered.filter((candidate) => required.has(candidate.spec.metadata.status));
  const diagnostics: Diagnostic[] = [];
  const routes: PathRoute[] = [];
  const sequencing:SequencingAuditRecord[]=[];
  const hasSpecificationChanges = changed.some((change) => isEngineeringSpecFilename(change.path));
  const hasNonSpecificationChanges = changed.some((change) => !isEngineeringSpecFilename(change.path));
  const hasMixedChanges = hasSpecificationChanges && hasNonSpecificationChanges;

  if (hasMixedChanges) {
    diagnostics.push({
      code: Codes.routingUncovered,
      severity: "info",
      message: "Contract-only handling is unavailable because this change also contains non-contract paths.",
      hint: "Split specification lifecycle or scope changes into a contract-only PR, merge it, then update the implementation branch from the trusted base.",
    });
  }

  if (eligible.length === 0) {
    if (changed.length === 0) {
      return { candidates: summaries, routes, diagnostics, changedDigest: digestRoutedChanges(changed), sequencing };
    }
    diagnostics.push({
      code: Codes.routingNoEligible,
      severity: "error",
      message: `No eligible EngineeringSpecs have status in [${requiredStatuses.join(", ")}]`,
      hint: "Approve the applicable contract before enforcing directory routing.",
    });
    return { candidates: summaries, routes, diagnostics, changedDigest: digestRoutedChanges(changed), sequencing };
  }

  const byId = new Map<string, LoadedRoutingCandidate[]>();
  for (const candidate of eligible) byId.set(candidate.spec.metadata.id, [...(byId.get(candidate.spec.metadata.id) ?? []), candidate]);
  for (const [id, duplicates] of [...byId].sort(([left], [right]) => compareCodePoints(left, right))) {
    if (duplicates.length > 1) diagnostics.push({
      code: Codes.routingDuplicateId,
      severity: "error",
      message: `Eligible EngineeringSpec id ${JSON.stringify(id)} is duplicated by ${duplicates.map((item) => item.path).join(", ")}`,
    });
  }
  if (diagnostics.some((item) => item.severity === "error")) return { candidates: summaries, routes, diagnostics, changedDigest: digestRoutedChanges(changed), sequencing };

  type ValidControl={controller:LoadedRoutingCandidate;referenced:LoadedRoutingCandidate;path:string};
  const validControls:ValidControl[]=[];
  const allById=new Map<string,LoadedRoutingCandidate[]>();
  for(const candidate of ordered) allById.set(candidate.spec.metadata.id,[...(allById.get(candidate.spec.metadata.id)??[]),candidate]);
  const rejected=(controller:LoadedRoutingCandidate,suspension:NonNullable<EngineeringSpec["authorityControls"]>["suspensions"][number],controlledPath:string,reason:string,referenced?:LoadedRoutingCandidate)=>{
    sequencing.push({
      ...(options.baseSha?{trustedBaseSha:options.baseSha}:{}),
      controller:{specId:controller.spec.metadata.id,specPath:controller.path,specRevision:controller.spec.metadata.specRevision,semanticDigest:closureSemanticDigest(controller.spec)},
      referenced:{specId:suspension.contractId,...(referenced?{specPath:referenced.path}:{}),specRevision:suspension.specRevision,semanticDigest:suspension.semanticDigest},
      path:controlledPath,applied:false,reason,remainingPositiveClaims:[],denyClaims:[],
    });
    diagnostics.push({code:Codes.routingInvalidSequencing,severity:"error",file:controller.path,message:reason,hint:"Merge a corrected authority-control contract independently before attempting implementation."});
  };
  for(const controller of ordered.filter(item=>item.spec.metadata.status==="approved"&&item.spec.authorityControls)){
    for(const suspension of controller.spec.authorityControls!.suspensions){
      const referencedMatches=allById.get(suspension.contractId)??[];
      for(const controlledPath of suspension.paths){
        if(referencedMatches.length!==1){rejected(controller,suspension,controlledPath,`Maintenance sequencing from ${controller.spec.metadata.id} requires exactly one trusted-base contract ${suspension.contractId}; found ${referencedMatches.length}`);continue;}
        const referenced=referencedMatches[0]!;
        if(referenced.spec.metadata.status!=="approved"){rejected(controller,suspension,controlledPath,`Maintenance sequencing reference ${suspension.contractId} is ${referenced.spec.metadata.status}, not approved`,referenced);continue;}
        if(referenced.spec.metadata.specRevision!==suspension.specRevision){rejected(controller,suspension,controlledPath,`Maintenance sequencing reference ${suspension.contractId} has stale revision ${suspension.specRevision}; trusted base has ${referenced.spec.metadata.specRevision}`,referenced);continue;}
        const referencedDigest=closureSemanticDigest(referenced.spec);
        if(referencedDigest!==suspension.semanticDigest){rejected(controller,suspension,controlledPath,`Maintenance sequencing reference ${suspension.contractId} has stale semantic digest`,referenced);continue;}
        if(referenced.spec.authorityControls){rejected(controller,suspension,controlledPath,`Maintenance sequencing cannot chain through controller ${suspension.contractId}`,referenced);continue;}
        const controllerPositive=applicableTargets(controller.spec,controlledPath).some(target=>WRITABLE.has(target.changePolicy));
        const referencedPositive=applicableTargets(referenced.spec,controlledPath).some(target=>WRITABLE.has(target.changePolicy));
        if(!controllerPositive||!referencedPositive){rejected(controller,suspension,controlledPath,`Maintenance sequencing path ${controlledPath} must be positively writable by both ${controller.spec.metadata.id} and ${referenced.spec.metadata.id}`,referenced);continue;}
        validControls.push({controller,referenced,path:controlledPath});
      }
    }
  }
  const controllersByPath=new Map<string,Set<string>>();
  for(const control of validControls) controllersByPath.set(control.path,new Set([...(controllersByPath.get(control.path)??[]),control.controller.spec.metadata.id]));
  const competingPaths=new Set([...controllersByPath].filter(([,ids])=>ids.size>1).map(([controlledPath])=>controlledPath));
  for(const controlledPath of competingPaths){
    const reason=`Competing trusted maintenance controllers target ${controlledPath}: ${[...controllersByPath.get(controlledPath)!].sort(compareCodePoints).join(", ")}`;
    diagnostics.push({code:Codes.routingInvalidSequencing,severity:"error",file:controlledPath,message:reason});
    for(const control of validControls.filter(item=>item.path===controlledPath)) sequencing.push({
      ...(options.baseSha?{trustedBaseSha:options.baseSha}:{}),controller:{specId:control.controller.spec.metadata.id,specPath:control.controller.path,specRevision:control.controller.spec.metadata.specRevision,semanticDigest:closureSemanticDigest(control.controller.spec)},
      referenced:{specId:control.referenced.spec.metadata.id,specPath:control.referenced.path,specRevision:control.referenced.spec.metadata.specRevision,semanticDigest:closureSemanticDigest(control.referenced.spec)},
      path:controlledPath,applied:false,reason,remainingPositiveClaims:[],denyClaims:[],
    });
  }

  const entries = expandedChanges(changed).sort((left, right) => compareCodePoints(left.path, right.path) || compareCodePoints(left.kind, right.kind));
  for (const entry of entries) {
    const allows: RoutingClaim[] = [];
    const denies: RoutingClaim[] = [];
    const warnings: Diagnostic[] = [];
    for (const candidate of eligible) {
      const result = evaluatePath(candidate.spec, entry.path, entry.kind);
      if (result.allowedTargetIds.length > 0) allows.push(claim(candidate, result.allowedTargetIds));
      if (result.deniedTargetIds.length > 0) denies.push(claim(candidate, result.deniedTargetIds));
      warnings.push(...result.warnings);
    }
    const sortedAllows = allows.sort((left, right) => compareCodePoints(left.specId, right.specId) || compareCodePoints(left.specPath, right.specPath));
    const sortedDenies = denies.sort((left, right) => compareCodePoints(left.specId, right.specId) || compareCodePoints(left.specPath, right.specPath));
    let effectiveAllows=[...sortedAllows];
    const pathAudits:SequencingAuditRecord[]=[];
    for(const control of validControls.filter(item=>item.path===entry.path&&!competingPaths.has(item.path))){
      const controllerClaim=sortedAllows.find(item=>item.specId===control.controller.spec.metadata.id&&item.specPath===control.controller.path);
      const referencedClaim=sortedAllows.find(item=>item.specId===control.referenced.spec.metadata.id&&item.specPath===control.referenced.path);
      const applied=Boolean(controllerClaim&&referencedClaim);
      if(applied) effectiveAllows=effectiveAllows.filter(item=>!(item.specId===control.referenced.spec.metadata.id&&item.specPath===control.referenced.path));
      const reason=applied
        ? `Subtracted the pinned positive claim from ${control.referenced.spec.metadata.id}`
        : `Sequencing did not apply because controller and referenced contract do not both positively authorize ${entry.path} (${entry.kind})`;
      if(!applied) diagnostics.push({code:Codes.routingInvalidSequencing,severity:"error",file:entry.path,message:reason});
      pathAudits.push({
        ...(options.baseSha?{trustedBaseSha:options.baseSha}:{}),
        controller:{specId:control.controller.spec.metadata.id,specPath:control.controller.path,specRevision:control.controller.spec.metadata.specRevision,semanticDigest:closureSemanticDigest(control.controller.spec)},
        referenced:{specId:control.referenced.spec.metadata.id,specPath:control.referenced.path,specRevision:control.referenced.spec.metadata.specRevision,semanticDigest:closureSemanticDigest(control.referenced.spec)},
        path:entry.path,applied,reason,remainingPositiveClaims:[],denyClaims:sortedDenies,
      });
    }
    effectiveAllows=effectiveAllows.sort((left,right)=>compareCodePoints(left.specId,right.specId)||compareCodePoints(left.specPath,right.specPath));
    for(const audit of pathAudits) audit.remainingPositiveClaims=[...effectiveAllows];
    sequencing.push(...pathAudits);
    if (sortedDenies.length > 0) {
      routes.push({ path: entry.path, kind: entry.kind, decision: "denied", allows: effectiveAllows, denies: sortedDenies, claims: [...sortedDenies, ...effectiveAllows],...(pathAudits.length?{sequencing:pathAudits}:{}) });
      diagnostics.push({ code: Codes.routingDenied, severity: "error", file: entry.path, message: `${entry.path} (${entry.kind}) is denied by ${sortedDenies.map((item) => item.specId).join(", ")}; deny overrides allow` });
    } else if (effectiveAllows.length === 0) {
      routes.push({ path: entry.path, kind: entry.kind, decision: "uncovered", allows: [], denies: [], claims: [] });
      const hint = isEngineeringSpecFilename(entry.path) && hasMixedChanges
        ? "Split specification lifecycle or scope changes into a contract-only PR, merge it, then update the implementation branch from the trusted base."
        : "Merge a contract-only target amendment before implementing this path.";
      diagnostics.push({ code: Codes.routingUncovered, severity: "error", file: entry.path, message: `${entry.path} (${entry.kind}) is not claimed by any eligible EngineeringSpec`, hint });
    } else if (effectiveAllows.length > 1) {
      routes.push({ path: entry.path, kind: entry.kind, decision: "ambiguous", allows: effectiveAllows, denies: [], claims: effectiveAllows,...(pathAudits.length?{sequencing:pathAudits}:{}) });
      diagnostics.push({ code: Codes.routingAmbiguous, severity: "error", file: entry.path, message: `${entry.path} (${entry.kind}) is allowed by multiple EngineeringSpecs: ${effectiveAllows.map((item) => `${item.specId}@r${item.specRevision} (${item.specPath}, ${item.semanticDigest})`).join(", ")}`,hint:`Automatic selection is unsafe. Narrow the implementation paths, revise authority in a contract-only change, or merge independently approved exact maintenance sequencing for ${entry.path}.` });
    } else {
      routes.push({ path: entry.path, kind: entry.kind, decision: "selected", selected: effectiveAllows[0]!, allows: effectiveAllows, denies: [], claims: effectiveAllows,...(pathAudits.length?{sequencing:pathAudits}:{}) });
      diagnostics.push(...warnings);
    }
  }
  return { candidates: summaries, routes, diagnostics, changedDigest: digestRoutedChanges(changed), sequencing };
}
