import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import process from "node:process";
import console from "node:console";
import { spawnSync } from "node:child_process";
import { parse as parseYaml } from "yaml";
import { generateProjectState, projectState, root } from "./generate-project-state.mjs";

const read = (file, directory = root) => readFile(path.join(directory, file), "utf8");
const parseJson = async (file, directory) => JSON.parse(await read(file, directory));
export async function walk(directory) {
  const files = [];
  for (const item of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name < b.name ? -1 : 1)) {
    const location = path.join(directory, item.name);
    if (item.isDirectory()) files.push(...await walk(location));
    else if (item.isFile()) files.push(location);
  }
  return files;
}

export function versionErrors(text, file, state, config) {
  const errors = [];
  const lineAt = (match) => text.slice(0, match.index).split("\n").pop() + text.slice(match.index).split("\n")[0];
  for (const match of text.matchAll(/(?<![\w.])v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\b/gu)) {
    if (match[1] !== state.package.version && !(config.versionExceptions[file] ?? []).includes(lineAt(match))) errors.push(`${file}: stale release ${match[1]}`);
  }
  for (const match of text.matchAll(/majilesh\/engineeringspec@([\w.-]+)/gu)) {
    if (match[1] !== state.action.reviewedAnchor && !(config.historicalActionPins[file] ?? []).includes(lineAt(match))) errors.push(`${file}: unreviewed or stale Action ref ${match[1]}`);
  }
  return [...new Set(errors)];
}

function decode(text) {
  return text.replace(/&(?:amp|lt|gt|quot|#39);/gu, (entity) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" })[entity]);
}

export function documentedCommands(text) {
  const blocks = [...text.matchAll(/```[^\n]*\n([\s\S]*?)```/gu), ...text.matchAll(/<pre[^>]*>([\s\S]*?)<\/pre>/gu)].map((match) => decode(match[1].replace(/<\/?code[^>]*>/gu, "")));
  // Inline examples are inspected only when the complete span starts with a CLI invocation.
  blocks.push(...[...text.matchAll(/`([^`\n]+)`/gu)].map((match) => match[1]).filter((span) => /^(?:engineeringspec|npx\s|node\s+(?:\.\/)?dist\/cli\.js)\b/u.test(span)));
  const commands = [];
  for (const block of blocks) {
    for (const line of block.replace(/\\\r?\n\s*/gu, " ").split("\n")) {
      const invocation = /(?:^|\s)(?:engineeringspec|@engineeringspec\/cli(?:@[\w.-]+)?|node\s+(?:\.\/)?dist\/cli\.js)\s+(.+)/u.exec(line);
      if (invocation) commands.push(invocation[1].replace(/\s+#.*$/u, "").split(/\s+(?:&&|\|\||\||>|2>|;)\s*/u)[0]);
    }
  }
  return [...new Set(commands)];
}

export function commandErrors(text, file, state) {
  const errors = [];
  for (const invocation of documentedCommands(text)) {
    const tokens = invocation.match(/'[^']*'|"[^"]*"|[^\s]+/gu) ?? [];
    const name = tokens[0]?.startsWith("-") ? tokens.find((token) => state.commands.some((candidate) => candidate.name === token)) ?? tokens[0] : tokens[0];
    if (!name || name.startsWith("<")) continue;
    const command = state.commands.find((candidate) => candidate.name === name);
    if (!command && !name.startsWith("-")) { errors.push(`${file}: unknown CLI command ${name}`); continue; }
    const options = [...state.globalOptions, ...(command?.options ?? []), { flags: "-h, --help" }];
    const supported = new Set(options.flatMap((option) => option.flags.match(/--?[\w-]+/gu) ?? []));
    for (const [index, token] of tokens.entries()) {
      if (!/^--?[a-z]/iu.test(token)) continue;
      const flag = token.split("=")[0];
      if (!supported.has(flag)) errors.push(`${file}: unknown option ${flag} for ${name}`);
      const option = options.find((candidate) => (candidate.flags.match(/--?[\w-]+/gu) ?? []).includes(flag));
      const value = (token.includes("=") ? token.slice(token.indexOf("=") + 1) : tokens[index + 1])?.replace(/^['"]|['"]$/gu, "");
      if (option?.choices && value && /^[a-z]+$/iu.test(value) && !option.choices.includes(value)) errors.push(`${file}: unsupported ${flag} value ${value} for ${name}`);
    }
  }
  return [...new Set(errors)];
}

export function ruleErrors(text, file, rules, exceptions = {}) {
  const prose = decode(text).replace(/<[^>]+>/gu, "");
  return rules.filter((rule) => prose.toLowerCase().includes(rule.toLowerCase()) && !(exceptions[file] ?? []).includes(rule)).map((rule) => `${file}: prohibited phrase ${JSON.stringify(rule)}`);
}

export function schemaErrors(spec, schema, constants) {
  const errors = [];
  const version = schema.$defs.metadata.properties.specFormatVersion.const;
  if (constants !== version || !spec.includes(`EngineeringSpec ${version}`) || !schema.$id.includes(`/schemas/${version}/`)) errors.push("SPEC/schema/model format version mismatch");
  for (const term of [...schema.$defs.target.properties.changePolicy.enum, ...schema.$defs.metadata.properties.status.enum]) {
    if (!spec.includes(`\`${term}\``)) errors.push(`SPEC.md does not define schema term ${term}`);
  }
  return errors;
}

export function packageIdentityErrors(lock, state) {
  return lock.version === state.package.version && lock.packages?.[""]?.version === state.package.version && lock.name === state.package.name && lock.packages?.[""]?.name === state.package.name ? [] : ["package-lock root identity differs from package.json"];
}

export function actionMetadataErrors(action, metadata, state) {
  return [
    ...(action.runs?.using === "composite" && action.runs.steps.some((step) => step.shell === "bash" && step.run?.includes("action/cli.mjs")) ? [] : ["Action no longer runs the reviewed bundle through bash"]),
    ...(metadata.reviewedAnchor === state.action.reviewedAnchor && metadata.anchorPackageVersion === state.action.anchorPackageVersion && metadata.workspaceBundleVersion === state.package.version && metadata.supportedNode === state.package.node && metadata.bundledNodeTarget === state.action.bundledNodeTarget && metadata.specFormatVersion === state.specFormatVersion ? [] : ["Action compatibility metadata differs from canonical state"]),
  ];
}

export async function exampleErrors(directory = root) {
  const { validateFile } = await import("../dist/validator/validateFile.js");
  const errors = [];
  let count = 0;
  let positives = 0;
  for (const file of await walk(path.join(directory, "examples"))) {
    if (!/\.(?:engineering-spec|engineeringspec)\.md$/u.test(file)) continue;
    count++;
    const relative = path.relative(directory, file);
    const result = await validateFile(file, { repositoryRoot: directory, strictExternal: true });
    if (relative.startsWith("examples/invalid/")) {
      if (result.valid) errors.push(`${relative}: negative example unexpectedly passed`);
    } else {
      positives++;
      errors.push(...result.diagnostics.filter((item) => item.severity === "error" || item.severity === "warning").map((item) => `${relative}: ${item.code} ${item.message}`));
    }
  }
  if (!count) errors.push("No example contracts found");
  else if (!positives) errors.push("No positive example contracts found");
  return errors;
}

export function linksIn(text, markdown = true) {
  const content = markdown ? text.replace(/```[^\n]*\n[\s\S]*?```/gu, "").replace(/`[^`\n]*`/gu, "") : text;
  return [...new Set([
    ...[...content.matchAll(/\]\(<?([^\s)>]+)>?(?:\s+"[^"]*")?\)/gu)].map((match) => match[1]),
    ...[...content.matchAll(/(?:href|src)=["']([^"']+)["']/gu)].map((match) => match[1]),
    ...[...content.matchAll(/^\[[^\]]+\]:\s*(\S+)/gmu)].map((match) => match[1]),
  ].map(decode))];
}

export function anchorsIn(text) {
  const anchors = new Set([...text.matchAll(/\bid=["']([^"']+)["']/gu)].map((match) => match[1]));
  const counts = new Map();
  for (const match of text.replace(/```[^\n]*\n[\s\S]*?```/gu, "").matchAll(/^#{1,6}\s+(.+?)\s*#*$/gmu)) {
    const base = match[1].toLowerCase().replace(/<[^>]*>/gu, "").replace(/[^\p{L}\p{N}_ -]/gu, "").replace(/ /gu, "-");
    const count = counts.get(base) ?? 0;
    anchors.add(count ? `${base}-${count}` : base);
    counts.set(base, count + 1);
  }
  return anchors;
}

export async function localLinkErrors(text, file, config, directory = root) {
  const errors = [];
  for (const link of linksIn(text, !file.endsWith(".html"))) {
    if (/^(?:mailto:|tel:|data:|javascript:)/iu.test(link)) continue;
    let target;
    let fragment;
    if (/^https?:\/\//u.test(link)) {
      const url = new URL(link);
      if (url.hostname !== "engineeringspec.org") continue;
      target = config.publicUrlMappings[url.pathname] ?? `site${url.pathname}`;
      fragment = url.hash.slice(1);
    } else {
      const [pathname, hash] = link.split("#");
      fragment = hash;
      const clean = pathname.split("?")[0];
      if (!clean) target = file;
      else if (clean.startsWith("/")) target = config.publicUrlMappings[clean] ?? `site${clean}`;
      else target = path.join(path.dirname(file), clean);
    }
    try {
      target = decodeURIComponent(target);
      // Pages assembles these files from repository sources at deploy time.
      const publishedPath = path.normalize(target).replace(/^site(?=\/)/u, "");
      if (file.startsWith("site/") && config.publicUrlMappings[publishedPath]) target = config.publicUrlMappings[publishedPath];
      const absolute = path.resolve(directory, target);
      if (!absolute.startsWith(`${path.resolve(directory)}${path.sep}`)) throw new Error("outside repository");
      if ((await stat(absolute)).isDirectory()) target = path.join(target, "index.html");
      const location = path.join(directory, target);
      await stat(location);
      if (fragment && /\.(?:md|html)$/u.test(target) && !anchorsIn(await readFile(location, "utf8")).has(decodeURIComponent(fragment))) throw new Error(`missing fragment #${fragment}`);
    } catch (error) { errors.push(`${file}: broken local link ${link} (${error.message})`); }
  }
  return errors;
}

export async function externalLinkErrors(urls, fetcher = globalThis.fetch) {
  const errors = [];
  for (const original of [...new Set(urls)].sort()) {
    const timeout = globalThis.AbortSignal.timeout(10_000);
    let url = original;
    try {
      for (let redirects = 0; ; redirects++) {
        const response = await fetcher(url, { method: "GET", redirect: "manual", signal: timeout });
        await response.body?.cancel();
        if (response.status >= 300 && response.status < 400) {
          if (redirects >= 5 || !response.headers.get("location")) throw new Error("invalid or excessive redirects");
          url = new URL(response.headers.get("location"), url).href;
          if (!/^https?:\/\//u.test(url)) throw new Error("unsupported redirect scheme");
          continue;
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        break;
      }
    } catch (error) { errors.push(`${original}: external link check failed (${error.message})`); }
  }
  return errors;
}

// These are fixed repository-owned processes. No text from contracts, docs or
// the manifest is ever evaluated as an executable command or shell fragment.
function runTrusted(args) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  return result.status === 0 ? [] : [`Repository check ${args.join(" ")} failed\n${result.error?.message ?? ""}${result.stdout ?? ""}${result.stderr ?? ""}`];
}

export async function collectResults(checks) {
  const results = [];
  for (const [name, check] of checks) {
    try { results.push({ name, errors: await check() }); }
    catch (error) { results.push({ name, errors: [error.message] }); }
  }
  return results;
}

export async function main(args = process.argv.slice(2)) {
  const config = await parseJson("engineering/repository-consistency.json");
  const state = await projectState();
  const inventoryErrors = [];
  const texts = new Map(await Promise.all(config.publicSurfaces.map(async (file) => [file, await read(file).catch(() => { inventoryErrors.push(`${file}: inventoried public surface is missing`); return ""; })])));
  const discovered = [
    ...(await readdir(path.join(root, "docs"))).filter((file) => file.endsWith(".md")).map((file) => `docs/${file}`),
    ...(await walk(path.join(root, "site"))).filter((file) => file.endsWith(".html") && !file.endsWith("/explorer.html")).map((file) => path.relative(root, file)),
    ...(await walk(path.join(root, "integrations"))).filter((file) => file.endsWith("/README.md")).map((file) => path.relative(root, file)),
  ];
  for (const file of discovered) if (!texts.has(file)) inventoryErrors.push(`${file}: public surface missing from repository-consistency.json`);
  const all = (check, files = config.publicSurfaces) => files.flatMap((file) => check(texts.get(file), file));
  const checks = new Map([
    ["Version consistency", async () => {
      const lock = await parseJson("package-lock.json");
      return [
        ...packageIdentityErrors(lock, state),
        ...all((text, file) => versionErrors(text, file, state, config), config.versionSurfaces),
      ];
    }],
    ["Specification/schema compatibility", async () => {
      const schema = await parseJson("schemas/engineering-spec-0.1.schema.json");
      const { SUPPORTED_VERSION } = await import("../dist/model/constants.js");
      const { default: Ajv } = await import("ajv/dist/2020.js");
      const { default: addFormats } = await import("ajv-formats");
      const ajv = new Ajv({ strict: false });
      addFormats(ajv);
      const errors = schemaErrors(await read("SPEC.md"), schema, SUPPORTED_VERSION);
      for (const file of await walk(path.join(root, "schemas"))) {
        if (!file.endsWith(".json")) continue;
        const value = JSON.parse(await readFile(file, "utf8"));
        if (!ajv.validateSchema(value)) errors.push(`${file}: invalid JSON Schema`);
        ajv.compile(value);
      }
      return errors;
    }],
    ["Conformance corpus", async () => runTrusted(["node_modules/vitest/vitest.mjs", "run", "test/conformance"])],
    ["CLI documentation", async () => {
      const docs = config.publicSurfaces.filter((file) => !file.startsWith("site/") && file !== "README.md");
      const errors = [...inventoryErrors, ...all((text, file) => commandErrors(text, file, state), docs)];
      const reference = texts.get("docs/cli-reference.md");
      for (const command of state.commands) if (!new RegExp(`\\b${command.name}\\b`, "u").test(reference)) errors.push(`docs/cli-reference.md omits ${command.name}`);
      return errors;
    }],
    ["README commands", async () => commandErrors(texts.get("README.md"), "README.md", state)],
    ["Website commands", async () => all((text, file) => commandErrors(text, file, state), config.publicSurfaces.filter((file) => file.startsWith("site/")))],
    ["Example contracts", async () => exampleErrors()],
    ["GitHub Action metadata", async () => {
      const action = parseYaml(await read("action.yml"));
      const metadata = await parseJson("action/compatibility.json");
      return [
        ...actionMetadataErrors(action, metadata, state),
        ...runTrusted(["scripts/build-action.mjs", "--check"]),
      ];
    }],
    ["Generated content", async () => [...await generateProjectState({ check: true }), ...runTrusted(["scripts/generate-site.mjs", "--check"])]],
    ["Terminology", async () => all((text, file) => ruleErrors(text, file, config.forbiddenTerminology, config.claimRuleExceptions))],
    ["Broken links (local paths, fragments and owned URL mappings)", async () => (await Promise.all([...texts].map(([file, text]) => localLinkErrors(text, file, config)))).flat()],
    ["Security invariants (existing regression tests)", async () => runTrusted(["node_modules/vitest/vitest.mjs", "run", "test/unit/gate.adversarial.test.ts", "test/unit/core.test.ts", "test/unit/policy.test.ts", "test/unit/routing.test.ts", "test/unit/guard.test.ts", "test/unit/governance.test.ts", "test/unit/config.test.ts", "test/unit/replay.test.ts", "test/unit/verification-brief.test.ts"])],
    ["Public claims (bounded phrase rules)", async () => all((text, file) => ruleErrors(text, file, config.forbiddenClaims, config.claimRuleExceptions))],
  ]);
  const groups = {
    versions: ["Version consistency"],
    schemas: ["Specification/schema compatibility"],
    conformance: ["Conformance corpus"],
    docs: ["CLI documentation", "README commands", "Website commands"],
    examples: ["Example contracts"],
    generated: ["Generated content", "GitHub Action metadata"],
    positioning: ["Terminology", "Public claims (bounded phrase rules)"],
    links: ["Broken links (local paths, fragments and owned URL mappings)"],
  };
  const group = args.find((arg) => !arg.startsWith("--")) ?? "release";
  if (group !== "release" && !groups[group]) throw new Error(`Unknown integrity group ${group}`);
  const selected = group === "release" ? [...checks] : groups[group].map((name) => [name, checks.get(name)]);
  if (args.includes("--external")) selected.push(["External link liveness", async () => externalLinkErrors([...texts.values()].flatMap((text) => linksIn(text)).filter((url) => /^https?:\/\//u.test(url)))]);
  const results = await collectResults(selected);
  console.log("EngineeringSpec Repository Integrity\n");
  for (const result of results) {
    console.log(`${result.errors.length ? "✗" : "✓"} ${result.name}`);
    for (const error of result.errors) console.error(`  ${error}`);
  }
  if (!args.includes("--external")) console.log("\nExternal link liveness: not run (npm run check:links:external). Prose and security review remain required.");
  if (results.some((result) => result.errors.length)) process.exitCode = 1;
  return results;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
