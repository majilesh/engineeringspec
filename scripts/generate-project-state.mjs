import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import console from "node:console";
import { execFileSync } from "node:child_process";

export const notice = "This file is generated. Do not edit manually.";
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

export async function projectState(directory = root) {
  const pkg = JSON.parse(await readFile(path.join(directory, "package.json"), "utf8"));
  const { createProgram } = await import("../dist/cli/program.js");
  const { CURRENT_ACTION_SHA } = await import("../dist/adoption/releases.js");
  const { SUPPORTED_VERSION } = await import("../dist/model/constants.js");
  const program = createProgram(() => {});
  const options = (command) => command.options.map((option) => ({
    flags: option.flags,
    description: option.description,
    ...(option.argChoices ? { choices: option.argChoices } : {}),
  }));
  // The anchor is already reviewed. Read its package identity from Git, never infer it
  // from the workspace version or move the anchor to the current implementation.
  const anchorPackage = JSON.parse(execFileSync("git", ["show", `${CURRENT_ACTION_SHA}:package.json`], { cwd: directory, encoding: "utf8" }));
  const actionBuild = await readFile(path.join(directory, "scripts/build-action.mjs"), "utf8");
  const bundledNodeTarget = /target:\s*"(node\d+)"/u.exec(actionBuild)?.[1];
  if (!bundledNodeTarget) throw new Error("Cannot derive the Action's Node target from scripts/build-action.mjs");
  return {
    _generated: notice,
    package: { name: pkg.name, version: pkg.version, node: pkg.engines.node, description: pkg.description, homepage: pkg.homepage, repository: pkg.repository.url, license: pkg.license },
    specFormatVersion: SUPPORTED_VERSION,
    action: { reviewedAnchor: CURRENT_ACTION_SHA, anchorPackageVersion: anchorPackage.version, workspaceBundleVersion: pkg.version, bundledNodeTarget, adapterShell: "bash" },
    globalOptions: options(program),
    commands: program.commands.map((command) => ({ name: command.name(), description: command.description(), arguments: command.registeredArguments.map((argument) => ({ name: argument.name(), required: argument.required, variadic: argument.variadic })), options: options(command) })),
  };
}

export function releasePanel(state) {
  return `<!-- project-state:start -->\n        <!-- ${notice} -->\n        <p>The public package is <strong>${state.package.version}</strong>. Begin in dry-run or advisory mode, then add protected contract ownership and required checks when the workflow fits.</p>\n        <pre><code>npx --yes ${state.package.name}@${state.package.version} adopt . --quickstart \\\n  --maintainer @YOUR_GITHUB_USER_OR_TEAM --dry-run\n\nengineeringspec next\nengineeringspec work ES-change\nengineeringspec finish ES-change</code></pre>\n        <!-- project-state:end -->`;
}

export async function generatedOutputs(directory = root) {
  const state = await projectState(directory);
  const homepage = await readFile(path.join(directory, "site/index.html"), "utf8");
  const region = /<!-- project-state:start -->[\s\S]*?<!-- project-state:end -->/u;
  if (!region.test(homepage)) throw new Error("site/index.html is missing the generated release panel markers");
  const commandDoc = `<!-- ${notice} -->\n# CLI command metadata\n\nBuilt from src/cli/program.ts without executing command actions. Global options: ${state.globalOptions.map((option) => `\`${option.flags}\``).join(", ")}.\n\n${state.commands.map((command) => `## ${command.name}\n\n${command.description}\n\n${command.options.map((option) => `- \`${option.flags}\`: ${option.description}`).join("\n")}\n`).join("\n")}`;
  return new Map([
    ["docs/generated/version.md", `<!-- ${notice} -->\n# Current project state\n\n- Package: \`${state.package.name}@${state.package.version}\`\n- Supported Node.js: \`${state.package.node}\`\n- Contract format: \`${state.specFormatVersion}\` (independent of package release)\n- License: ${state.package.license}\n- Reviewed Action anchor: \`${state.action.reviewedAnchor}\`\n- Anchor package: \`${state.action.anchorPackageVersion}\`\n- Current workspace Action bundle: \`${state.action.workspaceBundleVersion}\`\n`],
    ["docs/generated/cli-commands.md", commandDoc],
    ["site/generated/project-state.json", json(state)],
    ["action/compatibility.json", json({ _generated: notice, ...state.action, supportedNode: state.package.node, specFormatVersion: state.specFormatVersion })],
    ["site/index.html", homepage.replace(region, releasePanel(state))],
  ]);
}

export async function generateProjectState({ directory = root, check = false } = {}) {
  const errors = [];
  for (const [file, expected] of await generatedOutputs(directory)) {
    const location = path.join(directory, file);
    if (check) {
      const actual = await readFile(location, "utf8").catch(() => null);
      if (actual !== expected) errors.push(`${file}: missing or stale; run npm run project:generate`);
    } else {
      await mkdir(path.dirname(location), { recursive: true });
      await writeFile(location, expected);
    }
  }
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const errors = await generateProjectState({ check: process.argv.includes("--check") });
    if (errors.length) { console.error(errors.join("\n")); process.exitCode = 1; }
    else console.log(process.argv.includes("--check") ? "Generated project state is current." : "Generated project state written.");
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
