import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { compareCodePoints } from "../normalizer/canonicalize.js";

const execFileAsync = promisify(execFile);
const MAX_GIT_OUTPUT = 16 * 1024 * 1024;

export type SpecSource = "workspace" | "base";

export async function gitShowToplevel(cwd?: string): Promise<string> {
  const { stdout } = await execFileAsync("git", ["rev-parse", "--show-toplevel"], {
    cwd,
    encoding: "utf8",
  });
  return stdout.trim();
}

export async function resolveGitRelativePath(file: string, cwd?: string): Promise<string> {
  const root = await gitShowToplevel(cwd);
  const absolute = path.resolve(cwd ?? process.cwd(), file);
  const relative = path.relative(root, absolute).split(path.sep).join("/");
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path ${JSON.stringify(file)} is outside the git repository root`);
  }
  return relative;
}

export async function resolveGitRelativeDirectory(directory: string, cwd?: string): Promise<string> {
  const root = await gitShowToplevel(cwd);
  if (/[\0\r\n]/u.test(directory) || directory.split(/[\\/]/u).includes("..")) {
    throw new Error(`Directory ${JSON.stringify(directory)} is not a safe repository-relative path`);
  }
  if (path.isAbsolute(directory)) throw new Error(`Directory ${JSON.stringify(directory)} must be repository-relative`);
  const absolute = path.resolve(root, directory);
  const relative = path.relative(root, absolute).split(path.sep).join("/");
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path ${JSON.stringify(directory)} is outside the git repository root`);
  }
  return relative || ".";
}

export function parseGitPathListZ(output: string): string[] {
  if (output.length > 0 && !output.endsWith("\0")) throw new Error("Malformed git path list: missing NUL terminator");
  const paths = output.length === 0 ? [] : output.slice(0, -1).split("\0");
  const seen = new Set<string>();
  for (const file of paths) {
    if (!file || /[\ufffd\r\n]/u.test(file) || file.includes("\\") || path.posix.isAbsolute(file) || file.split("/").includes("..")) {
      throw new Error(`Malformed or unsafe git tree path ${JSON.stringify(file)}`);
    }
    if (seen.has(file)) throw new Error(`Duplicate git tree path ${JSON.stringify(file)}`);
    seen.add(file);
  }
  return paths.sort(compareCodePoints);
}

export async function listGitTreePaths(ref: string, directory: string, cwd?: string): Promise<string[]> {
  try {
    const args = ["ls-tree", "-r", "-z", "--name-only", ref];
    if (directory !== ".") args.push("--", `:(literal)${directory}`);
    const { stdout } = await execFileAsync("git", args, {
      cwd,
      maxBuffer: MAX_GIT_OUTPUT,
      encoding: "utf8",
    });
    return parseGitPathListZ(stdout);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to enumerate ${directory} from ${ref}: ${detail}`);
  }
}

export async function readGitBlob(ref: string, repoRelativePath: string, cwd?: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", ["show", `${ref}:${repoRelativePath}`], {
      cwd,
      maxBuffer: 4 * 1024 * 1024,
      encoding: "utf8",
    });
    return stdout;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read ${repoRelativePath} from ${ref}: ${detail}`);
  }
}

export async function tryReadGitBlob(ref: string, repoRelativePath: string, cwd?: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("git", ["show", `${ref}:${repoRelativePath}`], {
      cwd,
      maxBuffer: 4 * 1024 * 1024,
      encoding: "utf8",
    });
    return stdout;
  } catch (error) {
    const candidate = error as { stderr?: string };
    const detail = candidate.stderr ?? (error instanceof Error ? error.message : String(error));
    if (/does not exist in|exists on disk, but not in|Path .* does not exist/u.test(detail)) return undefined;
    throw new Error(`Unable to read ${repoRelativePath} from ${ref}: ${detail}`);
  }
}

export async function readGitConfig(key: string, cwd?: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("git", ["config", "--get", key], { cwd, encoding: "utf8" });
    return stdout.trim() || undefined;
  } catch (error) {
    const candidate = error as { code?: number };
    if (candidate.code === 1) return undefined;
    throw error;
  }
}

export async function resolveOriginHead(cwd?: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("git", ["symbolic-ref", "refs/remotes/origin/HEAD"], { cwd, encoding: "utf8" });
    const ref = stdout.trim().replace(/^refs\/remotes\//u, "");
    return ref || undefined;
  } catch {
    return undefined;
  }
}

export async function resolveCommitSha(ref: string, cwd?: string): Promise<string> {
  const { stdout } = await execFileAsync("git", ["rev-parse", ref], { cwd, encoding: "utf8" });
  return stdout.trim();
}
