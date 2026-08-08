import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Resolve package.json version relative to this module (works from src/ and dist/). */
export function packageVersion(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  for (const candidate of [
    path.join(here, "../../package.json"),
    path.join(here, "../../../package.json"),
    path.join(here, "../package.json"),
  ]) {
    try {
      const version = (JSON.parse(readFileSync(candidate, "utf8")) as { version?: string }).version;
      if (typeof version === "string" && version.length > 0) return version;
    } catch {
      // try next candidate
    }
  }
  return "0.0.0-dev";
}
