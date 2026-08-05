import { createHash } from "node:crypto";
import { canonicalJson } from "./canonicalize.js";
export function digest(value:unknown):string { return `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`; }
