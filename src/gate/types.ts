import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import type { TargetSurface } from "../model/types.js";

export type ChangeKind = "added" | "modified" | "deleted" | "renamed";

export interface ChangedFile {
  path: string;
  kind: ChangeKind;
  /** Previous path when kind is renamed */
  fromPath?: string;
}

export interface GateMatch {
  file: string;
  kind: ChangeKind;
  targets: Array<Pick<TargetSurface, "id" | "changePolicy">>;
}

export interface GateViolation {
  file: string;
  kind: ChangeKind;
  reason: "out_of_scope" | "policy" | "read_only" | "status";
  message: string;
  targets: Array<Pick<TargetSurface, "id" | "changePolicy">>;
}

export interface GateReport {
  valid: boolean;
  specId?: string;
  specStatus?: string;
  specDigest?: string;
  specSource?: "workspace" | "base";
  base?: string;
  head?: string;
  baseSha?: string;
  headSha?: string;
  changedDigest?: string;
  changed: ChangedFile[];
  allowed: GateMatch[];
  violations: GateViolation[];
  diagnostics: Diagnostic[];
}
