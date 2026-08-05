import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import type { EngineeringSpec } from "../model/types.js";
import { validateProductSpecProfile, type ProfileOptions } from "../profiles/productspec/validate.js";

export async function validateProfiles(spec:EngineeringSpec,file:string,options:ProfileOptions={}):Promise<Diagnostic[]> {
  const unsupported=(spec.metadata?.profiles??[]).filter(profile=>profile.name!=="productspec"||profile.version!=="0.1").map(profile=>({code:"ESV002",severity:"error" as const,message:`Unsupported profile ${profile.name}@${profile.version}`,file}));
  return [...unsupported,...await validateProductSpecProfile(spec,file,options)];
}
