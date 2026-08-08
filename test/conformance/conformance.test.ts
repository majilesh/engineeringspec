import { describe,expect,it } from "vitest";
import { validateBytes, validateFile } from "../../src/index.js";
import { readFile } from "node:fs/promises";
import { normalize } from "../../src/normalizer/normalize.js";
import { canonicalJson } from "../../src/normalizer/canonicalize.js";
import manifest from "../../conformance/expected-results/manifest.json" with {type:"json"};

describe("portable conformance fixtures",()=>{
  for(const fixture of manifest.fixtures) it(fixture.file,async()=>{
    const fixturePath=`conformance/${fixture.file}`;
    const result="encoding" in fixture&&fixture.encoding==="base64"
      ? await validateBytes(Buffer.from((await readFile(fixturePath,"utf8")).trim(),"base64"),fixturePath,{strictExternal:true})
      : await validateFile(fixturePath,{strictExternal:true});
    expect(result.valid).toBe(fixture.valid);
    const codes=result.diagnostics.map(d=>d.code);
    for(const code of fixture.codes) expect(codes).toContain(code);
  });
  it("matches the portable canonical output",async()=>{const result=await validateFile("conformance/valid/minimal.engineering-spec.md");const expected=await readFile("conformance/expected-results/minimal.canonical.json","utf8");expect(canonicalJson(normalize(result.spec!))).toBe(`${expected.trim()}\n`);});
});
