import { readFileSync } from "node:fs";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { summarizeAgentBenchmark } from "../../src/cli/benchmark.js";

interface Vector {
  name: string;
  schemaValid: boolean;
  records: unknown[];
  expected?: {
    tiers: string[];
    absoluteDuration: number[];
    relativeDuration: Array<number | null>;
    missingTaskRiskTier: number;
    publishable: boolean;
    zeroBaselineDurationPairs?: number[];
  };
  expectedError?: string;
}

describe("benchmark risk-tier conformance", () => {
  const schema = JSON.parse(readFileSync("benchmarks/agent-impact.schema.json", "utf8")) as object;
  const validate = new Ajv2020({ strict: true }).compile(schema);
  const vectors = JSON.parse(readFileSync("conformance/benchmark-risk-tier/manifest.json", "utf8")) as Vector[];

  for (const vector of vectors) {
    it(vector.name, () => {
      expect(vector.records.every((record) => Boolean(validate(record)))).toBe(vector.schemaValid);
      if (vector.expectedError) {
        expect(() => summarizeAgentBenchmark(vector.records)).toThrow(vector.expectedError);
        return;
      }
      const summary = summarizeAgentBenchmark(vector.records);
      expect(summary.tiers.map((tier) => tier.taskRiskTier)).toEqual(vector.expected?.tiers);
      expect(summary.tiers.map((tier) => tier.overhead.averageAbsoluteDurationSeconds)).toEqual(vector.expected?.absoluteDuration);
      expect(summary.tiers.map((tier) => tier.overhead.averageRelativeDuration)).toEqual(vector.expected?.relativeDuration);
      expect(summary.missingData.taskRiskTier).toBe(vector.expected?.missingTaskRiskTier);
      expect(summary.interpretation.publishable).toBe(vector.expected?.publishable);
      if (vector.expected?.zeroBaselineDurationPairs) {
        expect(summary.tiers.map((tier) => tier.overhead.zeroBaselineDurationPairs)).toEqual(vector.expected.zeroBaselineDurationPairs);
      }
    });
  }
});
