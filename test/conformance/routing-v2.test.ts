import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { adoptRepository } from "../../src/cli/adopt.js";
import { parseRepositoryPolicy, RepositoryConfigError, type AdoptionMode } from "../../src/config/repositoryConfig.js";
import { Codes } from "../../src/diagnostics/codes.js";
import type { ChangedFile } from "../../src/gate/types.js";
import { isEngineeringSpecId } from "../../src/model/ids.js";
import type { EngineeringSpec, TargetSurface } from "../../src/model/types.js";
import { validateTargetGlob } from "../../src/path/targetGlob.js";
import { enforcementFor, evaluatePolicyRouting, selectorSources } from "../../src/policy/evaluate.js";
import { classifyGovernanceChanges } from "../../src/routing/governance.js";
import { partitionSpecificationChanges, selectSpecs, unsafeMixedClosureDiagnostic } from "../../src/routing/select.js";
import type { LoadedRoutingCandidate } from "../../src/routing/types.js";
import { validateFile } from "../../src/validator/validateFile.js";
import { canonicalJson } from "../../src/normalizer/canonicalize.js";
import { normalize } from "../../src/normalizer/normalize.js";
import { runCli } from "../support/runCli.js";

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
      const data = manifest(group);
      for (const item of [...data.vectors, ...scenarios(group)]) {
        if (item.pending) it.todo(`${item.name} (phase ${item.pending.phase})`);
        else if (SCENARIOS[item.name]) it(item.name, SCENARIOS[item.name]!);
        else if (data.kind === "routing") it(item.name, () => assertRoutingVector(item as RoutingVector));
        else if (data.kind === "meta" && LEGACY[item.name]) it(item.name, LEGACY[item.name]!);
        else if (data.kind === "document") it(item.name, () => assertDocument(group, item as DocumentVector));
        else it(item.name, () => { throw new Error(`No active runner for ${group.group}/${item.name}`); });
      }
    });
  }
});

// ---- Active runners. They call production functions only; no routing logic is re-implemented here.

const SPEC_DIRECTORY = "docs/engineering-specs";

function loadedCandidate(candidate: Candidate, index: number): LoadedRoutingCandidate {
  const spec: EngineeringSpec = {
    metadata: {
      specFormat: "engineering-spec", specFormatVersion: "0.1", specRevision: candidate.specRevision ?? 1,
      id: candidate.id, title: candidate.id, status: candidate.status as EngineeringSpec["metadata"]["status"], owners: [{ team: "test" }],
      ...(candidate.profile ? { profiles: [{ name: candidate.profile, version: "0.1" }] } : {}),
      ...(candidate.authorityKind ? { authorityKind: candidate.authorityKind } : {}),
      ...(candidate.expiresAt ? { expiresAt: candidate.expiresAt } : {}),
      ...(candidate.changeBudget ? { changeBudget: candidate.changeBudget } : {}),
    },
    sourceRefs: [],
    targets: candidate.targets.map((target) => ({ id: target.id, paths: [target.path], changePolicy: target.policy as TargetSurface["changePolicy"] })),
    verification: [],
    prose: [],
  };
  return { path: `${SPEC_DIRECTORY}/${index}-${candidate.id}.engineering-spec.md`, digest: `sha256:${candidate.id}`, spec };
}

function evaluateVector(vector: RoutingVector, mode: AdoptionMode) {
  let policy;
  try {
    policy = parseRepositoryPolicy(vector.policy ?? {});
  } catch (error) {
    if (!(error instanceof RepositoryConfigError)) throw error;
    return { decisions: [] as string[], codes: [error.code], attribution: [] as Array<string | null>, changeDecisions: [] as string[], outcome: enforcementFor(mode, false, true).outcome };
  }
  const changed = vector.changed as ChangedFile[];
  expect(classifyGovernanceChanges(SPEC_DIRECTORY, changed)).not.toBe("contract_only");
  // Vectors never carry workspace contract bodies, so a mixed change is never an exact monotonic close.
  const mixed = partitionSpecificationChanges(SPEC_DIRECTORY, changed).mixed ? [unsafeMixedClosureDiagnostic()] : [];
  // Vectors use the conventional opt-in prefixes; label and branch selectors are off without them.
  const selector = vector.selector
    ? selectorSources({ ...(vector.selector.cli ? { contract: vector.selector.cli } : {}), labels: vector.selector.label ? [vector.selector.label] : [], ...(vector.selector.branch ? { branch: vector.selector.branch } : {}) }, { label: "engineeringspec:", branch: "es/" })
    : undefined;
  const counted = vector.changed.some((change) => change.additions !== undefined || change.binary);
  const changedLines = vector.changed.reduce((sum, change) => sum + (change.binary ? 0 : (change.additions ?? 0) + (change.deletions ?? 0)), 0);
  const evaluation = evaluatePolicyRouting({
    mode, policy, specDirectory: SPEC_DIRECTORY, candidates: vector.candidates.map(loadedCandidate), changed, baseTimestamp: vector.baseTimestamp,
    ...(selector ? { selector } : {}),
    ...(counted ? { changedLines } : {}),
  });
  const diagnostics = [...evaluation.diagnostics, ...mixed].filter((item) => item.severity !== "info");
  return {
    decisions: evaluation.routes.map((route) => route.decision),
    codes: [...new Set(diagnostics.map((item) => item.code))].sort(),
    attribution: evaluation.routes.map((route) => route.selected?.specId ?? null),
    changeDecisions: evaluation.changeDecisions ?? [],
    outcome: enforcementFor(mode, evaluation.authorized && mixed.length === 0).outcome,
  };
}

function assertRoutingVector(vector: RoutingVector): void {
  const results = MODES.map((mode) => evaluateVector(vector, mode));
  for (const [index, mode] of MODES.entries()) {
    const result = results[index]!;
    expect(result.decisions, `${mode} decisions`).toEqual(results[0]!.decisions);
    expect(result.decisions, `${mode} decisions`).toEqual(vector.expected.decisions);
    expect(result.codes, `${mode} codes`).toEqual(vector.expected.codes);
    expect(result.outcome, `${mode} outcome`).toBe(vector.expected.outcome[mode]);
    if (vector.expected.attribution) expect(result.attribution, `${mode} attribution`).toEqual(vector.expected.attribution);
    if (vector.expected.changeDecisions) expect(result.changeDecisions, `${mode} change decisions`).toEqual(vector.expected.changeDecisions);
  }
}

function git(root: string, args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
}

async function commitAll(root: string, message: string): Promise<string> {
  git(root, ["add", "."]);
  git(root, ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", message]);
  return git(root, ["rev-parse", "HEAD"]);
}

function contractMarkdown(id: string, status: string, targets: Array<{ id: string; path: string; policy: string }>): string {
  return `---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ${id}
title: ${id}
status: ${status}
owners: [{team: test}]
---

\`\`\`engineering-source-refs
- {id: SRC-1, type: other, ref: fixture}
\`\`\`

\`\`\`engineering-targets
${targets.map((target) => `- {id: ${target.id}, paths: ["${target.path}"], change_policy: ${target.policy}}`).join("\n")}
\`\`\`

\`\`\`engineering-constraints
- {id: CON-1, level: should, statement: Fixture., enforcement: {kind: test, verifier_ref: VER-1}}
\`\`\`

\`\`\`engineering-verification
- {id: VER-1, proves: [CON-1], kind: test}
\`\`\`
`;
}

/** A repository whose trusted base has engineering-spec.json without `mode`: legacy routing must apply. */
async function legacyRepository(candidates: Array<{ id: string; status: string; targets: Array<{ id: string; path: string; policy: string }> }>): Promise<{ root: string; base: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "es-routing-v2-legacy-"));
  await mkdir(path.join(root, "specs"));
  await writeFile(path.join(root, "engineering-spec.json"), JSON.stringify({ specDirectory: "specs", strict: false, trustedVerifiers: {} }));
  for (const [index, candidate] of candidates.entries()) {
    await writeFile(path.join(root, "specs", `${index}-${candidate.id}.engineering-spec.md`), contractMarkdown(candidate.id, candidate.status, candidate.targets));
  }
  git(root, ["init", "-q"]);
  return { root, base: await commitAll(root, "base") };
}

const routingCodes = (codes: string[]): string[] => codes.filter((code) => code.startsWith("ESRT") || code.startsWith("ESG"));

interface LegacyRoutingVector { name: string; candidates: Array<{ id: string; status: string; targets: Target[] }>; changed: ChangedFile[]; expected: { decisions: string[]; codes: string[]; changedDigest: string } }

const LEGACY: Record<string, () => Promise<void>> = {
  "existing-routing-unchanged": async () => {
    const vectors = JSON.parse(readFileSync("conformance/routing/manifest.json", "utf8")) as LegacyRoutingVector[];
    for (const vector of vectors) {
      const { root, base } = await legacyRepository(vector.candidates);
      const report = await selectSpecs({ directory: "specs", base, changed: vector.changed, cwd: root });
      expect(report.enforcement, vector.name).toMatchObject({ mode: "legacy", enforced: true });
      expect(report.routes.map((route) => route.decision), vector.name).toEqual(vector.expected.decisions);
      expect(routingCodes(report.diagnostics.map((item) => item.code)), vector.name).toEqual(routingCodes(vector.expected.codes));
      expect(report.changedDigest, vector.name).toBe(vector.expected.changedDigest);
    }
  },
  "existing-governance-unchanged": async () => {
    const vectors = JSON.parse(readFileSync("conformance/governance/manifest.json", "utf8")) as Array<{ directory: string; changed: ChangedFile[]; expected: string }>;
    for (const vector of vectors) expect(classifyGovernanceChanges(vector.directory, vector.changed)).toBe(vector.expected);
    const { root, base } = await legacyRepository([{ id: "ES-a", status: "approved", targets: [{ id: "TARGET-1", path: "src/**", policy: "modify" }] }]);
    const report = await selectSpecs({ directory: "specs", base, cwd: root, allowContractOnly: true, changed: [{ path: "specs/0-ES-a.engineering-spec.md", kind: "modified" }] });
    expect(report.governance.classification).toBe("contract_only");
    expect(report.enforcement).toMatchObject({ mode: "legacy", outcome: "pass" });
  },
  "existing-authority-diff-unchanged": async () => {
    const { root, base } = await legacyRepository([{ id: "ES-a", status: "approved", targets: [{ id: "TARGET-1", path: "src/**", policy: "modify" }] }]);
    const spec = path.join(root, "specs", "0-ES-a.engineering-spec.md");
    await writeFile(spec, (await readFile(spec, "utf8")).replace("status: approved", "status: implemented"));
    await mkdir(path.join(root, "src"));
    await writeFile(path.join(root, "src", "a.ts"), "export const a = 1;\n");
    const report = await selectSpecs({ directory: "specs", base, cwd: root, allowContractOnly: true });
    expect(report.governance.classification).toBe("implementation_with_monotonic_close");
    expect(report.valid).toBe(true);
    expect(report.enforcement).toMatchObject({ mode: "legacy", outcome: "pass" });
  },
  "existing-sequencing-unchanged": async () => {
    const expected = (JSON.parse(readFileSync("conformance/expected-results/manifest.json", "utf8")) as { fixtures: Array<{ file: string; valid: boolean; codes: string[] }> })
      .fixtures.filter((fixture) => fixture.file.startsWith("authority-sequencing/"));
    expect(expected).toHaveLength(2);
    for (const fixture of expected) {
      const result = await validateFile(path.join("conformance", fixture.file), { resolveProfiles: false });
      expect(result.valid).toBe(fixture.valid);
      expect(result.diagnostics.map((item) => item.code)).toEqual(expect.arrayContaining(fixture.codes));
    }
  },
};

interface DocumentVector { name: string; file: string; expected: { valid: boolean; codes?: string[]; metadata?: Record<string, unknown>; canonicalBytes?: string } }

async function assertDocument(group: InventoryGroup, vector: DocumentVector): Promise<void> {
  const result = await validateFile(path.join(group.path, vector.file), { resolveProfiles: false });
  expect(result.valid).toBe(vector.expected.valid);
  if (vector.expected.codes) expect([...new Set(result.diagnostics.filter((item) => item.severity !== "info").map((item) => item.code))].sort()).toEqual(vector.expected.codes);
  if (!vector.expected.valid) return;
  const normalized = normalize(result.spec!);
  if (vector.expected.metadata) expect(normalized.metadata).toMatchObject(vector.expected.metadata);
  if (vector.expected.canonicalBytes) expect(canonicalJson(normalized)).toBe(readFileSync(path.join(group.path, vector.expected.canonicalBytes), "utf8"));
}

const SCENARIOS: Record<string, () => Promise<void>> = {
  "adoption-pr-advisory-passes": async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "es-routing-v2-adopt-"));
    await writeFile(path.join(root, "README.md"), "# fixture\n");
    git(root, ["init", "-q"]);
    const base = await commitAll(root, "base");
    await adoptRepository({ root, quickstart: true, maintainer: "@acme/platform" });
    await commitAll(root, "adopt");
    const config = JSON.parse(await readFile(path.join(root, "engineering-spec.json"), "utf8")) as { mode?: string };
    expect(config.mode).toBe("advisory");
    const workflow = await readFile(path.join(root, ".github", "workflows", "engineering-spec.yml"), "utf8");
    expect(workflow).toContain("bootstrap-mode: advisory");
    const result = runCli(root, ["select", "docs/engineering-specs", "--base", base, "--allow-contract-only", "--strict", "--bootstrap-mode", "advisory", "--format", "json"]);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.out)).toMatchObject({ valid: false, enforcement: { mode: "bootstrap_advisory", outcome: "pass", enforced: false, bootstrap: "honored" } });
  },
};
