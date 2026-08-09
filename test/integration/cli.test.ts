import { mkdir, mkdtemp,readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { CommanderError } from "commander";
import { describe,expect,it } from "vitest";
import { createProgram } from "../../src/cli/program.js";
import { validateFile } from "../../src/index.js";
import { adoptRepository } from "../../src/cli/adopt.js";
import { summarizeAgentBenchmark } from "../../src/cli/benchmark.js";

async function invoke(args:string[]):Promise<number>{
  let code=0;
  const program=createProgram(value=>{code=Math.max(code,value);});
  program.exitOverride();
  try {
    await program.parseAsync(["node","engineeringspec",...args]);
  } catch (error) {
    if (error instanceof CommanderError) {
      if (error.code === "commander.helpDisplayed" || error.code === "commander.version") return 0;
      return 2;
    }
    throw error;
  }
  return code;
}
describe("CLI",()=>{
  it("initializes without overwriting and produces a valid file",async()=>{const dir=await mkdtemp(path.join(os.tmpdir(),"es-cli-"));const file=path.join(dir,"ENGINEERING_SPEC.md");expect(await invoke(["init",file,"--id","ES-created","--quiet"])).toBe(0);expect((await validateFile(file)).valid).toBe(true);expect(await invoke(["init",file,"--quiet"])).toBe(3);expect(await readFile(file,"utf8")).toContain("ES-created");});
  it("validates valid and invalid examples",async()=>{expect((await validateFile("examples/standalone/bug-fix.engineering-spec.md")).valid).toBe(true);expect((await validateFile("examples/invalid/duplicate-id.engineering-spec.md")).valid).toBe(false);});
  it("resolves ProductSpec profile",async()=>{const result=await validateFile("examples/productspec/ticket-triage.engineering-spec.md");expect(result.diagnostics).toEqual([]);});
  it("validates a directory and emits GitHub annotations",async()=>{const dir=await mkdtemp(path.join(os.tmpdir(),"es-directory-"));await mkdir(path.join(dir,"specs"));await writeFile(path.join(dir,"specs","bad.engineering-spec.md"),"# invalid\n");const messages:string[]=[];const original=console.log;console.log=(message?:unknown)=>{messages.push(String(message));};try{expect(await invoke(["validate",path.join(dir,"specs"),"--format","github"])).toBe(1);}finally{console.log=original;}expect(messages.some(message=>message.startsWith("::error"))).toBe(true);});
  it("gates changed paths against declared targets",async()=>{
    const file="docs/engineering-specs/ES-gate-diff-scope.engineering-spec.md";
    expect(await invoke(["gate",file,"--changed","src/gate/gate.ts","--quiet"])).toBe(0);
    expect(await invoke(["gate",file,"--changed","totally/unrelated.ts","--quiet"])).toBe(1);
    expect(await invoke(["gate",file,"--changed","src/gate/gate.ts","--require-status","approved","--quiet"])).toBe(1);
  });
  it("can write a gate receipt",async()=>{
    const dir=await mkdtemp(path.join(os.tmpdir(),"es-receipt-cli-"));
    const receipt=path.join(dir,"gate-receipt.json");
    expect(await invoke(["gate","docs/engineering-specs/ES-gate-diff-scope.engineering-spec.md","--changed","src/gate/gate.ts","--receipt",receipt,"--quiet"])).toBe(0);
    const parsed=JSON.parse(await readFile(receipt,"utf8")) as {format:string;result:string;tool:{version:string}};
    expect(parsed.format).toBe("engineeringspec-gate-receipt");
    expect(parsed.result).toBe("pass");
    expect(parsed.tool.version).toBe(JSON.parse(await readFile("package.json","utf8")).version);
  });
  it("inspect fails closed on invalid semantics unless --parse-only",async()=>{
    const file="conformance/invalid-semantics/dangling-target.engineering-spec.md";
    expect(await invoke(["inspect",file,"--quiet"])).toBe(1);
    expect(await invoke(["inspect",file,"--parse-only","--quiet"])).toBe(0);
  });
  it("coverage fails closed on invalid semantics without printing a report body",async()=>{
    const messages:string[]=[];
    const originalLog=console.log;
    const originalErr=console.error;
    console.log=(message?:unknown)=>{messages.push(`log:${String(message)}`);};
    console.error=(message?:unknown)=>{messages.push(`err:${String(message)}`);};
    try {
      expect(await invoke(["coverage","conformance/invalid-semantics/dangling-target.engineering-spec.md"])).toBe(1);
    } finally {
      console.log=originalLog;
      console.error=originalErr;
    }
    expect(messages.some((m)=>m.startsWith("log:coverage:"))).toBe(false);
    expect(messages.some((m)=>m.includes("ESR001")||m.includes("dangling")||m.includes("TARGET"))).toBe(true);
  });
  it("gate --strict fails on loaded-contract validation warnings",async()=>{
    const dir=await mkdtemp(path.join(os.tmpdir(),"es-strict-gate-"));
    const file=path.join(dir,"overlap.engineering-spec.md");
    await writeFile(file,`---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-overlap-gate
title: Overlap
status: draft
owners: [{team: test}]
---
\`\`\`engineering-source-refs
[{id: SRC-1, type: other, ref: test}]
\`\`\`
\`\`\`engineering-targets
- {id: TARGET-a, paths: [src/**], change_policy: modify}
- {id: TARGET-b, paths: [src/secrets/**], change_policy: read_only}
\`\`\`
\`\`\`engineering-constraints
[{id: CON-1, level: must, statement: Safe., enforcement: {kind: test, verifier_ref: VER-1}}]
\`\`\`
\`\`\`engineering-verification
[{id: VER-1, proves: [CON-1], kind: test, runner: {type: reference, reference: tests}}]
\`\`\`
`);
    expect(await invoke(["gate",file,"--changed","src/a.ts","--quiet"])).toBe(0);
    expect(await invoke(["gate",file,"--changed","src/a.ts","--strict","--quiet"])).toBe(1);
  });
  it("provides read-only agent check, context, and explanation workflows",async()=>{
    const file="docs/engineering-specs/ES-gate-diff-scope.engineering-spec.md";
    expect(await invoke(["check","docs/engineering-specs/ES-rc5-lifecycle-release.engineering-spec.md","--spec-from","workspace","--quiet"])).toBe(0);
    expect(await invoke(["check","conformance/valid/future-exception.engineering-spec.md","--spec-from","workspace","--strict","--quiet"])).toBe(1);
    expect(await invoke(["context",file,"--path","src/gate/gate.ts","--quiet"])).toBe(0);
    expect(await invoke(["explain",file,"--path","src/gate/gate.ts","--quiet"])).toBe(0);
    expect(await invoke(["explain",file,"--path","totally/unrelated.ts","--quiet"])).toBe(1);
  });
  it("keeps agent commands inert even when a spec declares a command runner",async()=>{
    const dir=await mkdtemp(path.join(os.tmpdir(),"es-inert-agent-"));
    const file=path.join(dir,"inert.engineering-spec.md");
    const marker=path.join(dir,"must-not-exist");
    await writeFile(file,`---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-inert-agent
title: Inert agent commands
status: draft
owners: [{team: test}]
---
\`\`\`engineering-source-refs
[{id: SRC-1, type: other, ref: test}]
\`\`\`
\`\`\`engineering-targets
[{id: TARGET-1, paths: ["**"], change_policy: modify}]
\`\`\`
\`\`\`engineering-constraints
[{id: CON-1, level: must, statement: Stay inert., enforcement: {kind: test, verifier_ref: VER-1}}]
\`\`\`
\`\`\`engineering-verification
- id: VER-1
  proves: [CON-1]
  kind: test
  runner: {type: command, argv: [node, -e, "require('fs').writeFileSync('${marker}', 'bad')"]}
\`\`\`
`);
    const messages:string[]=[];
    const originalLog=console.log;
    console.log=(message?:unknown)=>{messages.push(String(message));};
    try {
      expect(await invoke(["context",file,"--path","src/a.ts"])).toBe(0);
    } finally {
      console.log=originalLog;
    }
    expect(messages.join("\n")).toContain('"runnerInert": true');
    expect(messages.join("\n")).not.toContain("writeFileSync");
    expect(await invoke(["explain",file,"--path","src/a.ts","--quiet"])).toBe(0);
    expect(await invoke(["check",file,"--spec-from","workspace","--quiet"])).toBe(0);
    expect(await readFile(marker,"utf8").then(()=>true,()=>false)).toBe(false);
  });
  it("keeps enforcing CI pinned to base authorization",async()=>{
    const workflow=await readFile(".github/workflows/ci.yml","utf8");
    expect(workflow).toContain("echo \"GATE_SPEC_FROM=base\"");
    expect(workflow).not.toContain("GATE_SPEC_FROM=workspace");
    expect(workflow).toContain("package-lock.json");
    expect(workflow).toContain("gate-spec: docs/engineering-specs/ES-rc5-lifecycle-release.engineering-spec.md");
    expect(workflow).toContain("git diff --name-status -z --find-renames");
    expect(workflow).toContain("docs/engineering-specs/*|rfcs/*");
    expect(workflow).toContain("R*|C*");
    expect(workflow).toContain("CONTRACT_ONLY=1");
    expect(workflow).toContain("env.CONTRACT_ONLY != '1'");
    const action=await readFile("action.yml","utf8");
    expect(action).toContain("gate-spec-dir:");
    expect(action).toContain("gate-spec and gate-spec-dir are mutually exclusive");
    expect(action).toContain('select "$INPUT_GATE_SPEC_DIR"');
  });
  it("limits the contract-only CI lane to complete RFC and contract diffs",async()=>{
    const workflow=await readFile(".github/workflows/ci.yml","utf8");
    const start=workflow.indexOf('          diff_file="$(mktemp)"');
    const end=workflow.indexOf("          # The approved base contract",start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const classifier=workflow.slice(start,end).replace(/^ {10}/gm,"");
    const classify=(root:string,base:string):string=>{
      const githubEnv=path.join(root,".git","github-env");
      execFileSync("sh",["-c",': > "$1"',"--",githubEnv]);
      execFileSync("bash",["-c",`set -euo pipefail
base="$1"
${classifier}`,"--",base],{cwd:root,env:{...process.env,GITHUB_ENV:githubEnv}});
      return execFileSync("sh",["-c",`test -f "$1" && cat "$1" || true`,"--",githubEnv],{encoding:"utf8"});
    };
    const root=await mkdtemp(path.join(os.tmpdir(),"es-contract-lane-"));
    await mkdir(path.join(root,"src"));
    await writeFile(path.join(root,"src","original.ts"),"export {};\n");
    execFileSync("git",["init","-q",root]);
    execFileSync("git",["-C",root,"add","."]);
    execFileSync("git",["-C",root,"-c","user.name=Test","-c","user.email=test@example.com","commit","-qm","base"]);
    const base=execFileSync("git",["-C",root,"rev-parse","HEAD"],{encoding:"utf8"}).trim();
    expect(classify(root,base)).toContain("CONTRACT_ONLY=0");
    await mkdir(path.join(root,"docs","engineering-specs"),{recursive:true});
    await mkdir(path.join(root,"rfcs"));
    await writeFile(path.join(root,"docs","engineering-specs","change.engineering-spec.md"),"contract\n");
    await writeFile(path.join(root,"rfcs","change.md"),"rfc\n");
    execFileSync("git",["-C",root,"add","."]);
    execFileSync("git",["-C",root,"-c","user.name=Test","-c","user.email=test@example.com","commit","-qm","contract"]);
    expect(classify(root,base)).toContain("CONTRACT_ONLY=1");
    await writeFile(path.join(root,"src","implementation.ts"),"export {};\n");
    execFileSync("git",["-C",root,"add","."]);
    execFileSync("git",["-C",root,"-c","user.name=Test","-c","user.email=test@example.com","commit","-qm","mixed"]);
    expect(classify(root,base)).toContain("CONTRACT_ONLY=0");

    const renameRoot=await mkdtemp(path.join(os.tmpdir(),"es-contract-rename-"));
    await mkdir(path.join(renameRoot,"src"));
    await writeFile(path.join(renameRoot,"src","implementation.ts"),"export {};\n");
    execFileSync("git",["init","-q",renameRoot]);
    execFileSync("git",["-C",renameRoot,"add","."]);
    execFileSync("git",["-C",renameRoot,"-c","user.name=Test","-c","user.email=test@example.com","commit","-qm","base"]);
    const renameBase=execFileSync("git",["-C",renameRoot,"rev-parse","HEAD"],{encoding:"utf8"}).trim();
    await mkdir(path.join(renameRoot,"rfcs"));
    execFileSync("git",["-C",renameRoot,"mv","src/implementation.ts","rfcs/implementation.md"]);
    execFileSync("git",["-C",renameRoot,"-c","user.name=Test","-c","user.email=test@example.com","commit","-qm","rename"]);
    expect(classify(renameRoot,renameBase)).toContain("CONTRACT_ONLY=0");
  });
  it("selects and checks approved contracts from a base-pinned directory",async()=>{
    const root=await mkdtemp(path.join(os.tmpdir(),"es-cli-routing-"));
    await mkdir(path.join(root,"specs"));
    await writeFile(path.join(root,"specs","change.engineering-spec.md"),`---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-cli-routing
title: CLI routing fixture
status: approved
owners: [{team: test}]
---

# CLI routing fixture

\`\`\`engineering-source-refs
- id: SRC-1
  type: document
  ref: test
\`\`\`

\`\`\`engineering-targets
- id: TARGET-1
  paths: [src/**]
  change_policy: modify
\`\`\`

\`\`\`engineering-constraints
- id: CON-1
  level: must
  statement: Test
  enforcement: {kind: test, verifier_ref: VER-1}
\`\`\`

\`\`\`engineering-verification
- id: VER-1
  proves: [CON-1]
  kind: test
\`\`\`
`);
    execFileSync("git",["init","-q",root]);
    execFileSync("git",["-C",root,"add","."]);
    execFileSync("git",["-C",root,"-c","user.name=Test","-c","user.email=test@example.com","commit","-qm","fixture"]);
    const original=process.cwd();
    process.chdir(root);
    try {
      expect(await invoke(["select","specs","--base","HEAD","--changed","src/a.ts","--strict","--quiet"])).toBe(0);
      expect(await invoke(["select","specs","--base","HEAD","--changed","outside.txt","--strict","--quiet"])).toBe(1);
      expect(await invoke(["check","--spec-dir","specs","--base","HEAD","--strict","--quiet"])).toBe(0);
      expect(await invoke(["check","--spec-dir","specs","--quiet"])).toBe(2);
      await writeFile(path.join(root,"specs","change.engineering-spec.md"),(await readFile(path.join(root,"specs","change.engineering-spec.md"),"utf8")).replace("status: approved","status: implemented"));
      execFileSync("git",["-C",root,"add","."]);
      execFileSync("git",["-C",root,"-c","user.name=Test","-c","user.email=test@example.com","commit","-qm","close contract"]);
      expect(await invoke(["select","specs","--base","HEAD","--strict","--quiet"])).toBe(0);
      expect(await invoke(["check","--spec-dir","specs","--base","HEAD","--strict","--quiet"])).toBe(0);
      expect(await invoke(["select","specs","--base","HEAD","--changed","src/a.ts","--strict","--quiet"])).toBe(1);
    } finally {
      process.chdir(original);
    }
  });
  it("scaffolds adoption files without overwriting by default",async()=>{
    const root=await mkdtemp(path.join(os.tmpdir(),"es-adopt-"));
    await writeFile(path.join(root,"AGENTS.md"),"existing\n");
    const result=await adoptRepository({root,specPath:"docs/engineering-specs/ES-change.engineering-spec.md"});
    expect(result.skipped).toContain("AGENTS.md");
    expect(await readFile(path.join(root,"AGENTS.md"),"utf8")).toBe("existing\n");
    expect(await readFile(path.join(root,"CLAUDE.md"),"utf8")).toContain("@AGENTS.md");
    expect(await readFile(path.join(root,".github/workflows/engineering-spec.yml"),"utf8")).toContain("gate-spec-dir: docs/engineering-specs");
    expect(await readFile(path.join(root,".github/workflows/engineering-spec.yml"),"utf8")).toContain("gate-require-status: approved");
    expect(await readFile(path.join(root,".github/workflows/engineering-spec.yml"),"utf8")).toContain("steps.approved-base.outputs.ref");
    expect(await readFile(path.join(root,".github/workflows/engineering-spec.yml"),"utf8")).toContain("majilesh/engineeringspec@e28b124ec2ca2135c4f3ad0f999a7cb9f715365d");
    expect(await readFile(path.join(root,"CLAUDE.md"),"utf8")).toContain("@AGENTS.md");
    const dry=await adoptRepository({root,specPath:"docs/engineering-specs/ES-change.engineering-spec.md",dryRun:true});
    expect(dry.skipped).toHaveLength(4);
  });
  it("pins generated agent context to an explicit approved base and immutable CLI version",async()=>{
    const root=await mkdtemp(path.join(os.tmpdir(),"es-adopt-base-"));
    const result=await adoptRepository({root,specPath:"docs/engineering-specs/ES-change.engineering-spec.md",baseRef:"upstream/trunk"});
    const agents=await readFile(path.join(root,"AGENTS.md"),"utf8");
    const version=(JSON.parse(await readFile("package.json","utf8")) as {version:string}).version;
    expect(result.baseRef).toBe("upstream/trunk");
    expect(agents).toContain("select docs/engineering-specs --base upstream/trunk --worktree --strict");
    expect(agents).toContain("context <selected-spec> --path <path> --base upstream/trunk");
    expect(agents).toContain("check --spec-dir docs/engineering-specs --base upstream/trunk --strict");
    expect(agents).toContain(`@engineeringspec/cli@${version}`);
    expect(agents).not.toContain("@next");
    const skill=await readFile("skills/engineering-spec/SKILL.md","utf8");
    expect(skill).toContain(`@engineeringspec/cli@${version}`);
    expect(skill).not.toContain("@engineeringspec/cli@next");
  });
  it("detects origin HEAD and safely merges text guidance",async()=>{
    const root=await mkdtemp(path.join(os.tmpdir(),"es-adopt-merge-"));
    execFileSync("git",["init","-q",root]);
    execFileSync("git",["-C",root,"symbolic-ref","refs/remotes/origin/HEAD","refs/remotes/origin/trunk"]);
    await writeFile(path.join(root,"AGENTS.md"),"# Existing guidance\n");
    await writeFile(path.join(root,"CLAUDE.md"),"# Claude guidance\n");
    await mkdir(path.join(root,".github","workflows"),{recursive:true});
    await writeFile(path.join(root,".github","workflows","engineering-spec.yml"),"existing workflow\n");
    const first=await adoptRepository({root,specPath:"docs/spec.engineering-spec.md",merge:true});
    const agents=await readFile(path.join(root,"AGENTS.md"),"utf8");
    expect(first.baseRef).toBe("origin/trunk");
    expect(first.updated).toEqual(expect.arrayContaining(["AGENTS.md","CLAUDE.md"]));
    expect(first.skipped).toContain(".github/workflows/engineering-spec.yml");
    expect(agents).toContain("# Existing guidance");
    expect(agents).toContain("--base origin/trunk");
    const second=await adoptRepository({root,specPath:"docs/spec.engineering-spec.md",merge:true});
    expect(second.updated).toHaveLength(0);
    expect((await readFile(path.join(root,"AGENTS.md"),"utf8")).match(/engineeringspec:start/g)).toHaveLength(1);
  });
  it("keeps dry-run write-free and rejects unsafe scaffold interpolation",async()=>{
    const root=await mkdtemp(path.join(os.tmpdir(),"es-adopt-dry-"));
    const result=await adoptRepository({root,specPath:"docs/spec.engineering-spec.md",baseRef:"origin/main",dryRun:true});
    expect(result.created).toHaveLength(4);
    await expect(readFile(path.join(root,"AGENTS.md"),"utf8")).rejects.toThrow();
    await expect(adoptRepository({root,specPath:"docs/spec.yml\ngate-base: attacker",baseRef:"origin/main"})).rejects.toThrow("safe repository-relative path");
    await expect(adoptRepository({root,specPath:"docs/spec.engineering-spec.md",baseRef:"origin/main\nmalicious"})).rejects.toThrow("safe Git ref");
  });
  it("summarizes paired agent-impact results",()=>{
    const summary=summarizeAgentBenchmark([
      {taskId:"task",runId:"base",condition:"baseline",agent:"agent",success:false,scopeViolations:2,reviewCorrections:3,durationSeconds:100,inputTokens:10,outputTokens:5},
      {taskId:"task",runId:"spec",condition:"engineeringspec",agent:"agent",success:true,scopeViolations:0,reviewCorrections:1,durationSeconds:90,inputTokens:12,outputTokens:4},
    ]);
    expect(summary.delta.successRate).toBe(1);
    expect(summary.delta.scopeViolationReduction).toBe(2);
    expect(summary.delta.reviewCorrectionReduction).toBe(2);
    expect(()=>summarizeAgentBenchmark([
      {taskId:"unpaired",runId:"base",condition:"baseline",agent:"agent",success:true,scopeViolations:0,reviewCorrections:0,durationSeconds:1,inputTokens:1,outputTokens:1},
      {taskId:"other",runId:"spec",condition:"engineeringspec",agent:"agent",success:true,scopeViolations:0,reviewCorrections:0,durationSeconds:1,inputTokens:1,outputTokens:1},
    ])).toThrow("requires both conditions");
  });
});
