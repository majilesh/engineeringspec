import type { EngineeringSpec } from "../model/types.js";
import { applicableTargets } from "./applicability.js";

export interface Inspection { metadata:EngineeringSpec["metadata"]; targets?:EngineeringSpec["targets"]; constraints?:EngineeringSpec["constraints"]; contracts?:EngineeringSpec["contracts"]; verification?:EngineeringSpec["verification"]; sourceRefs?:EngineeringSpec["sourceRefs"]; evidence?:EngineeringSpec["evidence"] }
export interface InspectQuery { summary?:boolean; target?:string; path?:string; constraint?:string; contract?:string; verifier?:string; sourceItem?:string }
export function inspect(spec:EngineeringSpec,query:InspectQuery={}):Inspection {
  const result:Inspection={metadata:spec.metadata};
  let ids=new Set<string>();
  if(query.path) { const targets=applicableTargets(spec,query.path); result.targets=targets; ids=new Set(targets.map(t=>t.id)); result.constraints=(spec.constraints??[]).filter(c=>!c.appliesTo?.length||c.appliesTo.some(id=>ids.has(id))); }
  else if(query.target) { result.targets=spec.targets.filter(t=>t.id===query.target); result.constraints=(spec.constraints??[]).filter(c=>c.appliesTo?.includes(query.target!)); }
  else if(query.constraint) result.constraints=(spec.constraints??[]).filter(c=>c.id===query.constraint);
  else if(query.contract) result.contracts=(spec.contracts??[]).filter(c=>c.id===query.contract);
  else if(query.verifier) result.verification=spec.verification.filter(v=>v.id===query.verifier);
  else if(query.sourceItem) { const item=query.sourceItem; result.sourceRefs=spec.sourceRefs.filter(s=>s.itemIds?.includes(item)); result.contracts=(spec.contracts??[]).filter(c=>c.satisfies?.includes(item)); result.constraints=(spec.constraints??[]).filter(c=>c.satisfies?.includes(item)); result.verification=spec.verification.filter(v=>v.proves.includes(item)||v.proves.some(id=>result.contracts?.some(c=>c.id===id)||result.constraints?.some(c=>c.id===id))); }
  else if(!query.summary) { result.targets=spec.targets; result.constraints=spec.constraints; result.contracts=spec.contracts; result.verification=spec.verification; }
  if(result.constraints&&!result.verification) { const constraintIds=new Set(result.constraints.map(c=>c.id)); result.verification=spec.verification.filter(v=>v.proves.some(id=>constraintIds.has(id))); }
  if(result.constraints&&!result.contracts) { const refs=new Set(result.constraints.flatMap(c=>c.enforcement?.kind==="contract"?[c.enforcement.contractRef]:[])); result.contracts=(spec.contracts??[]).filter(c=>refs.has(c.id)); }
  return result;
}
