import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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

export async function resolveCommitSha(ref: string, cwd?: string): Promise<string> {
  const { stdout } = await execFileAsync("git", ["rev-parse", ref], { cwd, encoding: "utf8" });
  return stdout.trim();
}
