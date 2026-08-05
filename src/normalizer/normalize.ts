import type { EngineeringSpec, SourceLocation } from "../model/types.js";
import { canonicalize } from "./canonicalize.js";

export interface NormalizeOptions { includeSourceLocations?:boolean; sourceLocations?:Map<string,SourceLocation> }
function stripLocations(value:unknown):unknown {
  if(Array.isArray(value)) return value.map(stripLocations);
  if(value&&typeof value==="object") return Object.fromEntries(Object.entries(value).filter(([key])=>key!=="location").map(([key,item])=>[key,stripLocations(item)]));
  return value;
}
export function normalize(spec:EngineeringSpec,options:NormalizeOptions={}):EngineeringSpec & {sourceLocations?:Record<string,SourceLocation>} {
  const clone=structuredClone(spec);
  for(const constraint of clone.constraints??[]) if(!constraint.severity) constraint.severity=constraint.level==="must"||constraint.level==="must_not"||constraint.level==="escalate"?"error":"warning";
  for(const verifier of clone.verification) if(verifier.runner?.type==="command"&&!verifier.runner.network) verifier.runner.network="deny";
  const value=options.includeSourceLocations?clone:stripLocations(clone);
  if(options.includeSourceLocations&&options.sourceLocations) (value as EngineeringSpec & {sourceLocations?:Record<string,SourceLocation>}).sourceLocations=Object.fromEntries(options.sourceLocations);
  return canonicalize(value) as EngineeringSpec & {sourceLocations?:Record<string,SourceLocation>};
}
