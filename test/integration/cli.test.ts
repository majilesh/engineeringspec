import { mkdir, mkdtemp,readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { CommanderError } from "commander";
import { describe,expect,it } from "vitest";
import { createProgram } from "../../src/cli/program.js";
import { validateFile } from "../../src/index.js";

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
});
