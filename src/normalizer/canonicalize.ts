export function canonicalize(value:unknown):unknown {
  if(Array.isArray(value)) return value.map(canonicalize);
  if(value&&typeof value==="object") return Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonicalize(item)]));
  return value;
}
export function canonicalJson(value:unknown):string { return `${JSON.stringify(canonicalize(value),null,2)}\n`; }
