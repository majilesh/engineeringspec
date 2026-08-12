import type { Diagnostic } from "./Diagnostic.js";
export function formatDiagnostics(diagnostics: Diagnostic[]): string {
  return diagnostics.map((d) => {
    const loc=d.location ? `${d.location.file}:${d.location.start.line}:${d.location.start.column}: ` : d.file ? `${d.file}: ` : "";
    const hint=d.hint ? ` (hint: ${d.hint})` : "";
    return `${loc}${d.severity} ${d.code} ${d.message}${hint}`;
  }).join("\n");
}
