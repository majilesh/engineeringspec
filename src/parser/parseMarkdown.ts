import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
import type { Root, YAML, Code } from "mdast";
import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import { Codes } from "../diagnostics/codes.js";
import { MAX_FILE_SIZE, MAX_ITEMS, RECOGNISED_BLOCKS } from "../model/constants.js";
import type { EngineeringSpec, SourceLocation } from "../model/types.js";
import { extractBlocks } from "./extractBlocks.js";
import { location } from "./sourceMap.js";
import { parseFrontmatter } from "./parseFrontmatter.js";
import { parseYaml } from "./parseYamlBlock.js";

export interface ParseResult { spec?:EngineeringSpec; diagnostics:Diagnostic[]; locations:Map<string,SourceLocation>; raw?:Record<string,unknown> }
const blockToField:Record<string,string>={
  "engineering-source-refs":"sourceRefs","engineering-targets":"targets","engineering-decisions":"decisions",
  "engineering-contracts":"contracts","engineering-constraints":"constraints","engineering-verification":"verification",
  "engineering-rollout":"rollout","engineering-evidence":"evidence","engineering-exceptions":"exceptions",
};
const camel=(key:string)=>key.replace(/_([a-z])/g,(_,c:string)=>c.toUpperCase());
export function camelize(value:unknown):unknown {
  if(Array.isArray(value)) return value.map(camelize);
  if(value && typeof value==="object") return Object.fromEntries(Object.entries(value).map(([k,v])=>[camel(k),camelize(v)]));
  return value;
}
export function parseMarkdown(source:string,file="<input>"):ParseResult {
  const diagnostics:Diagnostic[]=[]; const locations=new Map<string,SourceLocation>();
  if(Buffer.byteLength(source,"utf8")>MAX_FILE_SIZE) return {diagnostics:[{code:Codes.inputTooLarge,severity:"error",message:"Input exceeds 2 MiB",file}],locations};
  let tree:Root;
  try { tree=unified().use(remarkParse).use(remarkFrontmatter,["yaml"]).parse(source) as Root; }
  catch(error) { return {diagnostics:[{code:Codes.malformedYaml,severity:"error",message:`Markdown parse failed: ${String(error)}`,file}],locations}; }
  const yaml=tree.children.find((node):node is YAML=>node.type==="yaml");
  if(!yaml) diagnostics.push({code:Codes.missingFrontmatter,severity:"error",message:"Document must begin with YAML frontmatter",file});
  else if(tree.children[0]!==yaml) diagnostics.push({code:Codes.missingFrontmatter,severity:"error",message:"YAML frontmatter must be the first document node",file});
  const metaLoc=yaml?location(file,yaml.position?.start,yaml.position?.end):undefined;
  const metadataRaw=yaml?parseFrontmatter(yaml.value,file,metaLoc,diagnostics):undefined;
  const blocks=extractBlocks(tree,file,diagnostics);
  const required=["engineering-source-refs","engineering-targets","engineering-verification"];
  for(const name of required) if(!blocks.has(name)) diagnostics.push({code:Codes.missingBlock,severity:"error",message:`Missing required ${name} block`,file});
  if(!blocks.has("engineering-contracts")&&!blocks.has("engineering-constraints")) diagnostics.push({code:Codes.missingBlock,severity:"error",message:"At least one contracts or constraints block is required",file});
  const raw:Record<string,unknown>={};
  if(metadataRaw) raw.metadata=camelize(metadataRaw);
  for(const [name,block] of blocks) {
    const value=parseYaml(block.value,file,block.location,diagnostics);
    if(RECOGNISED_BLOCKS.has(name)) {
      const field=blockToField[name]; if(field) raw[field]=camelize(value);
      if(Array.isArray(value)&&value.length>MAX_ITEMS) diagnostics.push({code:Codes.blockTooLarge,severity:"error",message:`${name} exceeds 10,000 items`,file,...(block.location?{location:block.location}:{})});
      if(Array.isArray(value)) for(const item of value) if(item&&typeof item==="object"&&"id" in item&&typeof item.id==="string"&&block.location) locations.set(item.id,block.location);
    } else raw.extensions={...(raw.extensions as object|undefined),[name]:camelize(value)};
  }
  const structured=new Set(Array.from(blocks.keys()));
  const prose=tree.children.filter(node=>node.type!=="yaml" && !(node.type==="code"&&structured.has((node as Code).lang??""))).map(node=>{
    const start=node.position?.start.offset??0,end=node.position?.end.offset??start;
    const loc=location(file,node.position?.start,node.position?.end);
    return {markdown:source.slice(start,end).replace(/\r\n?/g,"\n"),...(loc?{location:loc}:{})};
  });
  raw.prose=prose;
  return {spec:raw as unknown as EngineeringSpec,diagnostics,locations,raw};
}
