import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ChangedFile, ChangeKind } from "./types.js";

const execFileAsync = promisify(execFile);
const MAX_GIT_OUTPUT = 16 * 1024 * 1024;

export class DiffParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiffParseError";
  }
}

export function normalizeRepoPath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
}

export function assertSafeRepoPath(filePath: string): void {
  if (!filePath || /[\0\r\n]/u.test(filePath) || filePath.includes("\\")
    || filePath.startsWith("/") || filePath.split("/").includes("..")) {
    throw new DiffParseError(`Malformed or unsafe repository path ${JSON.stringify(filePath)}`);
  }
}

function kindFromStatus(status: string): { kind: ChangeKind; renameLike: boolean } | undefined {
  const code = status[0];
  if (code === "R" || code === "C") return { kind: "renamed", renameLike: true };
  if (code === "A") return { kind: "added", renameLike: false };
  if (code === "D") return { kind: "deleted", renameLike: false };
  if (code === "M" || code === "T") return { kind: "modified", renameLike: false };
  return undefined;
}

/**
 * Parse `git diff -z --name-status` output.
 * With `-z`, records are NUL-delimited: `STATUS\\0path\\0` or `STATUS\\0from\\0to\\0`.
 */
export function parseNameStatusZ(output: string): ChangedFile[] {
  const changes: ChangedFile[] = [];
  const parts = output.split("\0");
  // Trailing NUL produces a final empty part; ignore empty leading/trailing noise.
  let index = 0;
  while (index < parts.length) {
    const status = parts[index];
    if (status === undefined || status === "") {
      index += 1;
      continue;
    }
    const parsed = kindFromStatus(status);
    if (!parsed) {
      throw new DiffParseError(`Unrecognized git name-status code ${JSON.stringify(status)}`);
    }
    if (parsed.renameLike) {
      const fromPath = parts[index + 1];
      const toPath = parts[index + 2];
      if (!fromPath || !toPath) {
        throw new DiffParseError(`Malformed rename/copy status record ${JSON.stringify(status)}`);
      }
      assertSafeRepoPath(fromPath);
      assertSafeRepoPath(toPath);
      changes.push({
        path: normalizeRepoPath(toPath),
        kind: "renamed",
        fromPath: normalizeRepoPath(fromPath),
      });
      index += 3;
      continue;
    }
    const filePath = parts[index + 1];
    if (!filePath) {
      throw new DiffParseError(`Malformed name-status record ${JSON.stringify(status)}`);
    }
    assertSafeRepoPath(filePath);
    changes.push({ path: normalizeRepoPath(filePath), kind: parsed.kind });
    index += 2;
  }
  return changes;
}

/**
 * Parse classic newline/tab `git diff --name-status` output (tests and legacy callers).
 * Unknown or malformed records throw DiffParseError (fail closed).
 */
export function parseNameStatus(output: string): ChangedFile[] {
  const changes: ChangedFile[] = [];
  for (const [lineNumber, line] of output.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const tab = line.indexOf("\t");
    if (tab === -1) {
      throw new DiffParseError(`Malformed name-status line ${lineNumber + 1}: missing tab separator`);
    }
    const status = line.slice(0, tab).trim();
    const rest = line.slice(tab + 1);
    const parsed = kindFromStatus(status);
    if (!parsed) {
      throw new DiffParseError(`Unrecognized git name-status code ${JSON.stringify(status)} on line ${lineNumber + 1}`);
    }
    if (parsed.renameLike) {
      const [fromPath, toPath] = rest.split("\t");
      if (!fromPath || !toPath) {
        throw new DiffParseError(`Malformed rename/copy on line ${lineNumber + 1}`);
      }
      assertSafeRepoPath(fromPath);
      assertSafeRepoPath(toPath);
      changes.push({
        path: normalizeRepoPath(toPath),
        kind: "renamed",
        fromPath: normalizeRepoPath(fromPath),
      });
      continue;
    }
    const filePath = rest.trim();
    assertSafeRepoPath(filePath);
    changes.push({ path: normalizeRepoPath(filePath), kind: parsed.kind });
  }
  return changes;
}

export async function collectGitDiff(options: {
  base: string;
  head?: string;
  cwd?: string;
}): Promise<ChangedFile[]> {
  const head = options.head ?? "HEAD";
  const range = `${options.base}...${head}`;
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["diff", "-z", "--name-status", "--find-renames", range],
      {
        cwd: options.cwd,
        maxBuffer: MAX_GIT_OUTPUT,
        encoding: "utf8",
      },
    );
    return parseNameStatusZ(stdout);
  } catch (error) {
    if (error instanceof DiffParseError) throw error;
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read git diff for ${range}: ${detail}`);
  }
}

async function mergeBase(base: string, head: string, cwd?: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", ["merge-base", base, head], {
      cwd,
      maxBuffer: MAX_GIT_OUTPUT,
      encoding: "utf8",
    });
    const value = stdout.trim();
    if (!value) throw new Error("git merge-base returned no commit");
    return value;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to resolve merge base for ${base} and ${head}: ${detail}`);
  }
}

async function diffAgainstTree(options: {
  tree: string;
  cwd?: string;
  staged?: boolean;
}): Promise<ChangedFile[]> {
  const args = ["diff", "-z", "--name-status", "--find-renames"];
  if (options.staged) args.push("--cached");
  args.push(options.tree);
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd: options.cwd,
      maxBuffer: MAX_GIT_OUTPUT,
      encoding: "utf8",
    });
    return parseNameStatusZ(stdout);
  } catch (error) {
    if (error instanceof DiffParseError) throw error;
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read ${options.staged ? "staged" : "working tree"} diff against ${options.tree}: ${detail}`);
  }
}

async function untrackedFiles(cwd?: string): Promise<ChangedFile[]> {
  try {
    const { stdout } = await execFileAsync("git", ["ls-files", "-z", "--others", "--exclude-standard"], {
      cwd,
      maxBuffer: MAX_GIT_OUTPUT,
      encoding: "utf8",
    });
    return stdout
      .split("\0")
      .filter(Boolean)
      .map((filePath) => {
        assertSafeRepoPath(filePath);
        return { path: normalizeRepoPath(filePath), kind: "added" as const };
      });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to list untracked files: ${detail}`);
  }
}

async function gitObjectId(args: string[], cwd?: string): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    maxBuffer: MAX_GIT_OUTPUT,
    encoding: "utf8",
  });
  return stdout.trim();
}

/** Detect exact-content renames whose destination is still untracked without mutating the index. */
async function promoteUntrackedRenames(
  tracked: ChangedFile[],
  untracked: ChangedFile[],
  tree: string,
  cwd?: string,
): Promise<{ tracked: ChangedFile[]; untracked: ChangedFile[] }> {
  const deleted = tracked.filter((change) => change.kind === "deleted");
  if (deleted.length === 0 || untracked.length === 0) return { tracked, untracked };

  const deletedByObject = new Map<string, ChangedFile[]>();
  for (const change of deleted) {
    const object = await gitObjectId(["rev-parse", "--verify", `${tree}:${change.path}`], cwd);
    deletedByObject.set(object, [...(deletedByObject.get(object) ?? []), change]);
  }

  const promoted = new Map<string, ChangedFile>();
  const remainingUntracked: ChangedFile[] = [];
  for (const change of untracked) {
    const object = await gitObjectId(["hash-object", "--", change.path], cwd);
    const candidates = deletedByObject.get(object);
    const source = candidates?.shift();
    if (!source) {
      remainingUntracked.push(change);
      continue;
    }
    promoted.set(source.path, { path: change.path, kind: "renamed", fromPath: source.path });
  }

  return {
    tracked: tracked.flatMap((change) => promoted.has(change.path) ? [promoted.get(change.path)!] : [change]),
    untracked: remainingUntracked,
  };
}

/** Collect committed plus staged changes relative to the selected merge base. */
export async function collectGitStagedDiff(options: {
  base?: string;
  head?: string;
  cwd?: string;
} = {}): Promise<ChangedFile[]> {
  const head = options.head ?? "HEAD";
  const tree = options.base ? await mergeBase(options.base, head, options.cwd) : head;
  return diffAgainstTree({ tree, ...(options.cwd ? { cwd: options.cwd } : {}), staged: true });
}

/**
 * Collect the complete working state relative to the selected merge base.
 * Includes committed, staged, unstaged, deleted, renamed, and non-ignored untracked paths.
 */
export async function collectGitWorktreeDiff(options: {
  base?: string;
  head?: string;
  cwd?: string;
} = {}): Promise<ChangedFile[]> {
  const head = options.head ?? "HEAD";
  const tree = options.base ? await mergeBase(options.base, head, options.cwd) : head;
  const [tracked, untracked] = await Promise.all([
    diffAgainstTree({ tree, ...(options.cwd ? { cwd: options.cwd } : {}) }),
    untrackedFiles(options.cwd),
  ]);
  const promoted = await promoteUntrackedRenames(tracked, untracked, tree, options.cwd);
  const trackedPaths = new Set(promoted.tracked.flatMap((change) => [change.path, ...(change.fromPath ? [change.fromPath] : [])]));
  return [...promoted.tracked, ...promoted.untracked.filter((change) => !trackedPaths.has(change.path))];
}

export function changedFromPathList(paths: string[], kind: ChangeKind = "modified"): ChangedFile[] {
  return paths.map((filePath) => {
    assertSafeRepoPath(filePath);
    return { path: normalizeRepoPath(filePath), kind };
  });
}
