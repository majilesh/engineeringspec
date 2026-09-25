import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { Codes } from "../../src/diagnostics/codes.js";
import { isEngineeringSpecId } from "../../src/model/ids.js";
import { validateTargetGlob } from "../../src/path/targetGlob.js";

// RFC 0014 fixtures land before the semantics they test (CON-PHASE-ORDER).
// Parity and structure are enforced now; each behavioural vector stays a
// visible todo until the phase that implements it removes its `pending` flag.

const CONTRACT = "docs/engineering-specs/ES-routing-v2-adoption-modes.engineering-spec.md";
const INVENTORY_BLOCK = /```engineering-x-engineeringspec-conformance-inventory\n([\s\S]*?)```/u;
const DECISIONS = new Set(["selected", "standing", "exempt", "ungoverned", "uncovered", "ambiguous", "denied", "protected_unauthorized"]);
const CHANGE_DECISIONS = new Set(["over_budget"]);
const OUTCOMES = new Set(["pass", "fail", "error"]);
const PROVISIONAL_CODES = ["ESRT008", "ESRT009", "ESRT010", "ESRT011", "ESRT012", "ESRT013"];
const KNOWN_CODES = new Set([...Object.values(Codes), ...PROVISIONAL_CODES]);
const MODES = ["advisory", "standard", "controlled"] as const;

interface InventoryGroup { group: string; path: string; fixtures: string[] }
interface Pending { phase: number }
interface Target { id: string; path: string; policy: string }
interface Candidate { id: string; status: string; authorityKind?: "change" | "standing"; expiresAt?: string; profile?: string; specRevision?: number; changeBudget?: Record<string, number>; targets: Target[] }
interface Change { path: string; kind: "added" | "modified" | "deleted" | "renamed"; fromPath?: string; additions?: number; deletions?: number; binary?: boolean }
interface Policy { governedPaths?: string[]; exemptPaths?: string[]; protectedPaths?: string[]; grantBeforeSpendPaths?: string[] }
interface Selector { cli?: string; label?: string; branch?: string }
interface RoutingVector {
  name: string; pending?: Pending; policy?: Policy; selector?: Selector; baseTimestamp: string;
  candidates: Candidate[]; changed: Change[]; receipts?: Array<Record<string, unknown>>;
  expected: { decisions: string[]; codes: string[]; outcome: Record<string, string>; attribution?: Array<string | null>; changeDecisions?: string[] };
}
interface Manifest { format: string; formatVersion: string; group: string; kind: "routing" | "meta" | "document"; vectors: Array<RoutingVector & { references?: string[]; file?: string }> }

function inventory(): InventoryGroup[] {
  const match = readFileSync(CONTRACT, "utf8").match(INVENTORY_BLOCK);
  if (!match?.[1]) throw new Error(`${CONTRACT} has no conformance inventory block`);
  return parse(match[1]) as InventoryGroup[];
}

function manifest(group: InventoryGroup): Manifest {
  return JSON.parse(readFileSync(path.join(group.path, "manifest.json"), "utf8")) as Manifest;
}

function scenarios(group: InventoryGroup): Array<{ name: string; pending?: Pending }> {
  return readdirSync(group.path)
    .filter((file) => file.endsWith(".scenario.json"))
    .map((file) => JSON.parse(readFileSync(path.join(group.path, file), "utf8")) as { name: string; pending?: Pending });
}

function selectorId(selector: Selector, key: keyof Selector): string | undefined {
  const value = selector[key];
  if (value === undefined) return undefined;
  if (key === "label") return value.replace(/^engineeringspec:/u, "");
  if (key === "branch") return value.replace(/^es\//u, "").split("/")[0];
  return value;
}

function checkRoutingVector(vector: RoutingVector): void {
  const { expected } = vector;
  const expanded = vector.changed.flatMap((change) => change.kind === "renamed" ? [change.fromPath, change.path] : [change.path]);
  expect(expanded.every((item) => typeof item === "string")).toBe(true);
  expect(expected.decisions.every((decision) => DECISIONS.has(decision))).toBe(true);
  expect(expected.codes.every((code) => KNOWN_CODES.has(code))).toBe(true);
  expect([...expected.codes].sort()).toEqual(expected.codes);
  expect(Object.keys(expected.outcome).sort()).toEqual([...MODES].sort());
  expect(Object.values(expected.outcome).every((outcome) => OUTCOMES.has(outcome))).toBe(true);
  // Advisory reports every routing decision without blocking; only invalid trusted configuration errors.
  expect(["pass", "error"]).toContain(expected.outcome.advisory);
  if (expected.decisions.length > 0) expect(expected.decisions).toHaveLength(expanded.length);
  if (expected.attribution) expect(expected.attribution).toHaveLength(expected.decisions.length);
  if (expected.changeDecisions) expect(expected.changeDecisions.every((decision) => CHANGE_DECISIONS.has(decision))).toBe(true);
  if (expected.changeDecisions?.includes("over_budget")) expect(expected.codes).toContain("ESRT010");
  for (const candidate of vector.candidates) {
    expect(isEngineeringSpecId(candidate.id)).toBe(true);
    for (const target of candidate.targets) expect(validateTargetGlob(target.path)).toBeUndefined();
    if (candidate.authorityKind === "standing") expect(candidate.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u);
  }
  const policyGlobs = Object.values(vector.policy ?? {}).flat();
  const invalidGlobs = policyGlobs.filter((glob) => validateTargetGlob(glob) !== undefined);
  expect(invalidGlobs.length > 0).toBe(expected.codes.includes("ESPTH002"));
  if (vector.selector) {
    const keys = (Object.keys(vector.selector) as Array<keyof Selector>);
    const ids = keys.map((key) => selectorId(vector.selector!, key));
    const malformed = ids.some((id) => !isEngineeringSpecId(id));
    const conflicting = new Set(ids).size > 1;
    const resolvable = ids.every((id) => vector.candidates.some((candidate) => candidate.id === id));
    if (malformed || conflicting || !resolvable) expect(expected.codes).toContain("ESRT009");
  }
}

describe("routing v2 conformance inventory", () => {
  const groups = inventory();

  it("matches the approved contract inventory exactly", () => {
    const onDisk = readdirSync("conformance/routing-v2").sort();
    expect(groups.map((group) => path.basename(group.path)).sort()).toEqual(onDisk);
    for (const group of groups) {
      const data = manifest(group);
      expect(data.format).toBe("engineering-spec-routing-v2-conformance");
      const names = [...data.vectors.map((vector) => vector.name), ...scenarios(group).map((scenario) => scenario.name)];
      expect(new Set(names).size).toBe(names.length);
      expect(names.sort()).toEqual([...group.fixtures].sort());
    }
  });

  it("keeps every fixture structurally consistent", () => {
    for (const group of groups) {
      const data = manifest(group);
      for (const vector of data.vectors) {
        if (vector.pending) expect(Number.isInteger(vector.pending.phase) && vector.pending.phase >= 2 && vector.pending.phase <= 7).toBe(true);
        if (data.kind === "routing") checkRoutingVector(vector);
        for (const reference of vector.references ?? []) expect(existsSync(reference)).toBe(true);
        if (vector.file) expect(existsSync(path.join(group.path, vector.file))).toBe(true);
      }
    }
  });

  it("leaves the pre-existing conformance fixtures untouched by reference only", () => {
    const legacy = manifest(groups.find((group) => group.group === "legacy-compatibility")!);
    expect(legacy.kind).toBe("meta");
    expect(legacy.vectors.flatMap((vector) => vector.references ?? []).every((reference) => !reference.startsWith("conformance/routing-v2"))).toBe(true);
  });

  for (const group of groups) {
    describe(group.group, () => {
      const items = [...manifest(group).vectors, ...scenarios(group)];
      for (const item of items) {
        if (item.pending) it.todo(`${item.name} (phase ${item.pending.phase})`);
      }
    });
  }
});
