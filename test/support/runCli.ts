import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../../dist/cli.js", import.meta.url));

/** Run the built CLI in `cwd` without changing this test process's working directory. */
export function runCli(cwd: string, args: string[]): { code: number; out: string } {
  const result = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8" });
  if (result.error) throw result.error;
  return { code: result.status ?? 1, out: result.stdout };
}
