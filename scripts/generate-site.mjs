import { mkdir, writeFile } from "node:fs/promises";
import { buildCatalogue, catalogueHtml } from "../dist/catalogue/catalogue.js";

const report = await buildCatalogue("docs/engineering-specs", { strict: true });
if (!report.valid) throw new Error("Cannot generate the site from an invalid catalogue");
await mkdir("site", { recursive: true });
await writeFile("site/catalogue.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile("site/explorer.html", catalogueHtml(report), "utf8");
