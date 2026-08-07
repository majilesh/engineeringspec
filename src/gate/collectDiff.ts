import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ChangedFile, ChangeKind } from "./types.js";

const execFileAsync = promisify(execFile);

export function normalizeRepoPath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
}

export function parseNameStatus(output: string): ChangedFile[] {
  const changes: ChangedFile[] = [];
  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const tab = line.indexOf("\t");
    if (tab === -1) continue;
    const status = line.slice(0, tab).trim();
    const rest = line.slice(tab + 1);
    const code = status[0];
    if (code === "R" || code === "C") {
      const [fromPath, toPath] = rest.split("\t");
      if (!fromPath || !toPath) continue;
      changes.push({
        path: normalizeRepoPath(toPath),
        kind: "renamed",
        fromPath: normalizeRepoPath(fromPath),
      });
      continue;
    }
    const kind: ChangeKind | undefined =
      code === "A" ? "added" : code === "D" ? "deleted" : code === "M" || code === "T" ? "modified" : undefined;
    if (!kind) continue;
    changes.push({ path: normalizeRepoPath(rest.trim()), kind });
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
    const { stdout } = await execFileAsync("git", ["diff", "--name-status", "--find-renames", range], {
      cwd: options.cwd,
      maxBuffer: 16 * 1024 * 1024,
    });
    return parseNameStatus(stdout);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read git diff for ${range}: ${detail}`);
  }
}

export function changedFromPathList(paths: string[], kind: ChangeKind = "modified"): ChangedFile[] {
  return paths.map((path) => ({ path: normalizeRepoPath(path), kind }));
}
