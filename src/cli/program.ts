import { access, appendFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { Command, CommanderError, Option } from "commander";
import { parseFile, validateFile } from "../index.js";
import { validatePath, type PathValidationReport } from "../validator/validatePath.js";
import { formatDiagnostics } from "../diagnostics/formatter.js";
import { formatGitHubDiagnostic, formatValidationMarkdown } from "../diagnostics/github.js";
import { normalize } from "../normalizer/normalize.js";
import { canonicalJson } from "../normalizer/canonicalize.js";
import { digest } from "../normalizer/digest.js";
import { inspect } from "../query/inspect.js";
import { coverage } from "../query/coverage.js";
import { collectGitDiff, changedFromPathList } from "../gate/collectDiff.js";
import { gateDiff } from "../gate/gate.js";
import { readGitBlob, resolveCommitSha, resolveGitRelativePath, type SpecSource } from "../gate/loadSpec.js";
import { buildGateReceipt, writeGateReceipt } from "../gate/receipt.js";
import type { ChangeKind } from "../gate/types.js";
import type { Status } from "../model/types.js";
import { Codes } from "../diagnostics/codes.js";
import { validateMarkdown } from "../validator/validateFile.js";
import { ExitCode } from "./exitCodes.js";
import { template, type TemplateName } from "./templates.js";
import { packageVersion } from "./version.js";

const STATUS_VALUES = ["draft", "proposed", "approved", "implemented", "superseded", "rejected"] as const;

type OutputFormat = "text" | "json" | "github" | "markdown";
interface GlobalOptions { format: OutputFormat; quiet?: boolean; strict?: boolean }

function output(value: unknown, format: OutputFormat): void {
  console.log(format === "json" ? JSON.stringify(value, null, 2) : typeof value === "string" ? value : JSON.stringify(value, null, 2));
}

function validationCode(diagnostics: Array<{ code: string; severity: string }>, strict = false): number {
  if (diagnostics.some((item) => item.code.startsWith("ESV") && item.severity === "error")) return ExitCode.unsupported;
  return diagnostics.some((item) => item.severity === "error" || (strict && item.severity === "warning"))
    ? ExitCode.validation
    : ExitCode.success;
}

function serializableReport(report: PathValidationReport): object {
  return {
    valid: report.valid,
    path: report.path,
    errors: report.errors,
    warnings: report.warnings,
    files: report.files.map((file) => ({
      file: file.file,
      valid: file.valid,
      errors: file.errors,
      warnings: file.warnings,
      identity: file.identity,
      diagnostics: file.diagnostics,
    })),
    diagnostics: report.diagnostics,
  };
}

function textReport(report: PathValidationReport): string {
  const header = `${report.valid ? "valid" : "invalid"}: ${report.path} (${report.files.length} documents, ${report.errors} errors, ${report.warnings} warnings)`;
  return report.diagnostics.length > 0 ? `${header}\n${formatDiagnostics(report.diagnostics)}` : header;
}

export function createProgram(setCode: (code: number) => void): Command {
  const formatOption = new Option("--format <format>", "output format")
    .choices(["text", "json", "github", "markdown"])
    .default("text");
  const program = new Command()
    .name("engineeringspec")
    .description("Validate and inspect versioned engineering change contracts")
    .version(packageVersion())
    .addOption(formatOption)
    .addOption(new Option("--quiet", "suppress non-essential output"))
    .option("--strict", "treat warnings as failures");

  program
    .command("init")
    .argument("[path]", "output file", "ENGINEERING_SPEC.md")
    .addOption(new Option("--template <name>").choices(["bug-fix", "feature", "api-change", "infrastructure"]).default("feature"))
    .option("--id <id>", "spec ID", "ES-new-change")
    .option("--title <title>", "title", "New engineering change")
    .option("--owner <owner>", "owner", "engineering")
    .option("--force", "overwrite an existing file")
    .action(async (file, options) => {
      try {
        if (!options.force) {
          let exists = true;
          try { await access(file, constants.F_OK); } catch { exists = false; }
          if (exists) {
            console.error(`${file} already exists; use --force to overwrite`);
            setCode(ExitCode.io);
            return;
          }
        }
        await writeFile(file, template({ template: options.template as TemplateName, id: options.id, title: options.title, owner: options.owner }), "utf8");
        const global = program.opts<GlobalOptions>();
        if (!global.quiet) output({ created: file }, global.format);
        setCode(ExitCode.success);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        setCode(ExitCode.io);
      }
    });

  program
    .command("validate")
    .argument("<path>", "EngineeringSpec file or directory")
    .option("--strict-external")
    .option("--schema-only")
    .option("--no-profile-resolution")
    .addOption(new Option("--format <format>", "output format").choices(["text", "json", "github", "markdown"]))
    .action(async (input, options, command) => {
      try {
        const global = command.optsWithGlobals() as GlobalOptions;
        const report = await validatePath(input, {
          strict: Boolean(global.strict),
          strictExternal: Boolean(options.strictExternal),
          schemaOnly: Boolean(options.schemaOnly),
          resolveProfiles: options.profileResolution !== false,
        });
        if (!global.quiet) {
          if (global.format === "json") output(serializableReport(report), "json");
          else if (global.format === "github") {
            for (const diagnostic of report.diagnostics) console.log(formatGitHubDiagnostic(diagnostic));
            console.log(`::${report.valid ? "notice" : "error"} title=EngineeringSpec::${report.files.length} document(s), ${report.errors} error(s), ${report.warnings} warning(s)`);
            if (process.env.GITHUB_STEP_SUMMARY) {
              await appendFile(process.env.GITHUB_STEP_SUMMARY, `${formatValidationMarkdown(report)}\n`, "utf8");
            }
          } else if (global.format === "markdown") output(formatValidationMarkdown(report), "text");
          else output(textReport(report), "text");
        }
        setCode(validationCode(report.diagnostics, global.strict));
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        setCode(ExitCode.io);
      }
    });

  program.command("normalize").argument("<file>").option("--output <path>").option("--include-source-locations").option("--digest").action(async (file, options) => {
    try {
      const result = await validateFile(file);
      if (!result.spec || result.diagnostics.some((item) => item.severity === "error")) {
        console.error(formatDiagnostics(result.diagnostics));
        setCode(validationCode(result.diagnostics));
        return;
      }
      const value = normalize(result.spec, { includeSourceLocations: Boolean(options.includeSourceLocations), ...(result.locations ? { sourceLocations: result.locations } : {}) });
      const json = canonicalJson(value);
      if (options.output) await writeFile(options.output, json, "utf8"); else process.stdout.write(json);
      if (options.digest) console.error(digest(value));
      setCode(ExitCode.success);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      setCode(ExitCode.io);
    }
  });

  program
    .command("inspect")
    .argument("<file>")
    .option("--summary")
    .option("--target <id>")
    .option("--path <path>")
    .option("--constraint <id>")
    .option("--contract <id>")
    .option("--verifier <id>")
    .option("--source-item <id>")
    .option("--parse-only", "skip semantic validation (debugging only)")
    .action(async (file, options, command) => {
      try {
        const global = command.optsWithGlobals() as GlobalOptions;
        if (options.parseOnly) {
          const parsed = await parseFile(file);
          if (!parsed.spec) {
            console.error(formatDiagnostics(parsed.diagnostics));
            setCode(ExitCode.validation);
            return;
          }
          output(inspect(normalize(parsed.spec), { summary: options.summary || undefined, target: options.target, path: options.path, constraint: options.constraint, contract: options.contract, verifier: options.verifier, sourceItem: options.sourceItem }), global.format);
          setCode(validationCode(parsed.diagnostics, global.strict));
          return;
        }
        const result = await validateFile(file);
        if (!result.spec || result.diagnostics.some((item) => item.severity === "error")) {
          console.error(formatDiagnostics(result.diagnostics));
          setCode(validationCode(result.diagnostics, global.strict));
          return;
        }
        output(inspect(normalize(result.spec), { summary: options.summary || undefined, target: options.target, path: options.path, constraint: options.constraint, contract: options.contract, verifier: options.verifier, sourceItem: options.sourceItem }), global.format);
        setCode(validationCode(result.diagnostics, global.strict));
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        setCode(ExitCode.io);
      }
    });

  program.command("coverage").argument("<file>").addOption(new Option("--format <format>", "output format").choices(["text", "json"])).addOption(new Option("--fail-on <level>").choices(["partial", "unknown", "uncovered"])).action(async (file, options, command) => {
    try {
      const global = command.optsWithGlobals() as GlobalOptions;
      const result = await validateFile(file);
      if (!result.spec || result.diagnostics.some((item) => item.severity === "error")) {
        console.error(formatDiagnostics(result.diagnostics));
        setCode(validationCode(result.diagnostics, global.strict));
        return;
      }
      const unknown = result.diagnostics.some((item) => item.code === "ESPR001");
      const report = coverage(normalize(result.spec), { unknownExternal: unknown });
      const text = `coverage: ${report.status}\nsource items: ${report.sourceItems.filter((item) => item.covered).length}/${report.sourceItems.length}\nconstraints: ${report.constraints.filter((item) => item.covered).length}/${report.constraints.length}\ncontracts: ${report.contracts.filter((item) => item.covered).length}/${report.contracts.length}\nevidence: ${report.evidence.filter((item) => item.covered).length}/${report.evidence.length}`;
      output(global.format === "json" ? report : text, global.format);
      const fails =
        (options.failOn === "unknown" && report.status === "unknown") ||
        (options.failOn === "partial" && report.status === "partial") ||
        (options.failOn === "uncovered" && [...report.sourceItems, ...report.constraints, ...report.contracts, ...report.evidence].some((item) => !item.covered));
      setCode(fails ? ExitCode.validation : validationCode(result.diagnostics, global.strict));
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      setCode(ExitCode.io);
    }
  });

  program
    .command("gate")
    .description("Fail closed if git changes fall outside declared targets (diff-scope gate)")
    .argument("<file>", "EngineeringSpec file path (workspace path; content may load from --spec-from)")
    .option("--base <ref>", "git base ref for diff (e.g. origin/main)")
    .option("--head <ref>", "git head ref", "HEAD")
    .addOption(new Option("--spec-from <source>", "load contract from workspace file or git base SHA (default: base when --base is set)").choices(["workspace", "base"]))
    .option("--require-status <status>", "require metadata.status (repeatable)", (value, previous: string[] = []) => previous.concat(value), [])
    .option("--changed <path>", "explicit changed path (repeatable; skips git)", (value, previous: string[] = []) => previous.concat(value), [])
    .addOption(new Option("--change-kind <kind>", "kind for --changed paths").choices(["added", "modified", "deleted", "renamed"]).default("modified"))
    .option("--receipt <path>", "write durable gate-receipt.json to this path")
    .addOption(new Option("--format <format>", "output format").choices(["text", "json", "github", "markdown"]))
    .action(async (file, options, command) => {
      try {
        const global = command.optsWithGlobals() as GlobalOptions;
        const specFromSource = command.getOptionValueSource("specFrom");
        const specFrom: SpecSource =
          specFromSource === "cli"
            ? (options.specFrom as SpecSource)
            : options.base
              ? "base"
              : "workspace";
        if (specFrom === "base" && !options.base) {
          console.error("gate --spec-from base requires --base <ref>");
          setCode(ExitCode.usage);
          return;
        }
        const requireStatus = (options.requireStatus as string[]).map((value) => value.trim()).filter(Boolean);
        for (const status of requireStatus) {
          if (!(STATUS_VALUES as readonly string[]).includes(status)) {
            console.error(`invalid --require-status ${JSON.stringify(status)}; expected one of ${STATUS_VALUES.join(", ")}`);
            setCode(ExitCode.usage);
            return;
          }
        }

        let baseSha: string | undefined;
        let headSha: string | undefined;
        if (options.base) {
          try {
            baseSha = await resolveCommitSha(options.base);
            headSha = await resolveCommitSha(options.head);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const diagnostic = { code: Codes.gateDiff, severity: "error" as const, message, file };
            if (!global.quiet) {
              if (global.format === "github") console.log(formatGitHubDiagnostic(diagnostic));
              else console.error(formatDiagnostics([diagnostic]));
            }
            setCode(ExitCode.io);
            return;
          }
        }

        let result;
        let loadedLabel = file;
        try {
          if (specFrom === "base") {
            const relative = await resolveGitRelativePath(file);
            const content = await readGitBlob(baseSha!, relative);
            loadedLabel = `${baseSha}:${relative}`;
            result = await validateMarkdown(content, loadedLabel);
          } else {
            result = await validateFile(file);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const diagnostic = { code: Codes.gateDiff, severity: "error" as const, message, file };
          if (!global.quiet) {
            if (global.format === "github") console.log(formatGitHubDiagnostic(diagnostic));
            else console.error(formatDiagnostics([diagnostic]));
          }
          setCode(ExitCode.io);
          return;
        }

        if (!result.spec || result.diagnostics.some((item) => item.severity === "error")) {
          if (!global.quiet) {
            if (global.format === "github") for (const diagnostic of result.diagnostics) console.log(formatGitHubDiagnostic(diagnostic));
            else console.error(formatDiagnostics(result.diagnostics));
          }
          setCode(validationCode(result.diagnostics, global.strict));
          return;
        }
        const spec = normalize(result.spec);
        const specDigest = digest(spec);

        let changed;
        try {
          if (options.changed.length > 0) {
            changed = changedFromPathList(options.changed, options.changeKind as ChangeKind);
          } else if (baseSha && headSha) {
            changed = await collectGitDiff({ base: baseSha, head: headSha });
          } else {
            console.error("gate requires --base <ref> or one or more --changed <path>");
            setCode(ExitCode.usage);
            return;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const diagnostic = { code: Codes.gateDiff, severity: "error" as const, message, file: loadedLabel };
          if (!global.quiet) {
            if (global.format === "github") console.log(formatGitHubDiagnostic(diagnostic));
            else console.error(formatDiagnostics([diagnostic]));
          }
          setCode(ExitCode.io);
          return;
        }

        const report = gateDiff(spec, changed, {
          ...(options.base !== undefined ? { base: options.base as string } : {}),
          ...(options.head !== undefined ? { head: options.head as string } : {}),
          ...(baseSha !== undefined ? { baseSha } : {}),
          ...(headSha !== undefined ? { headSha } : {}),
          specDigest,
          specSource: specFrom,
          ...(requireStatus.length > 0 ? { requireStatus: requireStatus as Status[] } : {}),
        });
        const failed =
          !report.valid ||
          (global.strict && report.diagnostics.some((item) => item.severity === "warning"));
        const receipt = buildGateReceipt(report, { toolVersion: packageVersion() });
        if (options.receipt) {
          await writeGateReceipt(options.receipt as string, receipt);
        }
        const text = [
          `${failed ? "gate: fail" : "gate: pass"} — ${report.specId ?? loadedLabel}`,
          `source: ${report.specSource ?? "workspace"}${report.specDigest ? ` digest=${report.specDigest}` : ""}`,
          report.baseSha || report.headSha
            ? `commits: base=${report.baseSha ?? "n/a"} head=${report.headSha ?? "n/a"}`
            : undefined,
          `changed: ${report.changed.length}, allowed: ${report.allowed.length}, violations: ${report.violations.length}${report.changedDigest ? `, changedDigest=${report.changedDigest}` : ""}`,
          options.receipt ? `receipt: ${options.receipt}` : undefined,
          ...report.violations.map((item) => `x ${item.message}`),
        ]
          .filter(Boolean)
          .join("\n");
        const markdown = [
          `## EngineeringSpec gate`,
          "",
          failed ? `❌ Fail — \`${report.specId ?? loadedLabel}\`` : `✅ Pass — \`${report.specId ?? loadedLabel}\``,
          "",
          `- Spec source: \`${report.specSource ?? "workspace"}\``,
          report.specDigest ? `- Spec digest: \`${report.specDigest}\`` : undefined,
          report.baseSha ? `- Base: \`${report.baseSha}\`` : undefined,
          report.headSha ? `- Head: \`${report.headSha}\`` : undefined,
          report.changedDigest ? `- Changed digest: \`${report.changedDigest}\`` : undefined,
          options.receipt ? `- Receipt: \`${options.receipt}\`` : undefined,
          "",
          `| Changed | Allowed | Violations |`,
          `|---:|---:|---:|`,
          `| ${report.changed.length} | ${report.allowed.length} | ${report.violations.length} |`,
          ...(report.violations.length
            ? ["", "### Violations", ...report.violations.map((item) => `- \`${item.file}\`: ${item.message}`)]
            : []),
        ]
          .filter((line) => line !== undefined)
          .join("\n");

        if (!global.quiet) {
          if (global.format === "json") output({ report, receipt }, "json");
          else if (global.format === "github") {
            for (const diagnostic of report.diagnostics) console.log(formatGitHubDiagnostic(diagnostic));
            console.log(`::${failed ? "error" : "notice"} title=EngineeringSpec gate::${report.violations.length} violation(s)`);
            if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`, "utf8");
          } else if (global.format === "markdown") output(markdown, "text");
          else output(text, "text");
        }
        setCode(failed ? ExitCode.validation : ExitCode.success);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        setCode(ExitCode.io);
      }
    });

  return program;
}

export async function run(argv = process.argv): Promise<number> {
  let code = 0;
  const program = createProgram((value) => { code = Math.max(code, value); });
  program.exitOverride();
  try {
    await program.parseAsync(argv);
  } catch (error) {
    if (error instanceof CommanderError) {
      if (error.code === "commander.helpDisplayed" || error.code === "commander.version") return 0;
      return ExitCode.usage;
    }
    throw error;
  }
  return code;
}
