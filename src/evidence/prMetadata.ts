import type { ImplementationReceipt } from "./receipt.js";
import { markdownCode, markdownText } from "../cli/render.js";

export interface PrMetadata {
  format: "engineering-spec-pr-metadata";
  formatVersion: "0.1";
  title: string;
  body: string;
  receipt: ImplementationReceipt;
}

export function buildPrMetadata(receipt: ImplementationReceipt): PrMetadata {
  const verification = receipt.verification.length
    ? receipt.verification.map((item) => `- ${markdownCode(item.verifierId)}: **${markdownText(item.state)}**${item.artifact ? ` — ${markdownText(item.artifact)}` : ""}`)
    : ["- No verifier evidence was supplied or executed."];
  return {
    format: "engineering-spec-pr-metadata",
    formatVersion: "0.1",
    title: `Implement ${receipt.authority.contractId}`,
    body: [
      "## EngineeringSpec authorization",
      "",
      `- Contract: ${markdownCode(receipt.authority.contractId)} revision ${receipt.authority.specRevision}`,
      `- Trusted base: ${markdownCode(receipt.authority.baseSha)}`,
      `- Contract digest: ${markdownCode(receipt.authority.semanticDigest)}`,
      `- Intended change digest: ${markdownCode(receipt.change.digest)}`,
      `- Classification: ${markdownCode(receipt.authorization.classification)}`,
      `- Complete working state: **${receipt.change.completeWorkingState ? "yes" : "no"}**`,
      "",
      "### Verification evidence",
      "",
      ...verification,
      "",
      "_Declared specification runners were not executed. A passed state is reported only from supplied or separately trusted evidence._",
      "",
    ].join("\n"),
    receipt,
  };
}
