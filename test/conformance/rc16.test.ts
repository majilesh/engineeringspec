import { readFile } from "node:fs/promises";
import { describe,expect,it } from "vitest";
import { validateFile } from "../../src/validator/validateFile.js";

describe("RC16 additive conformance",()=>{
  it("accepts exact maintenance sequencing without rewriting legacy 0.1 documents",async()=>{
    const valid=await validateFile("conformance/authority-sequencing/valid-maintenance.engineering-spec.md",{strictExternal:true,repositoryRoot:process.cwd()});
    expect(valid.diagnostics).toEqual([]);
    expect(valid.spec?.authorityControls).toMatchObject({mode:"maintenance",suspensions:[{contractId:"ES-feature",specRevision:4,paths:["package.json"]}]});
    const legacy=await validateFile("conformance/valid/minimal.engineering-spec.md");
    expect(legacy.valid).toBe(true);expect(legacy.spec?.authorityControls).toBeUndefined();
  });

  it("rejects sequencing globs and executable change fixtures",async()=>{
    const invalid=await validateFile("conformance/authority-sequencing/invalid-glob.engineering-spec.md");
    expect(invalid.diagnostics).toContainEqual(expect.objectContaining({code:"ESRT007"}));
    const executable=JSON.parse(await readFile("conformance/historical-replay/invalid-executable-field.json","utf8")) as {changes:Array<Record<string,unknown>>};
    expect(Object.keys(executable.changes[0]!)).toContain("argv");
    expect(Object.keys(executable.changes[0]!).some(key=>!["path","kind","fromPath"].includes(key))).toBe(true);
  });
});
