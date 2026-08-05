import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import schema from "../../schemas/engineering-spec-0.1.schema.json" with { type: "json" };
import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import { Codes } from "../diagnostics/codes.js";

const ajv=new Ajv2020({allErrors:true,strict:false});
(addFormatsModule as unknown as (instance:Ajv2020)=>void)(ajv);
const validate=ajv.compile(schema);
function message(error:ErrorObject):string {
  const path=error.instancePath||"/";
  if(error.keyword==="required") return `Required field ${JSON.stringify((error.params as {missingProperty:string}).missingProperty)} is missing at ${path}`;
  return `Schema violation at ${path}: ${error.message??error.keyword}`;
}
export function validateStructure(value:unknown,file?:string):Diagnostic[] {
  if(validate(value)) return [];
  return (validate.errors??[]).map(error=>({code:error.keyword==="const"&&error.instancePath==="/metadata/specFormatVersion"?Codes.unsupportedVersion:Codes.schema,severity:"error" as const,message:message(error),...(file?{file}:{})}));
}
export function schemaCompiles():boolean { return Boolean(validate); }
