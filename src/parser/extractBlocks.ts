import type { Code, Root } from "mdast";
import { visit } from "unist-util-visit";
import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import { Codes } from "../diagnostics/codes.js";
import { MAX_BLOCK_SIZE, RECOGNISED_BLOCKS } from "../model/constants.js";
import type { SourceLocation } from "../model/types.js";
import { location } from "./sourceMap.js";

export interface ExtractedBlock { name:string; value:string; location?:SourceLocation }
export function extractBlocks(tree:Root,file:string,diagnostics:Diagnostic[]):Map<string,ExtractedBlock> {
  const blocks=new Map<string,ExtractedBlock>();
  visit(tree,"code",(node:Code)=>{
    const name=node.lang?.trim();
    if(!name?.startsWith("engineering-")) return;
    const loc=location(file,node.position?.start,node.position?.end);
    if(!RECOGNISED_BLOCKS.has(name)) {
      diagnostics.push({code:Codes.unknownBlock,severity:name.startsWith("engineering-x-")?"info":"warning",message:`Unknown structured block ${JSON.stringify(name)} is preserved as an extension`,file,...(loc?{location:loc}:{})});
      if(!blocks.has(name)) blocks.set(name,{name,value:node.value,...(loc?{location:loc}:{})});
      return;
    }
    if(node.value.length>MAX_BLOCK_SIZE) diagnostics.push({code:Codes.blockTooLarge,severity:"error",message:`Structured block ${name} exceeds 512 KiB`,file,...(loc?{location:loc}:{})});
    const first=blocks.get(name);
    if(first) diagnostics.push({code:Codes.duplicateBlock,severity:"error",message:`Duplicate ${name} block`,file,...(loc?{location:loc}:{}),related:[{message:"First block is here",file,...(first.location?{location:first.location}:{})}]});
    else blocks.set(name,{name,value:node.value,...(loc?{location:loc}:{})});
  });
  return blocks;
}
