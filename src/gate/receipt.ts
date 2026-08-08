import { writeFile } from "node:fs/promises";
import type { GateReport } from "./types.js";

export interface GateReceipt {
  format: "engineeringspec-gate-receipt";
  formatVersion: "0.1";
  result: "pass" | "fail";
  specId?: string;
  specStatus?: string;
  specDigest?: string;
  specSource?: "workspace" | "base";
  base?: string;
  head?: string;
  baseSha?: string;
  headSha?: string;
  changedDigest?: string;
  changedCount: number;
  allowedCount: number;
  violationCount: number;
  violations: GateReport["violations"];
  tool: { name: string; version: string };
  generatedAt: string;
}

export function buildGateReceipt(
  report: GateReport,
  options: { toolVersion: string; generatedAt?: string },
): GateReceipt {
  return {
    format: "engineeringspec-gate-receipt",
    formatVersion: "0.1",
    result: report.valid ? "pass" : "fail",
    ...(report.specId !== undefined ? { specId: report.specId } : {}),
    ...(report.specStatus !== undefined ? { specStatus: report.specStatus } : {}),
    ...(report.specDigest !== undefined ? { specDigest: report.specDigest } : {}),
    ...(report.specSource !== undefined ? { specSource: report.specSource } : {}),
    ...(report.base !== undefined ? { base: report.base } : {}),
    ...(report.head !== undefined ? { head: report.head } : {}),
    ...(report.baseSha !== undefined ? { baseSha: report.baseSha } : {}),
    ...(report.headSha !== undefined ? { headSha: report.headSha } : {}),
    ...(report.changedDigest !== undefined ? { changedDigest: report.changedDigest } : {}),
    changedCount: report.changed.length,
    allowedCount: report.allowed.length,
    violationCount: report.violations.length,
    violations: report.violations,
    tool: { name: "@engineeringspec/cli", version: options.toolVersion },
    generatedAt: options.generatedAt ?? new Date().toISOString(),
  };
}

export async function writeGateReceipt(filePath: string, receipt: GateReceipt): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
}
