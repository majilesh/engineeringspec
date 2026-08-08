import type { EngineeringSpec, TargetSurface } from "../model/types.js";
import { matchTargetGlob } from "../path/targetGlob.js";

export function applicableTargets(spec: EngineeringSpec, filePath: string): TargetSurface[] {
  return spec.targets.filter((target) => target.paths.some((pattern) => matchTargetGlob(filePath, pattern)));
}
