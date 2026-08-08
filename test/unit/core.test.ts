import { describe,expect,it } from "vitest";
import { parseMarkdown } from "../../src/parser/parseMarkdown.js";
import { normalize } from "../../src/normalizer/normalize.js";
import { canonicalJson } from "../../src/normalizer/canonicalize.js";
import { digest } from "../../src/normalizer/digest.js";
import { isSafeRelativePath } from "../../src/validator/pathSafety.js";
import { validateStructure } from "../../src/validator/validateStructure.js";
import { validateSemantics } from "../../src/validator/validateSemantics.js";
import { coverage } from "../../src/query/coverage.js";
import { inspect } from "../../src/query/inspect.js";
import { isEngineeringSpecId } from "../../src/model/ids.js";
import { location } from "../../src/parser/sourceMap.js";
import { parseYaml } from "../../src/parser/parseYamlBlock.js";
import { formatDiagnostics } from "../../src/diagnostics/formatter.js";
import type { Diagnostic } from "../../src/diagnostics/Diagnostic.js";

const spec=(fence="```")=>`---\nspec_format: engineering-spec\nspec_format_version: "0.1"\nspec_revision: 1\nid: ES-test\ntitle: Test\nstatus: draft\nowners: [{team: test}]\n---\n\n# Rationale\n\n${fence}engineering-source-refs\n- {id: SRC-1, type: other, ref: test, item_ids: [AC-1]}\n${fence}\n${fence}engineering-targets\n- {id: TARGET-1, paths: [src/**], change_policy: modify}\n${fence}\n${fence}engineering-constraints\n- id: CON-1\n  level: must\n  statement: Safe\n  satisfies: [AC-1]\n  enforcement: {kind: test, verifier_ref: VER-1}\n${fence}\n${fence}engineering-verification\n- id: VER-1\n  proves: [CON-1]\n  kind: test\n  runner: {type: command, argv: [npm, test]}\n${fence}\n`;

describe("parser and normalized model",()=>{
  it("parses CommonMark fences, prose, and snake_case",()=>{const result=parseMarkdown(spec());expect(result.diagnostics).toEqual([]);expect(result.spec?.targets[0]?.changePolicy).toBe("modify");expect(result.spec?.prose.some(p=>p.markdown.includes("Rationale"))).toBe(true);});
  it("supports tilde fences and CRLF",()=>{const result=parseMarkdown(spec("~~~").replaceAll("\n","\r\n"));expect(result.diagnostics).toEqual([]);expect(result.spec?.verification[0]?.id).toBe("VER-1");});
  it("reports duplicate blocks with a related location",()=>{const input=`${spec()}\n\`\`\`engineering-targets\n[]\n\`\`\``;const diagnostic=parseMarkdown(input).diagnostics.find(d=>d.code==="ESP004");expect(diagnostic?.related).toHaveLength(1);expect(diagnostic?.location?.start.line).toBeGreaterThan(1);});
  it("adds safety defaults and canonicalizes keys",()=>{const parsed=parseMarkdown(spec()).spec!;const value=normalize(parsed);expect(value.constraints?.[0]?.severity).toBe("error");expect(value.verification[0]?.runner?.network).toBe("deny");expect(canonicalJson({z:1,a:2})).toBe('{\n  "a": 2,\n  "z": 1\n}\n');expect(digest({a:1})).toMatch(/^sha256:[a-f0-9]{64}$/);});
  it("can include retained source locations explicitly",()=>{const parsed=parseMarkdown(spec());const value=normalize(parsed.spec!,{includeSourceLocations:true,sourceLocations:parsed.locations});expect(value.sourceLocations?.["CON-1"]?.start.line).toBeGreaterThan(1);});
  it("is idempotent",()=>{const once=normalize(parseMarkdown(spec()).spec!);expect(normalize(once)).toEqual(once);});
  it("retains optional point offsets",()=>{expect(location("a.md",undefined,undefined)).toBeUndefined();expect(location("a.md",{line:1,column:1},{line:1,column:2})).toEqual({file:"a.md",start:{line:1,column:1},end:{line:1,column:2}});expect(location("a.md",{line:1,column:1,offset:0},{line:1,column:2,offset:1})?.end.offset).toBe(1);});
  it("rejects unsafe, deep, and malformed YAML",()=>{const unsafe:Diagnostic[]=[];expect(parseYaml("constructor: unsafe","a.md",undefined,unsafe)).toBeUndefined();expect(unsafe[0]?.code).toBe("ESP008");const malformed:Diagnostic[]=[];expect(parseYaml("[","a.md",undefined,malformed)).toBeUndefined();expect(malformed[0]?.code).toBe("ESP002");let deep="value";for(let index=0;index<52;index++)deep=`[${deep}]`;const nested:Diagnostic[]=[];expect(parseYaml(deep,"a.md",undefined,nested)).toBeUndefined();expect(nested[0]?.code).toBe("ESP008");});
  it("formats diagnostics with and without source locations",()=>{expect(formatDiagnostics([{code:"A",severity:"info",message:"plain"}])).toBe("info A plain");expect(formatDiagnostics([{code:"B",severity:"warning",message:"located",file:"a.md",location:{file:"a.md",start:{line:2,column:3},end:{line:2,column:4}}}])).toContain("a.md:2:3");});
  it("reports structured block size limits",()=>{const oversized=spec().replace("- {id: SRC-1, type: other, ref: test, item_ids: [AC-1]}",`- id: SRC-1\n  type: other\n  ref: ${"x".repeat(513*1024)}`);expect(parseMarkdown(oversized).diagnostics.map(item=>item.code)).toContain("ESP007");});
});

describe("validation and queries",()=>{
  it("accepts a complete spec",()=>{const value=parseMarkdown(spec()).spec!;expect(validateStructure(value)).toEqual([]);expect(validateSemantics(value)).toEqual([]);expect(coverage(value).status).toBe("complete");});
  it("queries path applicability and source traceability",()=>{const value=parseMarkdown(spec()).spec!;expect(inspect(value,{path:"src/a.ts"}).targets?.[0]?.id).toBe("TARGET-1");expect(inspect(value,{sourceItem:"AC-1"}).constraints?.[0]?.id).toBe("CON-1");});
  it("supports every direct inspection selector",()=>{const value=parseMarkdown(spec()).spec!;value.contracts=[{id:"CONTRACT-1",kind:"json_schema",path:"schema.json"}];value.constraints![0]!.enforcement={kind:"contract",contractRef:"CONTRACT-1"};expect(inspect(value,{target:"TARGET-1"}).targets).toHaveLength(1);expect(inspect(value,{constraint:"CON-1"}).constraints).toHaveLength(1);expect(inspect(value,{contract:"CONTRACT-1"}).contracts).toHaveLength(1);expect(inspect(value,{verifier:"VER-1"}).verification).toHaveLength(1);expect(inspect(value,{}).targets).toHaveLength(1);expect(inspect(value,{summary:true}).targets).toBeUndefined();});
  it("reports partial, unknown, and not-applicable coverage",()=>{const value=parseMarkdown(spec()).spec!;value.contracts=[{id:"CONTRACT-1",kind:"json_schema",path:"schema.json"}];value.evidence=[{id:"EVIDENCE-1",type:"test_result"}];expect(coverage(value).status).toBe("partial");expect(coverage(value,{unknownExternal:true}).status).toBe("unknown");delete value.sourceRefs[0]!.itemIds;value.constraints=[];value.contracts=[];value.evidence=[];value.verification=[{id:"VER-1",proves:["ES-test"],kind:"human_review"}];expect(coverage(value).status).toBe("not_applicable");});
  it.each([["src/a.ts",true],[".",true],["../secret",false],["/tmp/a",false],["C:\\tmp\\a",false],["a\0b",false]])("checks safe path %s",(value,expected)=>expect(isSafeRelativePath(value)).toBe(expected));
  it.each([["CON-1",true],["ES-feature.name",true],["lower-1",false],["CON-",false]])("checks ID grammar %s",(value,expected)=>expect(isEngineeringSpecId(value)).toBe(expected));
  it("finds dangling and duplicate IDs",()=>{const value=parseMarkdown(spec()).spec!;value.targets[0]!.id="SRC-1";value.verification[0]!.proves=["CON-404"];const codes=validateSemantics(value).map(d=>d.code);expect(codes).toContain("ESR001");expect(codes).toContain("ESR003");});
  it("warns on overlapping incompatible target globs",()=>{
    const value=parseMarkdown(spec()).spec!;
    value.targets=[
      {id:"TARGET-general",paths:["src/**"],changePolicy:"modify"},
      {id:"TARGET-secrets",paths:["src/secrets/**"],changePolicy:"read_only"},
    ];
    const diagnostics=validateSemantics(value);
    expect(diagnostics.some(d=>d.code==="ESR007"&&d.severity==="warning")).toBe(true);
  });
  it("rejects incomplete enforcement and runner kinds",()=>{
    const value=parseMarkdown(spec()).spec!;
    value.constraints=[{id:"CON-1",level:"must",statement:"No SQL",enforcement:{kind:"policy"} as never}];
    expect(validateSemantics(value).some(d=>d.code==="ESS001"&&d.message.includes("adapter"))).toBe(true);
    value.constraints=[{id:"CON-1",level:"must",statement:"Review",enforcement:{kind:"review"} as never}];
    expect(validateSemantics(value).some(d=>d.code==="ESS001"&&d.message.includes("reviewerRole"))).toBe(true);
    value.constraints=[{id:"CON-1",level:"must",statement:"Safe",enforcement:{kind:"test",verifierRef:"VER-1"}}];
    value.verification=[{id:"VER-1",proves:["CON-1"],kind:"test",runner:{type:"reference"}}];
    expect(validateSemantics(value).some(d=>d.code==="ESS001"&&d.message.includes("reference"))).toBe(true);
  });
  it("rejects wrong-typed references and forbidden globs",()=>{
    const value=parseMarkdown(spec()).spec!;
    value.constraints![0]!.appliesTo=["VER-1"];
    expect(validateSemantics(value).some(d=>d.code==="ESR008")).toBe(true);
    value.constraints![0]!.appliesTo=["TARGET-1"];
    value.targets[0]!.paths=["!src/**"];
    expect(validateSemantics(value).some(d=>d.code==="ESPTH002")).toBe(true);
  });
});
