import { readFile } from "node:fs/promises";
import { isUtf8 } from "node:buffer";
import type { ValidationResult } from "./diagnostics/Diagnostic.js";
import { parseMarkdown, type ParseResult } from "./parser/parseMarkdown.js";
import { validateStructure } from "./validator/validateStructure.js";
import { validateSemantics } from "./validator/validateSemantics.js";
import { validateProfiles } from "./validator/validateProfiles.js";
import type { ProfileOptions } from "./profiles/productspec/validate.js";

export * from "./model/types.js";
export * from "./model/ids.js";
export * from "./diagnostics/Diagnostic.js";
export * from "./diagnostics/formatter.js";
export * from "./parser/parseMarkdown.js";
export * from "./normalizer/normalize.js";
export * from "./normalizer/canonicalize.js";
export * from "./normalizer/digest.js";
export * from "./query/inspect.js";
export * from "./query/coverage.js";
export * from "./query/applicability.js";
export * from "./validator/pathSafety.js";
export * from "./validator/validateStructure.js";
export * from "./validator/validateSemantics.js";

export interface ValidateOptions extends ProfileOptions { schemaOnly?:boolean }
export async function parseFile(file:string):Promise<ParseResult> {
  const bytes=await readFile(file); if(!isUtf8(bytes)) return {diagnostics:[{code:"ESP009",severity:"error",message:"Input is not valid UTF-8",file}],locations:new Map()};
  return parseMarkdown(bytes.toString("utf8"),file);
}
export async function validateFile(file:string,options:ValidateOptions={}):Promise<ValidationResult> {
  const parsed=await parseFile(file); const diagnostics=[...parsed.diagnostics];
  if(parsed.spec) { diagnostics.push(...validateStructure(parsed.spec,file)); if(!options.schemaOnly) { diagnostics.push(...validateSemantics(parsed.spec,file)); diagnostics.push(...await validateProfiles(parsed.spec,file,options)); } }
  for(const diagnostic of diagnostics) if(!diagnostic.location) { const match=[...parsed.locations.entries()].find(([id])=>diagnostic.message.includes(id)); if(match) diagnostic.location=match[1]; }
  return {valid:!diagnostics.some(d=>d.severity==="error"),diagnostics,locations:parsed.locations,...(parsed.spec?{spec:parsed.spec}:{})};
}
