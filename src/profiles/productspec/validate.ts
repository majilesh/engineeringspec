import path from "node:path";
import { realpath } from "node:fs/promises";
import type { Diagnostic } from "../../diagnostics/Diagnostic.js";
import { Codes } from "../../diagnostics/codes.js";
import type { EngineeringSpec } from "../../model/types.js";
import { resolveProductSpec, resolveProductSpecBytes } from "./resolve.js";

export interface RepositoryContentReader { readBytes(path:string):Promise<Uint8Array> }
export interface ProfileOptions { strictExternal?:boolean; resolveProfiles?:boolean; repositoryRoot?:string; repositoryContentReader?:RepositoryContentReader }
function digestString(value:unknown):string|undefined { if(typeof value==="string") return value; if(value&&typeof value==="object"&&typeof (value as {value?:unknown}).value==="string") return `sha256:${(value as {value:string}).value}`; return undefined; }
async function resolveRepositoryPath(repositoryRoot:string|undefined,sourcePath:string):Promise<string> {
  if(!repositoryRoot) throw new Error("an explicit repository root is required for local ProductSpec resolution");
  const root=await realpath(path.resolve(repositoryRoot));
  const resolved=await realpath(path.resolve(root,sourcePath));
  const relative=path.relative(root,resolved);
  if(!relative||relative.startsWith(`..${path.sep}`)||relative===".."||path.isAbsolute(relative)) {
    throw new Error(`ProductSpec path ${JSON.stringify(sourcePath)} resolves outside the repository root`);
  }
  return resolved;
}
export async function validateProductSpecProfile(spec:EngineeringSpec,specFile:string,options:ProfileOptions={}):Promise<Diagnostic[]> {
  if(!spec.metadata?.profiles?.some(profile=>profile.name==="productspec")||!Array.isArray(spec.sourceRefs)) return [];
  const diagnostics:Diagnostic[]=[];
  for(const source of spec.sourceRefs.filter(source=>source.type==="productspec")) {
    if(!source.path||options.resolveProfiles===false) continue;
    try {
      const resolved=options.repositoryContentReader
        ? resolveProductSpecBytes(await options.repositoryContentReader.readBytes(source.path))
        : await resolveProductSpec(await resolveRepositoryPath(options.repositoryRoot,source.path));
      if(source.revision!==undefined&&String(source.revision)!==String(resolved.revision)) diagnostics.push({code:Codes.profileItem,severity:"error",message:`ProductSpec revision mismatch for ${source.id}: expected ${source.revision}, found ${String(resolved.revision)}`,file:specFile});
      const expected=digestString(source.digest); if(expected&&expected.toLowerCase()!==resolved.digest.toLowerCase()) diagnostics.push({code:Codes.invalidDigest,severity:"error",message:`ProductSpec digest mismatch for ${source.id}`,file:specFile});
      for(const id of source.itemIds??[]) if(!resolved.ids.has(id)) diagnostics.push({code:Codes.profileItem,severity:"error",message:`ProductSpec item ${JSON.stringify(id)} was not found`,file:specFile});
    } catch(error) { diagnostics.push({code:Codes.profileUnavailable,severity:options.strictExternal?"error":"warning",message:`ProductSpec ${source.id} could not be resolved${options.repositoryContentReader?" from the immutable repository snapshot":""}: ${error instanceof Error?error.message:String(error)}`,file:specFile}); }
  }
  return diagnostics;
}
