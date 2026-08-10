import path from "node:path";
import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import { discoverEngineeringSpecs } from "../discovery/discover.js";
import type { Status } from "../model/types.js";
import { compareCodePoints } from "../normalizer/canonicalize.js";
import { normalize } from "../normalizer/normalize.js";
import { applicableTargets } from "../query/applicability.js";
import { validateFile } from "../validator/validateFile.js";

const MAX_CATALOGUE_DOCUMENTS = 10_000;

export interface CatalogueEntry {
  id: string;
  title: string;
  status: Status;
  file: string;
  owners: string[];
  sourceRefs: Array<{ id: string; type: string; locator?: string; title?: string }>;
  targets: Array<{ id: string; component?: string; paths: string[]; changePolicy: string; owner?: string }>;
  constraints: Array<{ id: string; level: string; statement: string; appliesTo: string[]; enforcement?: string }>;
  contracts: Array<{ id: string; kind: string; locator?: string; compatibility?: string }>;
  verification: Array<{ id: string; kind: string; proves: string[] }>;
}

export interface CatalogueReport {
  valid: boolean;
  directory: string;
  documents: number;
  entries: CatalogueEntry[];
  diagnostics: Diagnostic[];
}

function locator(value: { path?: string; ref?: string; uri?: string }): string | undefined {
  return value.path ?? value.ref ?? value.uri;
}

export async function buildCatalogue(directory: string, options: { query?: string; path?: string; strict?: boolean } = {}): Promise<CatalogueReport> {
  const absolute = path.resolve(directory);
  const files = await discoverEngineeringSpecs(absolute);
  if (files.length > MAX_CATALOGUE_DOCUMENTS) throw new Error(`Catalogue document limit exceeded (${files.length} > ${MAX_CATALOGUE_DOCUMENTS})`);
  const diagnostics: Diagnostic[] = [];
  const entries: CatalogueEntry[] = [];
  for (const file of files) {
    const result = await validateFile(file, { resolveProfiles: false });
    diagnostics.push(...result.diagnostics);
    if (!result.spec || result.diagnostics.some((item) => item.severity === "error")) continue;
    const spec = normalize(result.spec);
    if (options.path && applicableTargets(spec, options.path).length === 0) continue;
    const entry: CatalogueEntry = {
      id: spec.metadata.id,
      title: spec.metadata.title,
      status: spec.metadata.status,
      file: path.relative(absolute, file).split(path.sep).join("/"),
      owners: spec.metadata.owners.map((owner) => owner.team ?? owner.person).filter((value): value is string => Boolean(value)).sort(compareCodePoints),
      sourceRefs: spec.sourceRefs.map((source) => {
        const located = locator(source);
        return { id: source.id, type: source.type, ...(located !== undefined ? { locator: located } : {}), ...(source.title ? { title: source.title } : {}) };
      }),
      targets: spec.targets.map((target) => ({ id: target.id, ...(target.component ? { component: target.component } : {}), paths: [...target.paths], changePolicy: target.changePolicy, ...(target.owner ? { owner: target.owner } : {}) })),
      constraints: (spec.constraints ?? []).map((constraint) => ({ id: constraint.id, level: constraint.level, statement: constraint.statement, appliesTo: [...(constraint.appliesTo ?? [])], ...(constraint.enforcement ? { enforcement: constraint.enforcement.kind } : {}) })),
      contracts: (spec.contracts ?? []).map((contract) => {
        const located = locator(contract);
        return { id: contract.id, kind: contract.kind, ...(located !== undefined ? { locator: located } : {}), ...(contract.compatibility ? { compatibility: contract.compatibility } : {}) };
      }),
      verification: spec.verification.map((verification) => ({ id: verification.id, kind: verification.kind, proves: [...verification.proves] })),
    };
    const haystack = JSON.stringify(entry).toLowerCase();
    if (options.query && !haystack.includes(options.query.toLowerCase())) continue;
    entries.push(entry);
  }
  entries.sort((left, right) => compareCodePoints(left.id, right.id) || compareCodePoints(left.file, right.file));
  const failed = diagnostics.some((item) => item.severity === "error") || Boolean(options.strict && diagnostics.some((item) => item.severity === "warning"));
  const directoryLabel = path.isAbsolute(directory) ? "." : directory.split(path.sep).join("/");
  return { valid: !failed, directory: directoryLabel, documents: files.length, entries, diagnostics };
}

export function catalogueHtml(report: CatalogueReport): string {
  const data = JSON.stringify(report).replace(/</gu, "\\u003c");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EngineeringSpec Explorer</title><style>:root{color-scheme:light dark;font-family:ui-sans-serif,system-ui}body{max-width:1100px;margin:auto;padding:2rem}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:.7rem;margin:1.2rem 0}.stat,article{border:1px solid #778;border-radius:.7rem;padding:1rem}.stat strong{display:block;font-size:1.7rem}input,select{padding:.7rem;margin:.25rem;border:1px solid #778;border-radius:.4rem}article{margin:1rem 0}.meta{opacity:.72}.paths{font-family:ui-monospace,monospace;font-size:.9rem}span{margin-right:.7rem}</style></head><body><h1>EngineeringSpec Explorer</h1><p>Search lifecycle, ownership, obligations and declared path impact. This view explains contracts; it grants no authority.</p><section class="stats" id="stats"></section><p id="summary"></p><label>Search <input id="q" type="search"></label><label>Status <select id="status"><option value="">All</option></select></label><label>Owner <select id="owner"><option value="">All</option></select></label><main id="results"></main><script id="catalogue" type="application/json">${data}</script><script>const data=JSON.parse(document.getElementById('catalogue').textContent);const q=document.getElementById('q'),s=document.getElementById('status'),o=document.getElementById('owner'),r=document.getElementById('results'),summary=document.getElementById('summary'),stats=document.getElementById('stats');const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const statuses=[...new Set(data.entries.map(e=>e.status))].sort(),owners=[...new Set(data.entries.flatMap(e=>e.owners))].sort();statuses.forEach(v=>s.insertAdjacentHTML('beforeend','<option>'+esc(v)+'</option>'));owners.forEach(v=>o.insertAdjacentHTML('beforeend','<option>'+esc(v)+'</option>'));stats.innerHTML=[['Contracts',data.entries.length],['Approved',data.entries.filter(e=>e.status==='approved').length],['Targets',data.entries.reduce((n,e)=>n+e.targets.length,0)],['Obligations',data.entries.reduce((n,e)=>n+e.constraints.length,0)]].map(v=>'<div class="stat"><strong>'+v[1]+'</strong>'+v[0]+'</div>').join('');function render(){const needle=q.value.toLowerCase();const rows=data.entries.filter(e=>(!s.value||e.status===s.value)&&(!o.value||e.owners.includes(o.value))&&(!needle||JSON.stringify(e).toLowerCase().includes(needle)));summary.textContent=rows.length+' of '+data.entries.length+' contracts';r.innerHTML=rows.map(e=>'<article><h2>'+esc(e.title)+'</h2><p class="meta"><span>'+esc(e.id)+'</span><span>'+esc(e.status)+'</span><span>'+esc(e.owners.join(', ')||'unowned')+'</span></p><p class="paths">'+e.targets.flatMap(t=>t.paths).map(esc).join('<br>')+'</p><details><summary>Obligations</summary><ul>'+e.constraints.map(c=>'<li><strong>'+esc(c.id)+'</strong> '+esc(c.statement)+'</li>').join('')+'</ul></details></article>').join('')||'<p>No matching contracts.</p>'}q.addEventListener('input',render);s.addEventListener('change',render);o.addEventListener('change',render);render();</script></body></html>`;
}
