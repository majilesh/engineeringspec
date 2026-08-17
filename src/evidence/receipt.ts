import { readFile } from "node:fs/promises";
import { digest } from "../normalizer/digest.js";

export type VerificationState = "declared" | "mapped" | "attempted" | "passed" | "failed" | "rejected" | "not_run";

export interface VerificationEvidence {
  verifierId: string;
  state: VerificationState;
  artifact?: string;
  digest?: string;
  note?: string;
}

export interface ImplementationReceipt {
  format: "engineering-spec-implementation-receipt";
  formatVersion: "0.2";
  generatedAt: string;
  cliVersion: string;
  authority: { baseSha: string; contractId: string; specRevision: number; semanticDigest: string };
  change: { digest: string; completeWorkingState: boolean; excludedPaths: number };
  authorization: { valid: boolean; classification: string; limitations: string[] };
  verification: VerificationEvidence[];
}

const STATES = new Set<VerificationState>(["declared", "mapped", "attempted", "passed", "failed", "rejected", "not_run"]);

export interface EvidenceBinding {
  baseSha: string;
  contractId: string;
  specRevision: number;
  semanticDigest: string;
  changeDigest: string;
}

export async function readEvidenceFile(file: string, expectedIds: Set<string>, expected: EvidenceBinding): Promise<VerificationEvidence[]> {
  const text = await readFile(file, "utf8");
  if (Buffer.byteLength(text, "utf8") > 1024 * 1024) throw new Error("Evidence input exceeds the 1 MiB limit");
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Evidence input must be a bound evidence envelope");
  const envelope = value as Record<string, unknown>;
  for (const key of Object.keys(envelope)) if (!["authority", "changeDigest", "verification"].includes(key)) throw new Error(`Evidence input has unknown property ${key}`);
  const authority = envelope.authority;
  if (!authority || typeof authority !== "object" || Array.isArray(authority)) throw new Error("Evidence authority binding is required");
  const binding = authority as Record<string, unknown>;
  for (const key of ["baseSha", "contractId", "specRevision", "semanticDigest"] as const) {
    if (binding[key] !== expected[key]) throw new Error(`Evidence authority binding ${key} does not match the checked implementation`);
  }
  if (envelope.changeDigest !== expected.changeDigest) throw new Error("Evidence changeDigest does not match the checked implementation");
  if (!Array.isArray(envelope.verification)) throw new Error("Evidence verification must be an array");
  return envelope.verification.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`Evidence item ${index} must be an object`);
    const item = raw as Record<string, unknown>;
    for (const key of Object.keys(item)) if (!["verifierId", "state", "artifact", "digest", "note"].includes(key)) throw new Error(`Evidence item ${index} has unknown property ${key}`);
    if (typeof item.verifierId !== "string" || !expectedIds.has(item.verifierId)) throw new Error(`Evidence item ${index} references an undeclared verifier`);
    if (typeof item.state !== "string" || !STATES.has(item.state as VerificationState)) throw new Error(`Evidence item ${index} has invalid state`);
    for (const key of ["artifact", "digest", "note"] as const) if (item[key] !== undefined && typeof item[key] !== "string") throw new Error(`Evidence item ${index}.${key} must be a string`);
    if (["attempted", "passed", "failed"].includes(item.state) && (typeof item.artifact !== "string" || typeof item.digest !== "string" || !/^sha256:[0-9a-f]{64}$/u.test(item.digest))) {
      throw new Error(`Evidence item ${index} in state ${item.state} requires an artifact and lowercase SHA-256 digest`);
    }
    return {
      verifierId: item.verifierId,
      state: item.state as VerificationState,
      ...(typeof item.artifact === "string" ? { artifact: item.artifact } : {}),
      ...(typeof item.digest === "string" ? { digest: item.digest } : {}),
      ...(typeof item.note === "string" ? { note: item.note } : {}),
    };
  });
}

export function evidenceDigest(evidence: VerificationEvidence[]): string { return digest(evidence); }
