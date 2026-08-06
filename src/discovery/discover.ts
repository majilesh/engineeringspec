import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { minimatch } from "minimatch";

const ignoredDirectories = new Set([".git", "node_modules", "dist", "coverage"]);

export function isEngineeringSpecFilename(file: string): boolean {
  const name = path.basename(file);
  return (
    name === "ENGINEERING_SPEC.md" ||
    name.endsWith(".engineering-spec.md") ||
    name.endsWith(".engineeringspec.md")
  );
}

async function loadIgnorePatterns(root: string): Promise<string[]> {
  try {
    const source = await readFile(path.join(root, ".engineeringspecignore"), "utf8");
    return source
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function discoverEngineeringSpecs(root: string): Promise<string[]> {
  const absoluteRoot = path.resolve(root);
  const rootStat = await stat(absoluteRoot);
  if (rootStat.isFile()) return isEngineeringSpecFilename(absoluteRoot) ? [absoluteRoot] : [];
  if (!rootStat.isDirectory()) return [];

  const ignorePatterns = await loadIgnorePatterns(absoluteRoot);
  const files: string[] = [];

  async function walk(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(absoluteRoot, absolute).split(path.sep).join("/");
      if (ignorePatterns.some((pattern) => minimatch(relative, pattern, { dot: true }))) continue;
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile() && isEngineeringSpecFilename(entry.name)) files.push(absolute);
    }
  }

  await walk(absoluteRoot);
  return files.sort((left, right) => left.localeCompare(right));
}
