import path from "node:path";
import type { Diagnostic } from "../../diagnostics/Diagnostic.js";
import { Codes } from "../../diagnostics/codes.js";
import type { EngineeringSpec } from "../../model/types.js";
import { resolveProductSpec } from "./resolve.js";

export interface ProfileOptions { strictExternal?:boolean; resolveProfiles?:boolean }
function digestString(value:unknown):string|undefined { if(typeof value==="string") return value; if(value&&typeof value==="object"&&typeof (value as {value?:unknown}).value==="string") return `sha256:${(value as {value:string}).value}`; return undefined; }
export async function validateProductSpecProfile(spec:EngineeringSpec,specFile:string,options:ProfileOptions={}):Promise<Diagnostic[]> {
  if(!spec.metadata?.profiles?.some(profile=>profile.name==="productspec")||!Array.isArray(spec.sourceRefs)) return [];
  const diagnostics:Diagnostic[]=[];
  for(const source of spec.sourceRefs.filter(source=>source.type==="productspec")) {
    if(!source.path||options.resolveProfiles===false) continue;
    try {
      const resolved=await resolveProductSpec(path.resolve(path.dirname(specFile),source.path));
      if(source.revision!==undefined&&String(source.revision)!==String(resolved.revision)) diagnostics.push({code:Codes.profileItem,severity:"error",message:`ProductSpec revision mismatch for ${source.id}: expected ${source.revision}, found ${String(resolved.revision)}`,file:specFile});
      const expected=digestString(source.digest); if(expected&&expected.toLowerCase()!==resolved.digest.toLowerCase()) diagnostics.push({code:Codes.invalidDigest,severity:"error",message:`ProductSpec digest mismatch for ${source.id}`,file:specFile});
      for(const id of source.itemIds??[]) if(!resolved.ids.has(id)) diagnostics.push({code:Codes.profileItem,severity:"error",message:`ProductSpec item ${JSON.stringify(id)} was not found`,file:specFile});
    } catch(error) { diagnostics.push({code:Codes.profileUnavailable,severity:options.strictExternal?"error":"warning",message:`ProductSpec ${source.id} could not be resolved: ${error instanceof Error?error.message:String(error)}`,file:specFile}); }
  }
  return diagnostics;
}
