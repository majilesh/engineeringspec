import { createHash } from "node:crypto";
import type { EngineeringSpec } from "../model/types.js";
import { canonicalJson } from "./canonicalize.js";
export function digest(value:unknown):string { return `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`; }

export function closureSemanticProjection(spec: EngineeringSpec): unknown {
  const metadata: Partial<EngineeringSpec["metadata"]> = { ...spec.metadata };
  delete metadata.status;
  delete metadata.updatedAt;
  return { ...spec, metadata };
}

export function closureSemanticDigest(spec: EngineeringSpec): string {
  return digest(closureSemanticProjection(spec));
}

export function isSafeImplementedClosure(before: EngineeringSpec, after: EngineeringSpec): boolean {
  return before.metadata.status === "approved"
    && after.metadata.status === "implemented"
    && closureSemanticDigest(before) === closureSemanticDigest(after);
}
