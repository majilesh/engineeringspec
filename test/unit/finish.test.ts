import { readFile } from "node:fs/promises";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { describe, expect, it } from "vitest";
import { buildPrMetadata } from "../../src/evidence/prMetadata.js";
import type { ImplementationReceipt } from "../../src/evidence/receipt.js";

describe("implementation evidence schemas", () => {
  it("validates bound receipts and PR metadata with explicit not-run states", async () => {
    const receipt: ImplementationReceipt = {
      format: "engineering-spec-implementation-receipt",
      formatVersion: "0.2",
      generatedAt: "2026-08-17T00:00:00.000Z",
      cliVersion: "0.1.0-rc.14",
      authority: {
        baseSha: "a".repeat(40),
        contractId: "ES-change",
        specRevision: 2,
        semanticDigest: `sha256:${"b".repeat(64)}`,
      },
      change: { digest: `sha256:${"c".repeat(64)}`, completeWorkingState: true, excludedPaths: 0 },
      authorization: { valid: true, classification: "implementation_with_monotonic_close", limitations: ["Declared runners were not executed."] },
      verification: [{ verifierId: "VER-1", state: "not_run" }],
    };
    const receiptSchema = JSON.parse(await readFile("schemas/implementation-receipt-0.2.schema.json", "utf8")) as object;
    const prSchema = JSON.parse(await readFile("schemas/pr-metadata-0.1.schema.json", "utf8")) as object;
    const ajv = new Ajv2020({ strict: true });
    (addFormatsModule as unknown as (instance: Ajv2020) => void)(ajv);
    ajv.addSchema(receiptSchema);
    expect(ajv.compile(prSchema)(buildPrMetadata(receipt))).toBe(true);
    expect(JSON.stringify(buildPrMetadata(receipt))).not.toContain("argv");
  });
});
