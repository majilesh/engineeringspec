import type { Point } from "unist";
import type { SourceLocation } from "../model/types.js";

export function location(file:string, start?:Point, end?:Point): SourceLocation | undefined {
  if (!start || !end) return undefined;
  const s={line:start.line,column:start.column,...(start.offset===undefined?{}:{offset:start.offset})};
  const e={line:end.line,column:end.column,...(end.offset===undefined?{}:{offset:end.offset})};
  return {file,start:s,end:e};
}
