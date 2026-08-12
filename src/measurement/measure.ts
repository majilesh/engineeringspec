import { createHash } from "node:crypto";
import { isEngineeringSpecFilename } from "../discovery/discover.js";
import { collectGitDiff } from "../gate/collectDiff.js";
import { gateDiff } from "../gate/gate.js";
import { listGitTreePaths, readGitBlob, resolveCommitSha, resolveGitRelativeDirectory } from "../gate/loadSpec.js";
import type { EngineeringSpec, TargetSurface } from "../model/types.js";
import { compareCodePoints } from "../normalizer/canonicalize.js";
import { digest } from "../normalizer/digest.js";
import { normalize } from "../normalizer/normalize.js";
import { matchTargetGlob } from "../path/targetGlob.js";
import { applicableTargets } from "../query/applicability.js";
import { validateMarkdown } from "../validator/validateFile.js";

export type ScopeAuthorityBreadth = "finite" | "open_create_namespace" | "repository_wide";

export interface ScopeMeasurementReceipt {
  schemaVersion: "0.1";
  authority: "base_pinned_approved_contract";
  authorization: "none";
  contract: { id: string; revision: number; path: string; digest: string };
  baseSha: string;
  headSha: string;
  method: { unit: "repository_path"; version: "concrete-paths-v1" };
  authorityBreadth: ScopeAuthorityBreadth;
  counts: {
    approvedWritablePaths: number;
    actualChangedPaths: number;
    authorizedChangedPaths: number;
    unauthorizedPathsChanged: number;
  };
  digests: { approvedWritablePaths: string; actualChangedPaths: string; authorizedChangedPaths: string; unauthorizedPathsChanged: string };
  paths?: { approvedWritable: string[]; actualChanged: string[]; authorizedChanged: string[]; unauthorizedChanged: string[] };
  limitations: string[];
}

const WRITABLE = new Set<TargetSurface["changePolicy"]>(["modify", "create", "delete", "interface_only"]);
const CAN_CREATE = new Set<TargetSurface["changePolicy"]>(["modify", "create", "interface_only"]);

function setDigest(values: Iterable<string>): string {
  const body = `${[...new Set(values)].sort(compareCodePoints).join("\n")}\n`;
  return `sha256:${createHash("sha256").update(body, "utf8").digest("hex")}`;
}

function hasWildcard(pattern: string): boolean {
  return /[*?]/u.test(pattern);
}

function isWritablePath(spec: EngineeringSpec, file: string): boolean {
  const targets = applicableTargets(spec, file);
  return targets.some((target) => WRITABLE.has(target.changePolicy))
    && !targets.some((target) => target.changePolicy === "read_only" || target.changePolicy === "observe");
}

function breadth(spec: EngineeringSpec, basePaths: string[]): ScopeAuthorityBreadth {
  const writable = spec.targets.filter((target) => WRITABLE.has(target.changePolicy));
  if (writable.some((target) => target.paths.some((pattern) => pattern === "**" || pattern === "**/*"))) return "repository_wide";
  if (basePaths.length > 0 && basePaths.every((file) => writable.some((target) => target.paths.some((pattern) => matchTargetGlob(file, pattern))))) {
    return "repository_wide";
  }
  return writable.some((target) => CAN_CREATE.has(target.changePolicy) && target.paths.some(hasWildcard))
    ? "open_create_namespace"
    : "finite";
}

export async function measureScope(options: {
  contractId: string;
  specDirectory: string;
  base: string;
  head: string;
  strict?: boolean;
  includePaths?: boolean;
  cwd?: string;
}): Promise<ScopeMeasurementReceipt> {
  const [baseSha, headSha] = await Promise.all([
    resolveCommitSha(options.base, options.cwd),
    resolveCommitSha(options.head, options.cwd),
  ]);
  const directory = await resolveGitRelativeDirectory(options.specDirectory, options.cwd);
  const candidates = (await listGitTreePaths(baseSha, directory, options.cwd)).filter(isEngineeringSpecFilename);
  const matches: Array<{ path: string; spec: EngineeringSpec }> = [];
  for (const candidate of candidates) {
    const validation = await validateMarkdown(await readGitBlob(baseSha, candidate, options.cwd), `${baseSha}:${candidate}`, { resolveProfiles: false });
    const failed = !validation.spec || validation.diagnostics.some((item) => item.severity === "error")
      || Boolean(options.strict && validation.diagnostics.some((item) => item.severity === "warning"));
    if (failed) {
      const detail = validation.diagnostics.map((item) => `${item.severity} ${item.code}: ${item.message}`).join("; ");
      throw new Error(`Trusted base contract set failed validation at ${candidate}${detail ? `: ${detail}` : ""}`);
    }
    if (validation.spec!.metadata.id === options.contractId) matches.push({ path: candidate, spec: normalize(validation.spec!) });
  }
  if (matches.length !== 1) throw new Error(`Expected exactly one base-pinned contract ${JSON.stringify(options.contractId)}; found ${matches.length}`);
  const match = matches[0]!;
  if (match.spec.metadata.status !== "approved") throw new Error(`Contract ${options.contractId} is ${match.spec.metadata.status}, not approved`);

  const [basePaths, changed] = await Promise.all([
    listGitTreePaths(baseSha, ".", options.cwd),
    collectGitDiff({ base: baseSha, head: headSha, ...(options.cwd ? { cwd: options.cwd } : {}) }),
  ]);
  const report = gateDiff(match.spec, changed, { baseSha, headSha, specDigest: digest(match.spec), specSource: "base", requireStatus: ["approved"] });
  const actual = new Set(changed.flatMap((item) => item.kind === "renamed" && item.fromPath ? [item.fromPath, item.path] : [item.path]));
  const unauthorized = new Set(report.violations.map((item) => item.file));
  const authorized = new Set([...actual].filter((file) => !unauthorized.has(file)));
  const approved = new Set(basePaths.filter((file) => isWritablePath(match.spec, file)));
  for (const item of changed) if (item.kind === "added" && authorized.has(item.path)) approved.add(item.path);
  for (const item of changed) if (item.kind === "renamed" && authorized.has(item.path) && !basePaths.includes(item.path)) approved.add(item.path);
  if (authorized.size > approved.size) throw new Error("Measured authorized changed paths exceed approved writable paths");
  const authorityBreadth = breadth(match.spec, basePaths);
  const ordered = (values: Set<string>): string[] => [...values].sort(compareCodePoints);
  return {
    schemaVersion: "0.1",
    authority: "base_pinned_approved_contract",
    authorization: "none",
    contract: { id: match.spec.metadata.id, revision: match.spec.metadata.specRevision, path: match.path, digest: digest(match.spec) },
    baseSha,
    headSha,
    method: { unit: "repository_path", version: "concrete-paths-v1" },
    authorityBreadth,
    counts: {
      approvedWritablePaths: approved.size,
      actualChangedPaths: actual.size,
      authorizedChangedPaths: authorized.size,
      unauthorizedPathsChanged: unauthorized.size,
    },
    digests: {
      approvedWritablePaths: setDigest(approved),
      actualChangedPaths: setDigest(actual),
      authorizedChangedPaths: setDigest(authorized),
      unauthorizedPathsChanged: setDigest(unauthorized),
    },
    ...(options.includePaths ? { paths: { approvedWritable: ordered(approved), actualChanged: ordered(actual), authorizedChanged: ordered(authorized), unauthorizedChanged: ordered(unauthorized) } } : {}),
    limitations: [
      "Unsigned measurement evidence; this receipt grants no authorization and does not prove trusted checks passed.",
      ...(authorityBreadth === "finite" ? [] : ["Scope precision is not interpretable for open or repository-wide authority."]),
    ],
  };
}
