import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import console from "node:console";
import { notice, root } from "./generate-project-state.mjs";
import { buildCatalogue, catalogueHtml } from "../dist/catalogue/catalogue.js";

// Publish repository-relative diagnostic locations, independent of checkout path.
export function portablePaths(value, directory) {
  if (Array.isArray(value)) return value.map((item) => portablePaths(item, directory));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key,
    key === "file" && typeof item === "string" && path.isAbsolute(item)
      ? path.relative(directory, item).split(path.sep).join("/")
      : portablePaths(item, directory),
  ]));
}

export async function generateSite({ directory = root, check = false } = {}) {
  const report = portablePaths(await buildCatalogue(path.join(directory, "docs/engineering-specs"), { strict: true }), directory);
  report.directory = "docs/engineering-specs";
  if (!report.valid) throw new Error("Cannot generate the site from an invalid catalogue");
  const outputs = new Map([
    ["site/catalogue.json", `${JSON.stringify({ _generated: notice, ...report }, null, 2)}\n`],
    ["site/explorer.html", `<!-- ${notice} -->\n${catalogueHtml(report)}`],
  ]);
  const errors = [];
  for (const [file, expected] of outputs) {
    const location = path.join(directory, file);
    if (check) {
      if (await readFile(location, "utf8").catch(() => null) !== expected) errors.push(`${file}: missing or stale; run npm run site:generate`);
    } else {
      await mkdir(path.dirname(location), { recursive: true });
      await writeFile(location, expected, "utf8");
    }
  }
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  generateSite({ check: process.argv.includes("--check") }).then((errors) => {
    if (errors.length) { console.error(errors.join("\n")); process.exitCode = 1; }
  }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
