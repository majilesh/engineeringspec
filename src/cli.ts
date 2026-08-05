#!/usr/bin/env node
import { run } from "./cli/program.js";
run().then(code=>{process.exitCode=code;}).catch(error=>{console.error(error instanceof Error?error.stack:String(error));process.exitCode=5;});
