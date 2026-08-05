import { ID_PATTERN } from "./constants.js";
export function isEngineeringSpecId(value:unknown):value is string { return typeof value==="string"&&ID_PATTERN.test(value); }
export function assertEngineeringSpecId(value:unknown):asserts value is string { if(!isEngineeringSpecId(value)) throw new TypeError(`Invalid EngineeringSpec ID: ${String(value)}`); }
