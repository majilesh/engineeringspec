import { parseDocument } from "yaml";
import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import { Codes } from "../diagnostics/codes.js";
import type { SourceLocation } from "../model/types.js";

const forbidden=new Set(["__proto__","prototype","constructor"]);
function inspect(value:unknown, depth=0): string|undefined {
  if (depth>50) return "YAML nesting exceeds 50 levels";
  if (Array.isArray(value)) { for (const item of value) { const problem=inspect(item,depth+1); if(problem) return problem; } }
  else if (value && typeof value==="object") for (const [key,item] of Object.entries(value)) {
    if(forbidden.has(key)) return `Unsafe YAML key ${JSON.stringify(key)}`;
    const problem=inspect(item,depth+1); if(problem) return problem;
  }
  return undefined;
}
export function parseYaml(value:string, file:string, loc:SourceLocation|undefined, diagnostics:Diagnostic[]): unknown {
  try {
    const document=parseDocument(value,{prettyErrors:false,strict:true});
    if(document.errors.length) throw document.errors[0];
    if(document.warnings.some(w=>w.code==="TAG_RESOLVE_FAILED")) {
      diagnostics.push({code:Codes.unsafeYaml,severity:"error",message:"Custom YAML tags are not allowed",file,...(loc?{location:loc}:{})});
      return undefined;
    }
    const result=document.toJS({maxAliasCount:100});
    const problem=inspect(result);
    if(problem) diagnostics.push({code:Codes.unsafeYaml,severity:"error",message:problem,file,...(loc?{location:loc}:{})});
    return problem ? undefined : result;
  } catch(error) {
    diagnostics.push({code:Codes.malformedYaml,severity:"error",message:`Malformed YAML: ${error instanceof Error?error.message:String(error)}`,file,...(loc?{location:loc}:{})});
    return undefined;
  }
}
