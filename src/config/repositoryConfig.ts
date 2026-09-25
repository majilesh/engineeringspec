import { readFile } from "node:fs/promises";
import path from "node:path";
import { gitShowToplevel, readGitConfig, resolveCommitSha, resolveOriginHead, tryReadGitBlob } from "../gate/loadSpec.js";
import { canonicalJson } from "../normalizer/canonicalize.js";
import { validateTargetGlob } from "../path/targetGlob.js";
import { Codes } from "../diagnostics/codes.js";

export const REPOSITORY_CONFIG_PATH = "engineering-spec.json";
const MAX_CONFIG_BYTES = 1024 * 1024;

export type TrustedBaseRef = string & { readonly __trustedBaseRef: unique symbol };
export type ResolvedTrustedBaseCommit = string & { readonly __resolvedTrustedBaseCommit: unique symbol };
export function asTrustedBaseRef(value:string):TrustedBaseRef {
  if(!value||/[\0\r\n]/u.test(value)) throw new Error("TrustedBaseRef must be a non-empty Git ref");
  return value as TrustedBaseRef;
}

export interface TrustedVerifierMapping {
  argv: string[];
  workingDirectory?: string;
  timeoutSeconds?: number;
  network?: "deny" | "allow";
}

export type AdoptionMode = "advisory" | "standard" | "controlled";
export const ADOPTION_MODES: readonly AdoptionMode[] = ["advisory", "standard", "controlled"];

/** RFC 0014 repository policy. Globs use the restricted EngineeringSpec dialect. */
export interface RepositoryPolicy {
  governedPaths: string[];
  exemptPaths: string[];
  protectedPaths: string[];
  /** Paths that need a change contract in every mode; standing authority never satisfies them. */
  grantBeforeSpendPaths: string[];
}

export interface RepositoryConfig {
  $schema?: string;
  specDirectory: string;
  strict: boolean;
  trustedBase?: string;
  /** Absent means legacy exactly-one-claimant routing (RFC 0014 §1). */
  mode?: AdoptionMode;
  policy?: RepositoryPolicy;
  trustedVerifiers: Record<string, TrustedVerifierMapping>;
}

export interface ResolvedRepositoryConfig {
  config: RepositoryConfig;
  baseRef: TrustedBaseRef;
  baseSha: ResolvedTrustedBaseCommit;
  source: "trusted_base" | "defaults";
  path: string;
  workspaceDrift: boolean;
  warnings: string[];
}

export interface RepositoryConfigSummary {
  baseRef: string;
  baseSha: string;
  source: ResolvedRepositoryConfig["source"];
  path: string;
  workspaceDrift: boolean;
  warnings: string[];
  specDirectory: string;
  strict: boolean;
  trustedVerifierIds: string[];
}

const DEFAULT_CONFIG: RepositoryConfig = {
  specDirectory: "docs/engineering-specs",
  strict: true,
  trustedVerifiers: {},
};

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function safeRelative(value: unknown, label: string): string {
  if (typeof value !== "string" || !value || value.includes("\\") || path.posix.isAbsolute(value)
    || value.split("/").includes("..") || /[\0\r\n]/u.test(value)) {
    throw new Error(`${label} must be a safe repository-relative path`);
  }
  return value.replace(/\/$/u, "");
}

export function parseRepositoryConfig(text: string, label = REPOSITORY_CONFIG_PATH): RepositoryConfig {
  if (Buffer.byteLength(text, "utf8") > MAX_CONFIG_BYTES) throw new Error(`${label} exceeds the 1 MiB limit`);
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  const value = object(parsed, label);
  const allowed = new Set(["$schema", "specDirectory", "strict", "trustedBase", "mode", "policy", "trustedVerifiers"]);
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`${label} contains unknown property ${JSON.stringify(key)}`);
  const specDirectory = safeRelative(value.specDirectory ?? DEFAULT_CONFIG.specDirectory, `${label}.specDirectory`);
  if (typeof value.strict !== "undefined" && typeof value.strict !== "boolean") throw new Error(`${label}.strict must be a boolean`);
  if (typeof value.trustedBase !== "undefined" && (typeof value.trustedBase !== "string" || !value.trustedBase || /[\0\r\n]/u.test(value.trustedBase))) {
    throw new Error(`${label}.trustedBase must be a non-empty ref`);
  }
  if (typeof value.$schema !== "undefined" && typeof value.$schema !== "string") throw new Error(`${label}.$schema must be a string`);
  if (value.mode !== undefined && !(ADOPTION_MODES as readonly unknown[]).includes(value.mode)) {
    throw new Error(`${label}.mode must be one of ${ADOPTION_MODES.join(", ")}`);
  }
  const policy = value.policy === undefined ? undefined : parseRepositoryPolicy(value.policy, `${label}.policy`);
  const verifierObject = object(value.trustedVerifiers ?? {}, `${label}.trustedVerifiers`);
  const trustedVerifiers: Record<string, TrustedVerifierMapping> = {};
  for (const [id, raw] of Object.entries(verifierObject)) {
    if (!/^[A-Za-z][A-Za-z0-9_-]*#[A-Z][A-Z0-9_-]*$/u.test(id)) throw new Error(`${label}.trustedVerifiers contains invalid contract-plus-verifier identity ${JSON.stringify(id)}`);
    const mapping = object(raw, `${label}.trustedVerifiers.${id}`);
    const mappingAllowed = new Set(["argv", "workingDirectory", "timeoutSeconds", "network"]);
    for (const key of Object.keys(mapping)) if (!mappingAllowed.has(key)) throw new Error(`${label}.trustedVerifiers.${id} contains unknown property ${JSON.stringify(key)}`);
    if (!Array.isArray(mapping.argv) || mapping.argv.length === 0 || mapping.argv.some((part) => typeof part !== "string" || !part || /[\0\r\n]/u.test(part))) {
      throw new Error(`${label}.trustedVerifiers.${id}.argv must be a non-empty string array`);
    }
    if (mapping.timeoutSeconds !== undefined && (!Number.isInteger(mapping.timeoutSeconds) || Number(mapping.timeoutSeconds) < 1 || Number(mapping.timeoutSeconds) > 3600)) {
      throw new Error(`${label}.trustedVerifiers.${id}.timeoutSeconds must be an integer from 1 to 3600`);
    }
    if (mapping.network !== undefined && mapping.network !== "deny" && mapping.network !== "allow") throw new Error(`${label}.trustedVerifiers.${id}.network must be deny or allow`);
    trustedVerifiers[id] = {
      argv: [...mapping.argv] as string[],
      ...(mapping.workingDirectory === undefined ? {} : { workingDirectory: safeRelative(mapping.workingDirectory, `${label}.trustedVerifiers.${id}.workingDirectory`) }),
      ...(mapping.timeoutSeconds === undefined ? {} : { timeoutSeconds: Number(mapping.timeoutSeconds) }),
      ...(mapping.network === undefined ? {} : { network: mapping.network }),
    };
  }
  return {
    ...(typeof value.$schema === "string" ? { $schema: value.$schema } : {}),
    specDirectory,
    strict: value.strict === undefined ? true : value.strict,
    ...(typeof value.trustedBase === "string" ? { trustedBase: value.trustedBase } : {}),
    ...(value.mode === undefined ? {} : { mode: value.mode as AdoptionMode }),
    ...(policy ? { policy } : {}),
    trustedVerifiers,
  };
}

/** Thrown for trusted configuration that cannot be evaluated; carries a stable diagnostic code. */
export class RepositoryConfigError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = "RepositoryConfigError";
  }
}

export function parseRepositoryPolicy(raw: unknown, label = "policy"): RepositoryPolicy {
  const value = object(raw, label);
  const allowed = new Set(["governedPaths", "exemptPaths", "protectedPaths", "grantBeforeSpendPaths"]);
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`${label} contains unknown property ${JSON.stringify(key)}`);
  const globs = (key: keyof RepositoryPolicy, fallback: string[]): string[] => {
    const list = value[key] ?? fallback;
    if (!Array.isArray(list) || list.some((item) => typeof item !== "string")) throw new Error(`${label}.${key} must be an array of glob strings`);
    for (const glob of list as string[]) {
      const problem = validateTargetGlob(glob);
      if (problem) throw new RepositoryConfigError(`${label}.${key} glob ${JSON.stringify(glob)}: ${problem}`, Codes.glob);
    }
    return [...list as string[]];
  };
  return {
    governedPaths: globs("governedPaths", ["**"]),
    exemptPaths: globs("exemptPaths", []),
    protectedPaths: globs("protectedPaths", []),
    grantBeforeSpendPaths: globs("grantBeforeSpendPaths", []),
  };
}

export async function resolveRepositoryConfig(options: { base?: string; cwd?: string; enforcing?: boolean } = {}): Promise<ResolvedRepositoryConfig> {
  const root = await gitShowToplevel(options.cwd);
  const configuredBase = await readGitConfig("engineeringspec.trustedBase", root);
  const originHead = await resolveOriginHead(root);
  const selectedBase = options.base ?? configuredBase ?? originHead;
  const baseRef = selectedBase?asTrustedBaseRef(selectedBase):undefined;
  if (!baseRef) throw new Error("Trusted base is unresolved; pass --base, set git config engineeringspec.trustedBase, or configure origin/HEAD");
  const baseSha = await resolveCommitSha(baseRef, root) as ResolvedTrustedBaseCommit;
  const trustedText = await tryReadGitBlob(baseSha, REPOSITORY_CONFIG_PATH, root);
  const config = trustedText === undefined ? { ...DEFAULT_CONFIG, trustedVerifiers: {} } : parseRepositoryConfig(trustedText, `${baseSha}:${REPOSITORY_CONFIG_PATH}`);
  const baseMismatch = Boolean(config.trustedBase && config.trustedBase !== baseRef && config.trustedBase !== baseSha);
  if (baseMismatch && options.enforcing !== false) {
    const historicalHint=/^[0-9a-f]{40}$/u.test(baseRef)
      ? ` Use engineeringspec replay with --at ${baseRef} for explicit historical read-only evaluation; replay grants no authority and cannot write.`
      : "";
    throw new Error(`Trusted-base config expects ${JSON.stringify(config.trustedBase)} but authority was resolved from ${JSON.stringify(baseRef)} at ${baseSha}.${historicalHint}`);
  }
  let workspaceDrift = false;
  try {
    const workspace = parseRepositoryConfig(await readFile(path.join(root, REPOSITORY_CONFIG_PATH), "utf8"));
    workspaceDrift = canonicalJson(workspace) !== canonicalJson(config);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") workspaceDrift = true;
  }
  return {
    config,
    baseRef,
    baseSha,
    source: trustedText === undefined ? "defaults" : "trusted_base",
    path: REPOSITORY_CONFIG_PATH,
    workspaceDrift,
    warnings: [
      ...(workspaceDrift ? ["Workspace repository config differs from the trusted-base config and was ignored for authority."] : []),
      ...(baseMismatch ? [`Trusted-base config expects ${JSON.stringify(config.trustedBase)} but informational inspection used ${JSON.stringify(baseRef)}; no authority was granted.`] : []),
    ],
  };
}

export function summarizeRepositoryConfig(resolved: ResolvedRepositoryConfig): RepositoryConfigSummary {
  return {
    baseRef: resolved.baseRef,
    baseSha: resolved.baseSha,
    source: resolved.source,
    path: resolved.path,
    workspaceDrift: resolved.workspaceDrift,
    warnings: [...resolved.warnings],
    specDirectory: resolved.config.specDirectory,
    strict: resolved.config.strict,
    trustedVerifierIds: Object.keys(resolved.config.trustedVerifiers).sort(),
  };
}
