import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Build dist/ once so subprocess tests exercise the real CLI in an explicit
// working directory instead of changing this process's working directory.
export default function setup(): void {
  const root = fileURLToPath(new URL("../..", import.meta.url));
  execFileSync(process.execPath, [path.join(root, "node_modules", "typescript", "bin", "tsc"), "-p", "tsconfig.build.json"], {
    cwd: root,
    stdio: "inherit",
  });
}
