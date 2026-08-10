import { lstat, readFile, writeFile } from "node:fs/promises";
import type { Status } from "../model/types.js";
import { validateMarkdown } from "../validator/validateFile.js";

const MAX_TRANSITION_BYTES = 1024 * 1024;
const ALLOWED = new Map<Status, Status[]>([
  ["draft", ["proposed", "rejected"]],
  ["proposed", ["approved", "rejected"]],
  ["approved", ["implemented", "superseded", "rejected"]],
]);

export interface TransitionResult {
  file: string;
  from: Status;
  to: Status;
  changed: boolean;
  written: boolean;
  preview: string;
}

export async function transitionStatus(file: string, to: Status, write = false): Promise<TransitionResult> {
  const details = await lstat(file);
  if (!details.isFile() || details.size > MAX_TRANSITION_BYTES) throw new Error("Transition input must be a bounded EngineeringSpec file");
  const source = await readFile(file, "utf8");
  const before = await validateMarkdown(source, file);
  if (!before.spec || before.diagnostics.some((item) => item.severity === "error")) throw new Error("Transition input must validate before editing");
  const from = before.spec.metadata.status;
  if (from === to) return { file, from, to, changed: false, written: false, preview: `status: ${from}` };
  if (!(ALLOWED.get(from) ?? []).includes(to)) throw new Error(`Lifecycle transition ${from} -> ${to} is not allowed`);
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/u);
  if (!frontmatter) throw new Error("EngineeringSpec frontmatter was not found");
  const matches = [...frontmatter[1]!.matchAll(/^status:[ \t]*([^\r\n]+)(?=\r?$)/gmu)];
  if (matches.length !== 1) throw new Error("Frontmatter must contain exactly one scalar status field");
  const updatedFrontmatter = frontmatter[0].replace(/^status:[ \t]*[^\r\n]+(?=\r?$)/mu, `status: ${to}`);
  const updated = `${updatedFrontmatter}${source.slice(frontmatter[0].length)}`;
  const after = await validateMarkdown(updated, file);
  if (!after.spec || after.spec.metadata.status !== to || after.diagnostics.some((item) => item.severity === "error")) throw new Error("Transition output did not validate");
  if (write) await writeFile(file, updated, "utf8");
  return { file, from, to, changed: true, written: write, preview: `- status: ${from}\n+ status: ${to}` };
}
