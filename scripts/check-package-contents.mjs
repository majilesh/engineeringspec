import { execFileSync } from "node:child_process";
import console from "node:console";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const ALLOWED_TOP_LEVEL = new Set([
  "LICENSE",
  "README.md",
  "SPEC.md",
  "action.yml",
  "benchmarks",
  "dist",
  "examples",
  "integrations",
  "package.json",
  "schemas",
  "scripts",
  "skills",
]);

const REQUIRED_PATHS = [
  "LICENSE",
  "README.md",
  "SPEC.md",
  "action.yml",
  "benchmarks/agent-impact.schema.json",
  "dist/cli.js",
  "dist/index.js",
  "examples/demo/README.md",
  "integrations/README.md",
  "package.json",
  "schemas/engineering-spec-0.1.schema.json",
  "scripts/demo.mjs",
  "skills/engineering-spec/SKILL.md",
];

const FORBIDDEN_PATH = /(^|\/)(?:\.private|_internal|\.git)(?:\/|$)|(^|\/)(?:\.env(?:\..*)?|.*(?:secret|credentials?).*)(?:\/|$)|(?:^|\/)(?:hacker-news|cursor-adoption-handoff|launch-notes)(?:\.[^/]*)?$/iu;

export function validatePackageFiles(files) {
  const normalized=[...new Set(files.map(file=>String(file).replaceAll("\\","/")))].sort();
  const errors=[];
  for(const file of normalized) {
    if(!file||file.startsWith("/")||file.split("/").includes("..")) errors.push(`unsafe package path: ${JSON.stringify(file)}`);
    const top=file.split("/",1)[0];
    if(!ALLOWED_TOP_LEVEL.has(top)) errors.push(`unexpected top-level package path: ${file}`);
    if(FORBIDDEN_PATH.test(file)) errors.push(`forbidden private or sensitive package path: ${file}`);
    if(top==="scripts"&&file!=="scripts/demo.mjs") errors.push(`unexpected publish-time script: ${file}`);
  }
  for(const required of REQUIRED_PATHS) if(!normalized.includes(required)) errors.push(`required package path is missing: ${required}`);
  return errors.sort();
}

export function inspectPackageFiles() {
  const npm=process.platform==="win32"?"npm.cmd":"npm";
  const output=execFileSync(npm,["pack","--dry-run","--json"],{
    cwd:process.cwd(),
    encoding:"utf8",
    env:{...process.env,npm_config_loglevel:"silent"},
    maxBuffer:16*1024*1024,
  });
  const result=JSON.parse(output);
  if(!Array.isArray(result)||result.length!==1||!Array.isArray(result[0]?.files)) throw new Error("npm pack returned an unexpected manifest");
  return result[0].files.map(entry=>entry.path);
}

function main() {
  const files=inspectPackageFiles();
  const errors=validatePackageFiles(files);
  if(errors.length>0) {
    for(const error of errors) console.error(`package-content error: ${error}`);
    process.exitCode=1;
    return;
  }
  console.log(`package-content: pass (${files.length} files)`);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) main();
