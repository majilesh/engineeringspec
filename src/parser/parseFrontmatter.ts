import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import type { SourceLocation } from "../model/types.js";
import { parseYaml } from "./parseYamlBlock.js";

export function parseFrontmatter(value:string,file:string,loc:SourceLocation|undefined,diagnostics:Diagnostic[]):Record<string,unknown>|undefined {
  const parsed=parseYaml(value,file,loc,diagnostics);
  return parsed && typeof parsed==="object" && !Array.isArray(parsed) ? parsed as Record<string,unknown> : undefined;
}
