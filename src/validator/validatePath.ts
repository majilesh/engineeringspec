import path from "node:path";
import type { Diagnostic, ValidationResult } from "../diagnostics/Diagnostic.js";
import { Codes } from "../diagnostics/codes.js";
import { discoverEngineeringSpecs } from "../discovery/discover.js";
import { validateFile, type ValidateOptions } from "./validateFile.js";

export interface FileValidationReport {
  file: string;
  valid: boolean;
  errors: number;
  warnings: number;
  identity?: { id?: string; revision?: number };
  diagnostics: Diagnostic[];
  result: ValidationResult;
}

export interface PathValidationReport {
  path: string;
  valid: boolean;
  errors: number;
  warnings: number;
  files: FileValidationReport[];
  diagnostics: Diagnostic[];
}

export async function validatePath(
  input: string,
  options: ValidateOptions & { strict?: boolean } = {},
): Promise<PathValidationReport> {
  const absoluteInput = path.resolve(input);
  const discovered = await discoverEngineeringSpecs(absoluteInput);
  if (discovered.length === 0) {
    const diagnostic: Diagnostic = {
      code: Codes.noDocuments,
      severity: "error",
      message: `No EngineeringSpec documents were found under ${input}`,
      file: input,
    };
    return { path: input, valid: false, errors: 1, warnings: 0, files: [], diagnostics: [diagnostic] };
  }

  const files: FileValidationReport[] = [];
  for (const file of discovered) {
    const result = await validateFile(file, options);
    const errors = result.diagnostics.filter((item) => item.severity === "error").length;
    const warnings = result.diagnostics.filter((item) => item.severity === "warning").length;
    files.push({
      file: path.relative(process.cwd(), file) || file,
      valid: result.valid && !(options.strict && warnings > 0),
      errors,
      warnings,
      ...(result.spec
        ? { identity: { id: result.spec.metadata?.id, revision: result.spec.metadata?.specRevision } }
        : {}),
      diagnostics: result.diagnostics,
      result,
    });
  }

  const errors = files.reduce((total, file) => total + file.errors, 0);
  const warnings = files.reduce((total, file) => total + file.warnings, 0);
  const diagnostics = files.flatMap((file) => file.diagnostics);
  return {
    path: input,
    valid: files.every((file) => file.valid),
    errors,
    warnings,
    files,
    diagnostics,
  };
}
