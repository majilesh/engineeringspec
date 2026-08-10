import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { importBackstageCatalogue } from "../../src/architecture/backstage.js";

describe("Backstage architecture adapter", () => {
  it("emits a deterministic read-only map with provenance", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "es-architecture-"));
    const file = path.join(root, "catalog-info.yaml");
    await writeFile(file, `apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: revenue-api
  annotations:
    engineeringspec.org/paths: apps/api/**, packages/contracts/**
    engineeringspec.org/standards: PCI-DSS, OWASP-ASVS
spec:
  owner: team-revenue
  system: private-consumer
  dependsOn: [component:default/customer-data]
`);
    const result = await importBackstageCatalogue(file);
    expect(result).toMatchObject({ authority: "read_only", components: [{ id: "revenue-api", owner: "team-revenue", paths: ["apps/api/**", "packages/contracts/**"] }] });
    const schema = JSON.parse(await readFile("schemas/architecture-map-0.1.schema.json", "utf8")) as object;
    expect(new Ajv2020({ strict: true }).compile(schema)(result)).toBe(true);
  });

  it("rejects unsafe path mappings", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "es-architecture-"));
    const file = path.join(root, "catalog-info.yaml");
    await writeFile(file, `kind: Component\nmetadata:\n  name: bad\n  annotations:\n    engineeringspec.org/paths: ../private/**\nspec: {}\n`);
    await expect(importBackstageCatalogue(file)).rejects.toThrow("unsafe");
  });
});
