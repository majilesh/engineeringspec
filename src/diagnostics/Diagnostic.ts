import type { SourceLocation } from "../model/types.js";
export interface Diagnostic { code:string; severity:"error"|"warning"|"info"; message:string; file?:string; location?:SourceLocation; related?:Array<{message:string;file?:string;location?:SourceLocation}>; hint?:string }
export interface ValidationResult { valid:boolean; diagnostics:Diagnostic[]; spec?:import("../model/types.js").EngineeringSpec; locations?:Map<string,import("../model/types.js").SourceLocation> }
