import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
import type { Root, Code, YAML } from "mdast";
import { parseDocument } from "yaml";

function collect(value:unknown,ids:Set<string>):void {
  if(Array.isArray(value)) for(const item of value) collect(item,ids);
  else if(value&&typeof value==="object") for(const [key,item] of Object.entries(value)) { if(key==="id"&&typeof item==="string"&&/^(AC|EVAL|SM)-/.test(item)) ids.add(item); collect(item,ids); }
}
export interface ProductSpecDocument { ids:Set<string>; revision?:string|number; digest:string }
export function resolveProductSpecBytes(bytes:Uint8Array):ProductSpecDocument {
  const source=Buffer.from(bytes).toString("utf8");
  const tree=unified().use(remarkParse).use(remarkFrontmatter,["yaml"]).parse(source) as Root;
  const ids=new Set<string>(); let revision:string|number|undefined;
  for(const node of tree.children) if(node.type==="yaml"||node.type==="code") {
    const value=(node as YAML|Code).value; const doc=parseDocument(value); if(doc.errors.length) continue;
    const parsed=doc.toJS({maxAliasCount:100}) as unknown; collect(parsed,ids);
    if(node.type==="yaml"&&parsed&&typeof parsed==="object") { const record=parsed as Record<string,unknown>; const candidate=record.spec_revision??record.revision; if(typeof candidate==="string"||typeof candidate==="number") revision=candidate; }
  }
  return {ids,...(revision===undefined?{}:{revision}),digest:`sha256:${createHash("sha256").update(bytes).digest("hex")}`};
}
export async function resolveProductSpec(path:string):Promise<ProductSpecDocument> {
  return resolveProductSpecBytes(await readFile(path));
}
