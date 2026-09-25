import type { LoadedRoutingCandidate } from "../routing/types.js";
import { closureSemanticDigest } from "../normalizer/digest.js";
import { isEngineeringSpecId } from "../model/ids.js";

/**
 * RFC 0014 §5 closure receipt. It binds the trusted contract identity (ID, revision, closure
 * semantic digest) plus audit fields. Receipts can only remove eligibility, never add it.
 */
export interface ClosureReceipt {
  format: "engineering-spec-closure-receipt";
  formatVersion: "0.1";
  contractId: string;
  specRevision: number;
  semanticDigest: string;
  /** Trusted base the spend was authorized against; must be an ancestor of the evaluating base. */
  baseSha: string;
  /** Audit only: the routed change digest when the receipt was written. */
  changeDigest: string;
  /** Audit only. */
  cliVersion: string;
}

export const RECEIPT_DIRECTORY = "receipts";
const RECEIPT_FILE = /^([A-Z][A-Z0-9]*-[A-Za-z0-9][A-Za-z0-9._-]*)\.receipt\.json$/u;
const MAX_RECEIPT_BYTES = 64 * 1024;
const SHA256 = /^sha256:[0-9a-f]{64}$/u;

export function receiptPath(specDirectory: string, contractId: string): string {
  return `${specDirectory}/${RECEIPT_DIRECTORY}/${contractId}.receipt.json`;
}

/** The contract ID a receipt path names, or undefined when the path is not a receipt location. */
export function receiptContractId(specDirectory: string, file: string): string | undefined {
  const prefix = `${specDirectory}/${RECEIPT_DIRECTORY}/`;
  if (specDirectory === "." || !file.startsWith(prefix)) return undefined;
  return RECEIPT_FILE.exec(file.slice(prefix.length))?.[1];
}

export function isReceiptLocation(specDirectory: string, file: string): boolean {
  return specDirectory !== "." && file.startsWith(`${specDirectory}/${RECEIPT_DIRECTORY}/`);
}

/** Parses receipt bytes strictly; throws with a human-readable reason. */
export function parseClosureReceipt(text: string): ClosureReceipt {
  if (Buffer.byteLength(text, "utf8") > MAX_RECEIPT_BYTES) throw new Error("receipt exceeds 64 KiB");
  const value = JSON.parse(text) as Record<string, unknown>;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("receipt must be a JSON object");
  const allowed = new Set(["format", "formatVersion", "contractId", "specRevision", "semanticDigest", "baseSha", "changeDigest", "cliVersion"]);
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`receipt contains unknown property ${JSON.stringify(key)}`);
  if (value.format !== "engineering-spec-closure-receipt" || value.formatVersion !== "0.1") throw new Error("receipt format must be engineering-spec-closure-receipt 0.1");
  if (!isEngineeringSpecId(value.contractId)) throw new Error("receipt contractId must be an EngineeringSpec ID");
  if (!Number.isInteger(value.specRevision) || (value.specRevision as number) < 1) throw new Error("receipt specRevision must be a positive integer");
  if (typeof value.semanticDigest !== "string" || !SHA256.test(value.semanticDigest)) throw new Error("receipt semanticDigest must be sha256:<hex>");
  if (typeof value.baseSha !== "string" || !/^[0-9a-f]{40}$/u.test(value.baseSha)) throw new Error("receipt baseSha must be a full commit SHA");
  if (typeof value.changeDigest !== "string" || !SHA256.test(value.changeDigest)) throw new Error("receipt changeDigest must be sha256:<hex>");
  if (typeof value.cliVersion !== "string" || !value.cliVersion) throw new Error("receipt cliVersion must be a non-empty string");
  return value as unknown as ClosureReceipt;
}

export interface ReceiptCheck {
  /** Candidate spent by a valid receipt. */
  spent?: LoadedRoutingCandidate;
  /** Why the receipt was rejected; a rejected receipt leaves authority unchanged (fails safe). */
  problem?: string;
}

/**
 * A receipt spends exactly one approved change contract whose revision and closure semantic
 * digest match and whose authorizing base is an ancestor of the evaluating trusted base.
 */
export function checkReceipt(
  receipt: ClosureReceipt,
  candidates: LoadedRoutingCandidate[],
  options: { baseIsAncestor: boolean; requiredStatuses?: string[] },
): ReceiptCheck {
  const matches = candidates.filter((candidate) => candidate.spec.metadata.id === receipt.contractId);
  if (matches.length !== 1) return { problem: `names ${receipt.contractId}, which matches ${matches.length} trusted-base contracts` };
  const candidate = matches[0]!;
  if (!(options.requiredStatuses ?? ["approved"]).includes(candidate.spec.metadata.status)) return { problem: `names ${receipt.contractId}, which is ${candidate.spec.metadata.status}` };
  if (candidate.spec.metadata.authorityKind === "standing") return { problem: `names standing authority ${receipt.contractId}, which is never closed by a receipt` };
  if (candidate.spec.metadata.specRevision !== receipt.specRevision) return { problem: `is for revision ${receipt.specRevision}, but ${receipt.contractId} is at revision ${candidate.spec.metadata.specRevision}` };
  if (closureSemanticDigest(candidate.spec) !== receipt.semanticDigest) return { problem: `does not match the closure semantic digest of ${receipt.contractId}` };
  if (!options.baseIsAncestor) return { problem: `was authorized against ${receipt.baseSha}, which is not an ancestor of the trusted base` };
  return { spent: candidate };
}
