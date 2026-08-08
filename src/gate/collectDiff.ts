import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ChangedFile, ChangeKind } from "./types.js";

const execFileAsync = promisify(execFile);

export class DiffParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiffParseError";
  }
}

export function normalizeRepoPath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
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
      changes.push({
        path: normalizeRepoPath(toPath),
        kind: "renamed",
        fromPath: normalizeRepoPath(fromPath),
      });
      continue;
    }
    changes.push({ path: normalizeRepoPath(rest.trim()), kind: parsed.kind });
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
        maxBuffer: 16 * 1024 * 1024,
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

export function changedFromPathList(paths: string[], kind: ChangeKind = "modified"): ChangedFile[] {
  return paths.map((path) => ({ path: normalizeRepoPath(path), kind }));
}
