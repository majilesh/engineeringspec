import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { gateDiff } from "../../src/gate/gate.js";
import { buildGateReceipt, writeGateReceipt } from "../../src/gate/receipt.js";
import type { EngineeringSpec } from "../../src/model/types.js";

const spec: EngineeringSpec = {
  metadata: {
    specFormat: "engineering-spec",
    specFormatVersion: "0.1",
    specRevision: 1,
    id: "ES-receipt",
    title: "Receipt",
    status: "approved",
    owners: [{ team: "test" }],
  },
  sourceRefs: [{ id: "SRC-1", type: "other", ref: "test" }],
  targets: [{ id: "TARGET-1", paths: ["src/**"], changePolicy: "modify" }],
  verification: [{ id: "VER-1", proves: ["CON-1"], kind: "test", runner: { type: "reference", reference: "tests" } }],
  constraints: [{ id: "CON-1", level: "must", statement: "safe", enforcement: { kind: "test", verifierRef: "VER-1" } }],
  prose: [],
};

describe("gate receipt", () => {
  it("builds and writes a durable receipt", async () => {
    const report = gateDiff(spec, [{ path: "src/a.ts", kind: "modified" }], {
      baseSha: "a".repeat(40),
      headSha: "b".repeat(40),
      specDigest: "sha256:" + "c".repeat(64),
      specSource: "base",
    });
    const receipt = buildGateReceipt(report, { toolVersion: "0.1.0-rc.2", generatedAt: "2026-08-08T00:00:00.000Z" });
    expect(receipt.format).toBe("engineeringspec-gate-receipt");
    expect(receipt.result).toBe("pass");
    expect(receipt.baseSha).toHaveLength(40);
    expect(receipt.tool.version).toBe("0.1.0-rc.2");

    const dir = await mkdtemp(path.join(os.tmpdir(), "es-receipt-"));
    const file = path.join(dir, "gate-receipt.json");
    await writeGateReceipt(file, receipt);
    const parsed = JSON.parse(await readFile(file, "utf8")) as typeof receipt;
    expect(parsed.specId).toBe("ES-receipt");
    expect(parsed.changedCount).toBe(1);
  });
});
