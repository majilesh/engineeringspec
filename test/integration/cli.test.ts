import { mkdtemp,readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { describe,expect,it } from "vitest";
import { createProgram } from "../../src/cli/program.js";
import { validateFile } from "../../src/index.js";

async function invoke(args:string[]):Promise<number>{let code=0;const program=createProgram(value=>{code=Math.max(code,value);});await program.parseAsync(["node","engineeringspec",...args]);return code;}
describe("CLI",()=>{
  it("initializes without overwriting and produces a valid file",async()=>{const dir=await mkdtemp(path.join(os.tmpdir(),"es-cli-"));const file=path.join(dir,"ENGINEERING_SPEC.md");expect(await invoke(["init",file,"--id","ES-created","--quiet"])).toBe(0);expect((await validateFile(file)).valid).toBe(true);expect(await invoke(["init",file,"--quiet"])).toBe(3);expect(await readFile(file,"utf8")).toContain("ES-created");});
  it("validates valid and invalid examples",async()=>{expect((await validateFile("examples/standalone/bug-fix.engineering-spec.md")).valid).toBe(true);expect((await validateFile("examples/invalid/duplicate-id.engineering-spec.md")).valid).toBe(false);});
  it("resolves ProductSpec profile",async()=>{const result=await validateFile("examples/productspec/ticket-triage.engineering-spec.md");expect(result.diagnostics).toEqual([]);});
});
