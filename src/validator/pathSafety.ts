import path from "node:path";
export function isSafeRelativePath(value:string):boolean {
  if(!value || value.includes("\0") || path.posix.isAbsolute(value) || path.win32.isAbsolute(value)) return false;
  const normalized=path.posix.normalize(value.replaceAll("\\","/"));
  return normalized!==".."&&!normalized.startsWith("../");
}
