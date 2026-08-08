import { isUtf8 } from "node:buffer";
import { readFile } from "node:fs/promises";
import type { ValidationResult } from "../diagnostics/Diagnostic.js";
import { Codes } from "../diagnostics/codes.js";
import { parseMarkdown, type ParseResult } from "../parser/parseMarkdown.js";
import type { ProfileOptions } from "../profiles/productspec/validate.js";
import { validateProfiles } from "./validateProfiles.js";
import { validateSemantics } from "./validateSemantics.js";
import { validateStructure } from "./validateStructure.js";

export interface ValidateOptions extends ProfileOptions { schemaOnly?: boolean }

export async function parseFile(file: string): Promise<ParseResult> {
  const bytes = await readFile(file);
  if (!isUtf8(bytes)) {
    return { diagnostics: [{ code: Codes.invalidUtf8, severity: "error", message: "Input is not valid UTF-8", file }], locations: new Map() };
  }
  return parseMarkdown(bytes.toString("utf8"), file);
}

export async function validateMarkdown(content: string, file: string, options: ValidateOptions = {}): Promise<ValidationResult> {
  const parsed = parseMarkdown(content, file);
  const diagnostics = [...parsed.diagnostics];
  if (parsed.spec) {
    diagnostics.push(...validateStructure(parsed.spec, file));
    if (!options.schemaOnly) {
      diagnostics.push(...validateSemantics(parsed.spec, file));
      diagnostics.push(...await validateProfiles(parsed.spec, file, options));
    }
  }
  for (const diagnostic of diagnostics) {
    if (!diagnostic.location) {
      const match = [...parsed.locations.entries()].find(([id]) => diagnostic.message.includes(id));
      if (match) diagnostic.location = match[1];
    }
  }
  return {
    valid: !diagnostics.some((diagnostic) => diagnostic.severity === "error"),
    diagnostics,
    locations: parsed.locations,
    ...(parsed.spec ? { spec: parsed.spec } : {}),
  };
}

export async function validateBytes(bytes: Uint8Array, file: string, options: ValidateOptions = {}): Promise<ValidationResult> {
  if (!isUtf8(bytes)) {
    return {
      valid: false,
      diagnostics: [{ code: Codes.invalidUtf8, severity: "error", message: "Input is not valid UTF-8", file }],
      locations: new Map(),
    };
  }
  return validateMarkdown(Buffer.from(bytes).toString("utf8"), file, options);
}

export async function validateFile(file: string, options: ValidateOptions = {}): Promise<ValidationResult> {
  return validateBytes(await readFile(file), file, options);
}
