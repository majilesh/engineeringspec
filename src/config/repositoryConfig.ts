import { readFile } from "node:fs/promises";
import path from "node:path";
import { gitShowToplevel, readGitConfig, resolveCommitSha, resolveOriginHead, tryReadGitBlob } from "../gate/loadSpec.js";
import { canonicalJson } from "../normalizer/canonicalize.js";

export const REPOSITORY_CONFIG_PATH = "engineering-spec.json";
const MAX_CONFIG_BYTES = 1024 * 1024;

export interface TrustedVerifierMapping {
  argv: string[];
  workingDirectory?: string;
  timeoutSeconds?: number;
  network?: "deny" | "allow";
}

export interface RepositoryConfig {
  $schema?: string;
  specDirectory: string;
  strict: boolean;
  trustedBase?: string;
  trustedVerifiers: Record<string, TrustedVerifierMapping>;
}

export interface ResolvedRepositoryConfig {
  config: RepositoryConfig;
  baseRef: string;
  baseSha: string;
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
  const allowed = new Set(["$schema", "specDirectory", "strict", "trustedBase", "trustedVerifiers"]);
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`${label} contains unknown property ${JSON.stringify(key)}`);
  const specDirectory = safeRelative(value.specDirectory ?? DEFAULT_CONFIG.specDirectory, `${label}.specDirectory`);
  if (typeof value.strict !== "undefined" && typeof value.strict !== "boolean") throw new Error(`${label}.strict must be a boolean`);
  if (typeof value.trustedBase !== "undefined" && (typeof value.trustedBase !== "string" || !value.trustedBase || /[\0\r\n]/u.test(value.trustedBase))) {
    throw new Error(`${label}.trustedBase must be a non-empty ref`);
  }
  if (typeof value.$schema !== "undefined" && typeof value.$schema !== "string") throw new Error(`${label}.$schema must be a string`);
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
    trustedVerifiers,
  };
}

export async function resolveRepositoryConfig(options: { base?: string; cwd?: string; enforcing?: boolean } = {}): Promise<ResolvedRepositoryConfig> {
  const root = await gitShowToplevel(options.cwd);
  const configuredBase = await readGitConfig("engineeringspec.trustedBase", root);
  const originHead = await resolveOriginHead(root);
  const baseRef = options.base ?? configuredBase ?? originHead;
  if (!baseRef) throw new Error("Trusted base is unresolved; pass --base, set git config engineeringspec.trustedBase, or configure origin/HEAD");
  const baseSha = await resolveCommitSha(baseRef, root);
  const trustedText = await tryReadGitBlob(baseSha, REPOSITORY_CONFIG_PATH, root);
  const config = trustedText === undefined ? { ...DEFAULT_CONFIG, trustedVerifiers: {} } : parseRepositoryConfig(trustedText, `${baseSha}:${REPOSITORY_CONFIG_PATH}`);
  const baseMismatch = Boolean(config.trustedBase && config.trustedBase !== baseRef && config.trustedBase !== baseSha);
  if (baseMismatch && options.enforcing !== false) {
    throw new Error(`Trusted-base config expects ${JSON.stringify(config.trustedBase)} but authority was resolved from ${JSON.stringify(baseRef)}`);
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
