import { describe, expect, it } from "vitest";
import { formatGitHubDiagnostic, formatValidationMarkdown } from "../../src/diagnostics/github.js";
import type { PathValidationReport } from "../../src/validator/validatePath.js";

describe("GitHub reporting", () => {
  it("escapes workflow commands and includes source positions", () => {
    const formatted = formatGitHubDiagnostic({
      code: "ESP001",
      severity: "error",
      message: "bad%line\nnext",
      file: "docs/a,b:1.md",
      location: { file: "docs/a.md", start: { line: 2, column: 4 }, end: { line: 2, column: 8 } },
    });
    expect(formatted).toContain("::error ");
    expect(formatted).toContain("file=docs/a%2Cb%3A1.md");
    expect(formatted).toContain("line=2,col=4,title=ESP001");
    expect(formatted).toContain("bad%25line%0Anext");
  });

  it("appends a hint to the annotation message when a diagnostic carries one", () => {
    const formatted = formatGitHubDiagnostic({ code: "ESRT002", severity: "error", message: "uncovered", hint: "try this" });
    expect(formatted).toContain("uncovered (hint: try this)");
  });

  it("formats warnings, notices, and a Markdown summary", () => {
    expect(formatGitHubDiagnostic({ code: "W", severity: "warning", message: "warn" }).startsWith("::warning")).toBe(true);
    expect(formatGitHubDiagnostic({ code: "I", severity: "info", message: "info" }).startsWith("::notice")).toBe(true);
    const report = {
      path: "docs",
      valid: true,
      errors: 0,
      warnings: 0,
      diagnostics: [],
      files: [{ file: "docs/a.engineering-spec.md", valid: true, errors: 0, warnings: 0, identity: { id: "ES-a", revision: 1 }, diagnostics: [], result: { valid: true, diagnostics: [] } }],
    } satisfies PathValidationReport;
    expect(formatValidationMarkdown(report)).toContain("✅ Passed");
    expect(formatValidationMarkdown(report)).toContain("ES-a");
  });
});
