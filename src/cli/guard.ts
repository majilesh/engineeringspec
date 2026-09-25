import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { resolveRepositoryConfig } from "../config/repositoryConfig.js";
import { assertSafeRepoPath } from "../gate/collectDiff.js";
import { gitShowToplevel } from "../gate/loadSpec.js";
import type { ChangedFile, ChangeKind } from "../gate/types.js";
import { guardVerdict, type GuardResult } from "../guard/guard.js";
import { selectSpecs } from "../routing/select.js";

export interface GuardRequest {
  paths: Array<{ path: string; kind?: ChangeKind }>;
  contract?: string;
  base?: string;
  cwd?: string;
}

/** Resolves symlinks (for example /var -> /private/var) for a path that may not exist yet. */
async function physical(absolute: string): Promise<string> {
  const pending: string[] = [];
  let current = absolute;
  for (;;) {
    try {
      return path.join(await realpath(current), ...pending.reverse());
    } catch {
      const parent = path.dirname(current);
      if (parent === current) return absolute;
      pending.push(path.basename(current));
      current = parent;
    }
  }
}

/** Repository-relative form of a proposed path, or undefined when it lies outside the repository. */
async function relativeToRoot(root: string, file: string, cwd: string): Promise<string | undefined> {
  const absolute = await physical(path.resolve(cwd, file));
  const relative = path.relative(await physical(root), absolute).split(path.sep).join("/");
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return undefined;
  return relative;
}

async function inferKind(root: string, file: string): Promise<ChangeKind> {
  try {
    await stat(path.join(root, file));
    return "modified";
  } catch {
    return "added";
  }
}

/**
 * Evaluates proposed edits against trusted-base authority without writing anything,
 * executing specification runners, or making network requests (RFC 0014 §9, CON-GUARD).
 * Paths outside the repository are not governed and are ignored.
 */
export async function guardChange(request: GuardRequest): Promise<GuardResult & { ignored: string[] }> {
  const cwd = request.cwd ?? process.cwd();
  const root = await gitShowToplevel(cwd);
  const changed: ChangedFile[] = [];
  const ignored: string[] = [];
  for (const item of request.paths) {
    const relative = await relativeToRoot(root, item.path, cwd);
    if (!relative) { ignored.push(item.path); continue; }
    assertSafeRepoPath(relative);
    changed.push({ path: relative, kind: item.kind ?? await inferKind(root, relative) });
  }
  const config = await resolveRepositoryConfig({ ...(request.base ? { base: request.base } : {}), cwd: root });
  if (changed.length === 0) {
    return { verdict: "allow", enforcement: { mode: config.config.mode ?? "legacy", outcome: "pass", enforced: false }, paths: [], reasons: [], ignored };
  }
  const report = await selectSpecs({
    directory: config.config.specDirectory,
    base: config.baseSha,
    changed,
    strict: config.config.strict,
    cwd: root,
    ...(request.contract ? { selector: { contract: request.contract } } : {}),
  });
  return { ...guardVerdict(report), ignored };
}
