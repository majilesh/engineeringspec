import { access, appendFile, readFile, writeFile } from "node:fs/promises";
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
import { collectGitDiff, collectGitStagedDiff, collectGitWorktreeDiff, changedFromPathList } from "../gate/collectDiff.js";
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
import { agentCheck } from "./agentCheck.js";
import { buildAgentContext, explainPath } from "../query/agentContext.js";
import { adoptRepository } from "./adopt.js";
import { summarizeAgentBenchmark } from "./benchmark.js";

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
      const unknown = result.diagnostics.some((item) => item.code === Codes.profileUnavailable);
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
    .command("adopt")
    .description("Safely scaffold neutral agent and CI integration files")
    .argument("[directory]", "repository directory", ".")
    .requiredOption("--spec <path>", "repository-relative EngineeringSpec path")
    .option("--base <ref>", "approved base ref (auto-detects origin/HEAD; falls back to origin/main)")
    .option("--force", "overwrite existing integration files")
    .option("--merge", "merge agent instructions into existing text files; structured files are skipped")
    .option("--dry-run", "report files without writing them")
    .action(async (directory, options, command) => {
      try {
        const global = command.optsWithGlobals() as GlobalOptions;
        const result = await adoptRepository({
          root: directory,
          specPath: options.spec,
          baseRef: options.base,
          force: Boolean(options.force),
          merge: Boolean(options.merge),
          dryRun: Boolean(options.dryRun),
        });
        if (!global.quiet) output(result, global.format);
        setCode(ExitCode.success);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        setCode(ExitCode.io);
      }
    });

  program
    .command("benchmark")
    .description("Summarize paired agent-impact benchmark records")
    .argument("<files...>", "JSON files containing one record or an array of records")
    .addOption(new Option("--format <format>", "output format").choices(["text", "json"]))
    .action(async (files, _options, command) => {
      try {
        const global = command.optsWithGlobals() as GlobalOptions;
        const records: unknown[] = [];
        for (const file of files as string[]) {
          const parsed: unknown = JSON.parse(await readFile(file, "utf8"));
          records.push(...(Array.isArray(parsed) ? parsed : [parsed]));
        }
        const report = summarizeAgentBenchmark(records);
        const percent = (value: number): string => `${(value * 100).toFixed(1)}%`;
        const text = [
          `benchmark: ${report.tasks} task(s), ${report.baseline.runs + report.engineeringspec.runs} run(s)`,
          `success: ${percent(report.baseline.successRate)} -> ${percent(report.engineeringspec.successRate)} (${percent(report.delta.successRate)})`,
          `scope violations reduced: ${report.delta.scopeViolationReduction.toFixed(2)} per run`,
          `review corrections reduced: ${report.delta.reviewCorrectionReduction.toFixed(2)} per run`,
          `duration delta: ${report.delta.durationSeconds.toFixed(1)}s`,
          `token delta: ${report.delta.tokens.toFixed(0)}`,
        ].join("\n");
        if (!global.quiet) output(global.format === "json" ? report : text, global.format);
        setCode(ExitCode.success);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        setCode(ExitCode.validation);
      }
    });

  program
    .command("check")
    .description("Run the read-only agent pre-completion check over the complete working state")
    .argument("<file>", "EngineeringSpec file")
    .option("--base <ref>", "approved base ref; loads the contract from base by default")
    .option("--head <ref>", "git head ref", "HEAD")
    .addOption(new Option("--spec-from <source>").choices(["workspace", "base"]))
    .option("--staged", "check committed and staged changes only")
    .option("--no-worktree", "exclude working-tree changes and check committed changes only")
    .addOption(new Option("--format <format>", "output format").choices(["text", "json", "markdown"]))
    .action(async (file, options, command) => {
      try {
        const global = command.optsWithGlobals() as GlobalOptions;
        const report = await agentCheck({
          file,
          ...(options.base ? { base: options.base as string } : {}),
          head: options.head as string,
          ...(options.specFrom ? { specFrom: options.specFrom as SpecSource } : {}),
          strict: Boolean(global.strict),
          staged: Boolean(options.staged),
          worktree: options.staged ? false : options.worktree !== false,
        });
        const changed = report.gate?.changed.length ?? 0;
        const violations = report.gate?.violations.length ?? 0;
        const text = [
          `check: ${report.valid ? "pass" : "fail"}`,
          `contract: ${report.specSource}${report.specDigest ? ` ${report.specDigest}` : ""}`,
          `working state: ${changed} changed, ${violations} violations`,
          report.coverage ? `declared coverage: ${report.coverage.status}` : undefined,
          ...report.diagnostics.map((diagnostic) => `${diagnostic.severity}: ${diagnostic.code} ${diagnostic.message}`),
        ].filter(Boolean).join("\n");
        const markdown = [
          `## EngineeringSpec agent check`,
          "",
          report.valid ? "✅ Pass" : "❌ Fail",
          "",
          `- Contract source: \`${report.specSource}\``,
          report.specDigest ? `- Contract digest: \`${report.specDigest}\`` : undefined,
          `- Working state: ${changed} changed path(s)`,
          `- Violations: ${violations}`,
          report.coverage ? `- Declared coverage: \`${report.coverage.status}\`` : undefined,
          ...(report.gate?.violations.length
            ? ["", "### Violations", ...report.gate.violations.map((violation) => `- \`${violation.file}\`: ${violation.message}`)]
            : []),
        ].filter((line) => line !== undefined).join("\n");
        if (!global.quiet) {
          if (global.format === "json") output(report, "json");
          else if (global.format === "markdown") output(markdown, "text");
          else output(text, "text");
        }
        setCode(report.valid ? ExitCode.success : ExitCode.validation);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        setCode(ExitCode.io);
      }
    });

  program
    .command("context")
    .description("Print the smallest relevant contract context for paths or the working state")
    .argument("<file>", "EngineeringSpec file")
    .option("--path <path>", "path to include (repeatable)", (value, previous: string[] = []) => previous.concat(value), [])
    .option("--base <ref>", "base ref for --worktree or --staged")
    .option("--head <ref>", "git head ref", "HEAD")
    .addOption(new Option("--spec-from <source>").choices(["workspace", "base"]))
    .option("--worktree", "derive paths from the complete working state")
    .option("--staged", "derive paths from committed and staged changes")
    .addOption(new Option("--format <format>", "output format").choices(["json", "markdown"]).default("json"))
    .action(async (file, options, command) => {
      try {
        const global = command.optsWithGlobals() as GlobalOptions;
        const sources = [options.path.length > 0, Boolean(options.worktree), Boolean(options.staged)].filter(Boolean).length;
        if (sources !== 1) {
          console.error("context requires exactly one of --path, --worktree, or --staged");
          setCode(ExitCode.usage);
          return;
        }
        const specFrom: SpecSource = options.specFrom ?? (options.base ? "base" : "workspace");
        if (specFrom === "base" && !options.base) {
          console.error("context --spec-from base requires --base <ref>");
          setCode(ExitCode.usage);
          return;
        }
        const validation = specFrom === "base"
          ? await (async () => {
              const baseSha = await resolveCommitSha(options.base);
              const relative = await resolveGitRelativePath(file);
              return validateMarkdown(await readGitBlob(baseSha, relative), `${baseSha}:${relative}`);
            })()
          : await validateFile(file);
        const failed = !validation.spec
          || validation.diagnostics.some((diagnostic) => diagnostic.severity === "error")
          || (global.strict && validation.diagnostics.some((diagnostic) => diagnostic.severity === "warning"));
        if (failed) {
          console.error(formatDiagnostics(validation.diagnostics));
          setCode(validationCode(validation.diagnostics, global.strict));
          return;
        }
        const changed = options.path.length > 0
          ? changedFromPathList(options.path)
          : options.staged
            ? await collectGitStagedDiff({ ...(options.base ? { base: options.base } : {}), head: options.head })
            : await collectGitWorktreeDiff({ ...(options.base ? { base: options.base } : {}), head: options.head });
        const report = buildAgentContext(normalize(validation.spec!), changed);
        if (global.quiet) {
          // Query is still evaluated for validation and exit status.
        } else if (global.format === "markdown") {
          const markdown = report.paths.flatMap((entry) => [
            `### \`${entry.path}\` (${entry.kind})`,
            `- Targets: ${entry.targets.map((target) => target.id).join(", ") || "none"}`,
            `- Constraints: ${entry.constraints.map((constraint) => constraint.id).join(", ") || "none"}`,
            `- Contracts: ${entry.contracts.map((contract) => contract.id).join(", ") || "none"}`,
            `- Verification: ${entry.verification.map((verification) => verification.id).join(", ") || "none"}`,
            "",
          ]).join("\n");
          output(markdown, "text");
        } else output(report, "json");
        setCode(ExitCode.success);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        setCode(ExitCode.io);
      }
    });

  program
    .command("explain")
    .description("Explain why one path and change kind is allowed or denied")
    .argument("<file>", "EngineeringSpec file")
    .requiredOption("--path <path>")
    .option("--base <ref>", "approved base ref; loads the contract from base by default")
    .addOption(new Option("--spec-from <source>").choices(["workspace", "base"]))
    .addOption(new Option("--change-kind <kind>").choices(["added", "modified", "deleted"]).default("modified"))
    .action(async (file, options, command) => {
      try {
        const global = command.optsWithGlobals() as GlobalOptions;
        const specFrom: SpecSource = options.specFrom ?? (options.base ? "base" : "workspace");
        if (specFrom === "base" && !options.base) {
          console.error("explain --spec-from base requires --base <ref>");
          setCode(ExitCode.usage);
          return;
        }
        const validation = specFrom === "base"
          ? await (async () => {
              const baseSha = await resolveCommitSha(options.base);
              const relative = await resolveGitRelativePath(file);
              return validateMarkdown(await readGitBlob(baseSha, relative), `${baseSha}:${relative}`);
            })()
          : await validateFile(file);
        if (!validation.spec
          || validation.diagnostics.some((diagnostic) => diagnostic.severity === "error")
          || (global.strict && validation.diagnostics.some((diagnostic) => diagnostic.severity === "warning"))) {
          console.error(formatDiagnostics(validation.diagnostics));
          setCode(validationCode(validation.diagnostics, global.strict));
          return;
        }
        const report = explainPath(normalize(validation.spec), options.path, options.changeKind as ChangeKind);
        if (!global.quiet) output(report, global.format);
        setCode(report.allowed ? ExitCode.success : ExitCode.validation);
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
    .option("--worktree", "gate committed, staged, unstaged, deleted, renamed, and untracked files")
    .option("--staged", "gate committed and staged files relative to the selected base")
    .addOption(new Option("--change-kind <kind>", "kind for --changed paths").choices(["added", "modified", "deleted", "renamed"]).default("modified"))
    .option("--receipt <path>", "write durable gate-receipt.json to this path")
    .addOption(new Option("--format <format>", "output format").choices(["text", "json", "github", "markdown"]))
    .action(async (file, options, command) => {
      try {
        const global = command.optsWithGlobals() as GlobalOptions;
        const selectedDiffSources = [options.changed.length > 0, Boolean(options.worktree), Boolean(options.staged)].filter(Boolean).length;
        if (selectedDiffSources > 1) {
          console.error("gate accepts only one of --changed, --worktree, or --staged");
          setCode(ExitCode.usage);
          return;
        }
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
        if (options.base || options.worktree || options.staged) {
          try {
            if (options.base) baseSha = await resolveCommitSha(options.base);
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

        const loadFailed =
          !result.spec ||
          result.diagnostics.some((item) => item.severity === "error") ||
          (global.strict && result.diagnostics.some((item) => item.severity === "warning"));
        if (loadFailed) {
          if (!global.quiet) {
            if (global.format === "github") for (const diagnostic of result.diagnostics) console.log(formatGitHubDiagnostic(diagnostic));
            else console.error(formatDiagnostics(result.diagnostics));
          }
          setCode(validationCode(result.diagnostics, global.strict));
          return;
        }
        const spec = normalize(result.spec!);
        const specDigest = digest(spec);

        let changed;
        try {
          if (options.changed.length > 0) {
            changed = changedFromPathList(options.changed, options.changeKind as ChangeKind);
          } else if (options.worktree) {
            changed = await collectGitWorktreeDiff({
              ...(baseSha ? { base: baseSha } : {}),
              ...(headSha ? { head: headSha } : {}),
            });
          } else if (options.staged) {
            changed = await collectGitStagedDiff({
              ...(baseSha ? { base: baseSha } : {}),
              ...(headSha ? { head: headSha } : {}),
            });
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
        // Load-time validation warnings already failed closed under --strict above.
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
