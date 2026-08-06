import type { Diagnostic } from "./Diagnostic.js";
import type { PathValidationReport } from "../validator/validatePath.js";

function escapeData(value: string): string {
  return value.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
}

function escapeProperty(value: string): string {
  return escapeData(value).replaceAll(":", "%3A").replaceAll(",", "%2C");
}

export function formatGitHubDiagnostic(diagnostic: Diagnostic): string {
  const command = diagnostic.severity === "error" ? "error" : diagnostic.severity === "warning" ? "warning" : "notice";
  const properties = [
    diagnostic.file ? `file=${escapeProperty(diagnostic.file)}` : undefined,
    diagnostic.location ? `line=${diagnostic.location.start.line}` : undefined,
    diagnostic.location ? `col=${diagnostic.location.start.column}` : undefined,
    `title=${escapeProperty(diagnostic.code)}`,
  ].filter((value): value is string => Boolean(value));
  return `::${command} ${properties.join(",")}::${escapeData(diagnostic.message)}`;
}

export function formatValidationMarkdown(report: PathValidationReport): string {
  const status = report.valid ? "✅ Passed" : "❌ Failed";
  const rows = report.files.map(
    (file) =>
      `| \`${file.file}\` | ${file.valid ? "✅" : "❌"} | ${file.errors} | ${file.warnings} | ${file.identity?.id ?? "—"} |`,
  );
  return [
    "## EngineeringSpec validation",
    "",
    `${status} — ${report.files.length} document(s), ${report.errors} error(s), ${report.warnings} warning(s).`,
    "",
    "| Document | Status | Errors | Warnings | Spec |",
    "|---|---:|---:|---:|---|",
    ...rows,
    "",
  ].join("\n");
}
