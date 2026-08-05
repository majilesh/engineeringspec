import { minimatch } from "minimatch";
import type { EngineeringSpec, TargetSurface } from "../model/types.js";
export function applicableTargets(spec:EngineeringSpec,filePath:string):TargetSurface[] { return spec.targets.filter(target=>target.paths.some(pattern=>minimatch(filePath,pattern,{dot:true,matchBase:false}))); }
