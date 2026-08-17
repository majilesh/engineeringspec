import { access, appendFile, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
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
import { gitShowToplevel, readGitBlob, resolveCommitSha, resolveGitRelativePath, type SpecSource } from "../gate/loadSpec.js";
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
import { selectSpecs } from "../routing/select.js";
import { diagnoseRepository } from "./doctor.js";
import { workflowStatus } from "./status.js";
import { transitionStatus } from "./transition.js";
import { buildCatalogue, catalogueHtml } from "./catalogue.js";
import { importBackstageCatalogue } from "./architecture.js";
import { proposeDraft } from "./propose.js";
import { buildReview, reviewMarkdown, reviewText } from "./review.js";
import { prepareChange, prepareMarkdown, prepareText } from "./prepare.js";
import { measureScope } from "./measure.js";
import { nextAction, nextText } from "./next.js";
import { workOnContract } from "./work.js";
import { finishContract } from "./finish.js";
import { resolveRepositoryConfig } from "../config/repositoryConfig.js";

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
    .option("--repository-root <path>", "repository root for repository-relative local source paths")
    .addOption(new Option("--format <format>", "output format").choices(["text", "json", "github", "markdown"]))
    .action(async (input, options, command) => {
      try {
        const global = command.optsWithGlobals() as GlobalOptions;
        let repositoryRoot:string|undefined;
        if(options.profileResolution!==false) {
          if(options.repositoryRoot) repositoryRoot=path.resolve(String(options.repositoryRoot));
          else {
            try { repositoryRoot=await gitShowToplevel(process.cwd()); } catch { repositoryRoot=undefined; }
          }
        }
        const report = await validatePath(input, {
          strict: Boolean(global.strict),
          strictExternal: Boolean(options.strictExternal),
          schemaOnly: Boolean(options.schemaOnly),
          resolveProfiles: options.profileResolution !== false,
          ...(repositoryRoot?{repositoryRoot}:{}),
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
    .option("--spec <path>", "repository-relative EngineeringSpec path")
    .option("--quickstart", "create a draft first contract, neutral agent guidance, CI, and CODEOWNERS")
    .option("--id <id>", "quickstart draft identifier", "ES-first-change")
    .option("--title <title>", "quickstart draft title", "First governed engineering change")
    .option("--owner <owner>", "quickstart owning team", "engineering")
    .option("--maintainer <github-owner>", "CODEOWNERS user or org/team; inferred from GitHub origin when possible")
    .option("--base <ref>", "approved base ref (auto-detects origin/HEAD; falls back to origin/main)")
    .option("--force", "overwrite existing integration files")
    .option("--merge", "merge agent instructions into existing text files; structured files are skipped")
    .option("--upgrade", "upgrade recognizably managed guidance and immutable Action pins")
    .option("--dry-run", "report files without writing them")
    .action(async (directory, options, command) => {
      try {
        const global = command.optsWithGlobals() as GlobalOptions;
        const result = await adoptRepository({
          root: directory,
          ...(options.spec ? { specPath: options.spec } : {}),
          baseRef: options.base,
          force: Boolean(options.force),
          merge: Boolean(options.merge),
          upgrade: Boolean(options.upgrade),
          dryRun: Boolean(options.dryRun),
          quickstart: Boolean(options.quickstart),
          id: options.id,
          title: options.title,
          owner: options.owner,
          ...(options.maintainer ? { maintainer: options.maintainer } : {}),
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
    .option("--require-publishable", "fail unless retained evidence is complete, observed, and publishable")
    .action(async (files, options, command) => {
      try {
        const global = command.optsWithGlobals() as GlobalOptions;
        const records: unknown[] = [];
        for (const file of files as string[]) {
          const parsed: unknown = JSON.parse(await readFile(file, "utf8"));
          records.push(...(Array.isArray(parsed) ? parsed : [parsed]));
        }
        const report = summarizeAgentBenchmark(records);
        const percent = (value: number): string => `${(value * 100).toFixed(1)}%`;
        const optional = (value: number | null, suffix = ""): string => value === null ? "missing" : `${value.toFixed(2)}${suffix}`;
        const missing = Object.values(report.missingData).reduce((total, value) => total + value, 0);
        const text = [
          `benchmark: ${report.tasks} task(s), ${report.pairs} pair(s), ${report.runs} run(s)`,
          `evidence: ${report.interpretation.resultClass}; observed ${report.evidence.observedRuns}, example ${report.evidence.exampleRuns}, unclassified ${report.evidence.unclassifiedRuns}`,
          `evidence quality: ${report.interpretation.evidenceQuality}; publishable: ${report.interpretation.publishable}`,
          `success: ${percent(report.baseline.successRate)} -> ${percent(report.engineeringspec.successRate)} (${percent(report.delta.successRate)})`,
          `failed runs retained: baseline ${report.baseline.failedRuns}, engineeringspec ${report.engineeringspec.failedRuns}`,
          `scope violations reduced: ${report.delta.scopeViolationReduction.toFixed(2)} per run`,
          `scope precision: ${report.delta.scopePrecision === null ? "not interpretable" : percent(report.delta.scopePrecision)} (${report.engineeringspec.scope.assessment}; ${report.engineeringspec.scope.catchAllRuns} catch-all run(s))`,
          `unauthorized paths changed reduction: ${optional(report.delta.unauthorizedPathsChangedReduction)}`,
          `unauthorized paths merged reduction: ${optional(report.delta.unauthorizedPathsMergedReduction)}`,
          `review corrections reduced: ${report.delta.reviewCorrectionReduction.toFixed(2)} per run`,
          `review cycles: ${optional(report.engineeringspec.averageReviewCycles)}`,
          `contract authoring/review: ${optional(report.engineeringspec.averageContractAuthoringSeconds, "s")} / ${optional(report.engineeringspec.averageContractReviewSeconds, "s")}`,
          `amended engineeringspec runs: ${report.pairedOutcomes.amendedEngineeringSpecRuns}`,
          `first-pass gate success: ${report.engineeringspec.firstPassGateSuccessRate === null ? "missing" : percent(report.engineeringspec.firstPassGateSuccessRate)}`,
          `exploration breadth: ${optional(report.engineeringspec.averageExploredPaths, " paths")}`,
          `duration delta: ${report.delta.durationSeconds.toFixed(1)}s`,
          `slower engineeringspec runs retained: ${report.pairedOutcomes.slowerEngineeringSpecRuns}`,
          `token delta: ${report.delta.tokens.toFixed(0)}`,
          `missing optional observations: ${missing}`,
          `interpretation: ${report.interpretation.note}`,
        ].join("\n");
        if (!global.quiet) output(global.format === "json" ? report : text, global.format);
        setCode(options.requirePublishable && !report.interpretation.publishable ? ExitCode.validation : ExitCode.success);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        setCode(ExitCode.validation);
      }
    });

  program
    .command("doctor")
    .description("Diagnose repository readiness without changing files")
    .argument("[directory]", "repository directory", ".")
    .option("--spec-dir <directory>", "repository-relative EngineeringSpec directory", "docs/engineering-specs")
    .option("--base <ref>", "trusted base ref", "origin/main")
    .addOption(new Option("--format <format>", "output format").choices(["text", "json"]))
    .action(async (directory, options, command) => {
      try {
        const global = command.optsWithGlobals() as GlobalOptions;
        const report = await diagnoseRepository({
          root: directory,
          specDirectory: options.specDir,
          base: options.base,
          strict: Boolean(global.strict),
        });
        const text = [
          `doctor: ${report.valid ? "ready" : "needs attention"}`,
          `base: ${report.baseSha ?? `${report.base} (unresolved)`}`,
          `contracts: ${report.candidates} (${report.lifecycle.approved} approved, ${report.lifecycle.proposed} proposed, ${report.lifecycle.implemented} implemented)`,
          ...report.checks.map((check) => `${check.status === "pass" ? "✓" : check.status === "warning" ? "!" : "x"} ${check.id}: ${check.message}${check.remediation ? ` Next: ${check.remediation}` : ""}`),
        ].join("\n");
        if (!global.quiet) output(global.format === "json" ? report : text, global.format);
        setCode(report.valid ? ExitCode.success : ExitCode.validation);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        setCode(ExitCode.io);
      }
    });

  program
    .command("status")
    .description("Summarize contract lifecycle and the complete working state")
    .option("--spec-dir <directory>", "repository-relative EngineeringSpec directory; defaults from trusted config")
    .option("--base <ref>", "trusted base ref; safely auto-resolved when omitted")
    .option("--head <ref>", "git head ref", "HEAD")
    .option("--changed <path>", "explicit changed path (repeatable)", (value, previous: string[] = []) => previous.concat(value), [])
    .option("--staged", "inspect committed and staged changes only")
    .option("--no-worktree", "exclude working-tree changes")
    .option("--allow-contract-only", "allow strictly validated specification-directory-only governance changes")
    .addOption(new Option("--change-kind <kind>").choices(["added", "modified", "deleted", "renamed"]).default("modified"))
    .addOption(new Option("--format <format>", "output format").choices(["text", "json"]))
    .action(async (options, command) => {
      try {
        const global = command.optsWithGlobals() as GlobalOptions;
        const config = await resolveRepositoryConfig({ ...(options.base ? { base: options.base } : {}) });
        if (options.changed.length > 0 && options.staged) {
          console.error("status accepts only one of --changed or --staged");
          setCode(ExitCode.usage);
          return;
        }
        const report = await workflowStatus({
          specDirectory: options.specDir ?? config.config.specDirectory,
          base: config.baseSha,
          head: options.head,
          strict: Boolean(global.strict || config.config.strict),
          staged: Boolean(options.staged),
          worktree: options.staged ? false : options.worktree !== false,
          ...(options.changed.length ? { changed: changedFromPathList(options.changed, options.changeKind as ChangeKind) } : {}),
          allowContractOnly: Boolean(options.allowContractOnly),
        });
        const lifecycle = STATUS_VALUES.map((status) => `${status}=${report.lifecycle[status]}`).join(", ");
        const text = [
          `status: ${report.valid ? "ready" : "blocked"}`,
          `base: ${report.baseSha}`,
          `contracts: ${report.candidates} (${lifecycle})`,
          `working state: ${report.workingState.changed} changed, ${report.workingState.selected} selected, ${report.workingState.violations} violations`,
          `selected contracts: ${report.selectedContracts.join(", ") || "none"}`,
          `routed targets: ${report.routedTargets.join(", ") || "none"}`,
          `declared coverage: ${report.coverage.status}`,
          `change classification: ${report.routing.governance.classification}`,
          `next: ${report.next.stage} — ${report.next.message}`,
          ...report.routing.diagnostics.map((diagnostic) => `${diagnostic.severity}: ${diagnostic.code} ${diagnostic.message}`),
        ].join("\n");
        if (!global.quiet) output(global.format === "json" ? report : text, global.format);
        setCode(report.valid ? ExitCode.success : ExitCode.validation);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        setCode(ExitCode.io);
      }
    });

  program
    .command("next")
    .description("Report the next safe action using trusted repository defaults")
    .option("--base <ref>", "trusted base ref override")
    .addOption(new Option("--format <format>", "output format").choices(["text", "json"]))
    .action(async (options, command) => {
      try {
        const global = command.optsWithGlobals() as GlobalOptions;
        const report = await nextAction({ ...(options.base ? { base: options.base } : {}) });
        if (!global.quiet) output(global.format === "json" ? report : nextText(report), global.format);
        setCode(report.valid ? ExitCode.success : ExitCode.validation);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        setCode(ExitCode.io);
      }
    });

  program
    .command("work")
    .description("Load a base-pinned implementation brief using trusted repository defaults")
    .argument("<contract-id>", "exact approved EngineeringSpec contract ID")
    .option("--base <ref>", "trusted base ref override")
    .addOption(new Option("--format <format>", "output format").choices(["text", "json", "markdown"]))
    .action(async (contractId, options, command) => {
      try {
        const global = command.optsWithGlobals() as GlobalOptions;
        const report = await workOnContract({ contractId, ...(options.base ? { base: options.base } : {}) });
        if (!global.quiet) {
          if (global.format === "json") output(report, "json");
          else if (global.format === "markdown") output(prepareMarkdown(report.brief), "text");
          else output(prepareText(report.brief), "text");
        }
        setCode(report.result === "ready" ? ExitCode.success : ExitCode.validation);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        setCode(ExitCode.io);
      }
    });

  program
    .command("finish")
    .description("Check an implementation, prepare trusted evidence metadata, and optionally write its monotonic close")
    .argument("<contract-id>", "exact approved EngineeringSpec contract ID")
    .option("--base <ref>", "trusted base ref override")
    .option("--staged", "evaluate committed and staged changes; disclose excluded working state")
    .option("--evidence <path>", "bounded external verifier-state JSON")
    .option("--write-closure", "write only the approved-to-implemented status transition")
    .option("--output <path>", "write receipt and PR metadata JSON")
    .addOption(new Option("--format <format>", "output format").choices(["text", "json", "markdown"]))
    .action(async (contractId, options, command) => {
      try {
        const global = command.optsWithGlobals() as GlobalOptions;
        const report = await finishContract({
          contractId,
          ...(options.base ? { base: options.base } : {}),
          staged: Boolean(options.staged),
          ...(options.evidence ? { evidence: options.evidence } : {}),
          writeClosure: Boolean(options.writeClosure),
          ...(options.output ? { output: options.output } : {}),
        });
        const text = report.result === "ready" && report.receipt
          ? [
              "finish: ready",
              `authority: base ${report.receipt.authority.baseSha}`,
              `contract: ${report.receipt.authority.contractId} revision ${report.receipt.authority.specRevision}`,
              `change: ${report.receipt.change.digest}; complete working state ${report.receipt.change.completeWorkingState}`,
              `classification: ${report.receipt.authorization.classification}`,
              `closure: ${report.closureWritten ? "written" : "not written"}`,
              ...report.receipt.verification.map((item) => `verification: ${item.verifierId} ${item.state}`),
            ].join("\n")
          : `${reviewText(report.review)}\nfinish: blocked`;
        if (!global.quiet) {
          if (global.format === "json") output(report, "json");
          else if (global.format === "markdown" && report.pr) output(report.pr.body, "text");
          else output(text, "text");
        }
        setCode(report.result === "ready" ? ExitCode.success : ExitCode.validation);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        setCode(ExitCode.io);
      }
    });

  program
    .command("transition")
    .description("Preview or write a validated lifecycle status-only transition")
    .argument("<file>", "EngineeringSpec file")
    .requiredOption("--to <status>", "target lifecycle status")
    .option("--write", "write the status-only transition after validation")
    .action(async (file, options, command) => {
      try {
        const global = command.optsWithGlobals() as GlobalOptions;
        if (!STATUS_VALUES.includes(options.to as Status)) {
          console.error(`--to must be one of ${STATUS_VALUES.join(", ")}`);
          setCode(ExitCode.usage);
          return;
        }
        const result = await transitionStatus(file, options.to as Status, Boolean(options.write));
        const text = [
          `transition: ${result.changed ? result.written ? "written" : "preview" : "unchanged"}`,
          `file: ${result.file}`,
          `${result.from} -> ${result.to}`,
          result.preview,
          result.written ? "next: review and submit this lifecycle-only change; no Git action was performed" : "next: rerun with --write only after review",
        ].join("\n");
        if (!global.quiet) output(global.format === "json" ? result : text, global.format);
        setCode(ExitCode.success);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        setCode(ExitCode.validation);
      }
    });

  program
    .command("propose")
    .description("Generate a deterministic draft contract from bounded local intent")
    .requiredOption("--id <id>", "EngineeringSpec identifier")
    .requiredOption("--title <title>", "change title")
    .option("--owner <owner>", "owning team", "engineering")
    .option("--output <path>", "repository-relative output path")
    .option("--issue <reference>", "inert issue reference; no network request is made")
    .option("--base <ref>", "base ref used by --from-diff")
    .option("--path <path>", "explicit target path (repeatable)", (value, previous: string[] = []) => previous.concat(value), [])
    .option("--from-diff", "infer exact paths from the complete Git working state")
    .option("--dry-run", "print the draft without writing it")
    .addOption(new Option("--format <format>", "output format").choices(["text", "json", "markdown"]))
    .action(async (options, command) => {
      try {
        const global = command.optsWithGlobals() as GlobalOptions;
        if (!options.fromDiff && options.path.length === 0) {
          console.error("propose requires --path <path> or --from-diff");
          setCode(ExitCode.usage);
          return;
        }
        const destination = options.output ?? `docs/engineering-specs/${options.id}.engineeringspec.md`;
        const { result, markdown } = await proposeDraft({
          id: options.id,
          title: options.title,
          owner: options.owner,
          output: destination,
          ...(options.issue ? { issue: options.issue } : {}),
          ...(options.base ? { base: options.base } : {}),
          paths: options.path,
          fromDiff: Boolean(options.fromDiff),
          dryRun: Boolean(options.dryRun),
        });
        if (!global.quiet) {
          if (global.format === "json") output(result, "json");
          else if (global.format === "markdown" || options.dryRun) output(markdown, "text");
          else output([
            "propose: draft",
            `output: ${result.output}`,
            `targets: ${result.paths.length}`,
            `source: ${result.source}`,
            "authority: none — review and merge an approved contract before implementation",
          ].join("\n"), "text");
        }
        setCode(ExitCode.success);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        setCode(ExitCode.validation);
      }
    });

  program
    .command("review")
    .description("Explain the base-pinned authorization decision for the complete working state")
    .option("--spec-dir <directory>", "repository-relative EngineeringSpec directory; defaults from trusted config")
    .option("--base <ref>", "trusted base ref; safely auto-resolved when omitted")
    .option("--head <ref>", "Git head ref", "HEAD")
    .option("--changed <path>", "explicit changed path (repeatable)", (value, previous: string[] = []) => previous.concat(value), [])
    .option("--staged", "inspect committed and staged changes only")
    .option("--no-worktree", "exclude working-tree changes")
    .option("--allow-contract-only", "allow strictly validated specification-directory-only governance changes")
    .addOption(new Option("--change-kind <kind>").choices(["added", "modified", "deleted", "renamed"]).default("modified"))
    .addOption(new Option("--format <format>", "output format").choices(["text", "json", "github", "markdown"]))
    .action(async (options, command) => {
      try {
        const global = command.optsWithGlobals() as GlobalOptions;
        const config = await resolveRepositoryConfig({ ...(options.base ? { base: options.base } : {}) });
        if (options.changed.length > 0 && options.staged) {
          console.error("review accepts only one of --changed or --staged");
          setCode(ExitCode.usage);
          return;
        }
        const report = await buildReview({
          specDirectory: options.specDir ?? config.config.specDirectory,
          base: config.baseSha,
          head: options.head,
          strict: Boolean(global.strict || config.config.strict),
          staged: Boolean(options.staged),
          worktree: options.staged ? false : options.worktree !== false,
          ...(options.changed.length ? { changed: changedFromPathList(options.changed, options.changeKind as ChangeKind) } : {}),
          allowContractOnly: Boolean(options.allowContractOnly),
        });
        const markdown = reviewMarkdown(report);
        if (!global.quiet) {
          if (global.format === "json") output(report, "json");
          else if (global.format === "markdown") output(markdown, "text");
          else if (global.format === "github") {
            for (const diagnostic of report.diagnostics) console.log(formatGitHubDiagnostic(diagnostic));
            console.log(`::${report.valid ? "notice" : "error"} title=EngineeringSpec review::${report.workingState.violations} violation(s)`);
            if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`, "utf8");
          } else output(reviewText(report), "text");
        }
        setCode(report.valid ? ExitCode.success : ExitCode.validation);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        setCode(ExitCode.io);
      }
    });

  program
    .command("catalogue")
    .description("Build a deterministic searchable contract catalogue")
    .argument("<directory>", "EngineeringSpec directory")
    .option("--query <text>", "filter catalogue content")
    .option("--path <path>", "filter contracts that affect a repository path")
    .addOption(new Option("--format <format>", "output format").choices(["text", "json", "html"]))
    .action(async (directory, options, command) => {
      try {
        const global = command.optsWithGlobals() as GlobalOptions;
        const report = await buildCatalogue(directory, { query: options.query, path: options.path, strict: Boolean(global.strict) });
        const format = (options.format ?? (global.format === "json" ? "json" : "text")) as "html" | "json" | "text";
        if (!global.quiet) {
          if (format === "html") process.stdout.write(catalogueHtml(report));
          else if (format === "json") output(report, "json");
          else output(`catalogue: ${report.valid ? "valid" : "invalid"}\ndocuments: ${report.documents}\nresults: ${report.entries.length}\n${report.entries.map((entry) => `${entry.id}\t${entry.status}\t${entry.title}`).join("\n")}`, "text");
        }
        setCode(report.valid ? ExitCode.success : ExitCode.validation);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        setCode(ExitCode.validation);
      }
    });

  program
    .command("architecture")
    .description("Import a read-only architecture map from a Backstage component catalogue")
    .argument("<file>", "Backstage catalog-info YAML")
    .addOption(new Option("--format <format>", "output format").choices(["text", "json"]))
    .action(async (file, _options, command) => {
      try {
        const global = command.optsWithGlobals() as GlobalOptions;
        const report = await importBackstageCatalogue(file);
        const text = [
          "architecture: read_only",
          `components: ${report.components.length}`,
          ...report.components.map((component) => `${component.id}\towner=${component.owner ?? "unknown"}\tdependencies=${component.dependencies.length}\tpaths=${component.paths.length}`),
          "authority: none — imported architecture cannot authorize implementation",
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
    .argument("[file]", "EngineeringSpec file (mutually exclusive with --spec-dir)")
    .option("--spec-dir <directory>", "base-pinned directory of approved EngineeringSpecs")
    .option("--base <ref>", "approved base ref; loads the contract from base by default")
    .option("--head <ref>", "git head ref", "HEAD")
    .addOption(new Option("--spec-from <source>").choices(["workspace", "base"]))
    .option("--staged", "check committed and staged changes only")
    .option("--no-worktree", "exclude working-tree changes and check committed changes only")
    .option("--allow-contract-only", "allow strictly validated specification-directory-only governance changes")
    .addOption(new Option("--format <format>", "output format").choices(["text", "json", "markdown"]))
    .action(async (file, options, command) => {
      try {
        const global = command.optsWithGlobals() as GlobalOptions;
        if (file && options.specDir) {
          console.error("check accepts an EngineeringSpec file or --spec-dir, not both");
          setCode(ExitCode.usage);
          return;
        }
        if (!file) {
          const config = await resolveRepositoryConfig({ ...(options.base ? { base: options.base } : {}) });
          if (options.specFrom) {
            console.error("check --spec-dir always loads candidates from base; --spec-from is not accepted");
            setCode(ExitCode.usage);
            return;
          }
          const routed = await selectSpecs({
            directory: (options.specDir as string | undefined) ?? config.config.specDirectory,
            base: config.baseSha,
            head: options.head as string,
            strict: Boolean(global.strict || config.config.strict),
            staged: Boolean(options.staged),
            worktree: options.staged ? false : options.worktree !== false,
            allowContractOnly: Boolean(options.allowContractOnly),
          });
          const text = [
            `check: ${routed.valid ? "pass" : "fail"}`,
            `contracts: base ${routed.baseSha} (${routed.candidates.filter((item) => item.eligible).length} eligible)`,
            `working state: ${routed.changed.length} changed, ${routed.routes.filter((item) => item.decision !== "selected").length} violations`,
            `declared coverage: ${routed.coverage.status}`,
            `change classification: ${routed.governance.classification}`,
            ...routed.diagnostics.map((diagnostic) => `${diagnostic.severity}: ${diagnostic.code} ${diagnostic.message}`),
          ].join("\n");
          if (!global.quiet) output(global.format === "json" ? routed : text, global.format);
          setCode(routed.valid ? ExitCode.success : ExitCode.validation);
          return;
        }
        const report = await agentCheck({
          file: file as string,
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
    .command("select")
    .description("Route changed paths to unique approved EngineeringSpecs from an immutable base tree")
    .argument("<directory>", "repository-relative EngineeringSpec candidate directory")
    .requiredOption("--base <ref>", "approved Git base ref")
    .option("--head <ref>", "git head ref", "HEAD")
    .option("--require-status <status>", "eligible lifecycle status (repeatable; defaults to approved)", (value, previous: string[] = []) => previous.concat(value), [])
    .option("--changed <path>", "explicit changed path (repeatable)", (value, previous: string[] = []) => previous.concat(value), [])
    .option("--worktree", "route the complete working state")
    .option("--staged", "route committed and staged changes")
    .option("--allow-contract-only", "allow strictly validated specification-directory-only governance changes")
    .addOption(new Option("--change-kind <kind>").choices(["added", "modified", "deleted", "renamed"]).default("modified"))
    .addOption(new Option("--format <format>", "output format").choices(["text", "json", "github", "markdown"]))
    .action(async (directory, options, command) => {
      try {
        const global = command.optsWithGlobals() as GlobalOptions;
        const sources = [options.changed.length > 0, Boolean(options.worktree), Boolean(options.staged)].filter(Boolean).length;
        if (sources > 1) {
          console.error("select accepts only one of --changed, --worktree, or --staged");
          setCode(ExitCode.usage);
          return;
        }
        const statuses = (options.requireStatus as string[]).map((value) => value.trim()).filter(Boolean);
        for (const status of statuses) {
          if (!(STATUS_VALUES as readonly string[]).includes(status)) {
            console.error(`invalid --require-status ${JSON.stringify(status)}; expected one of ${STATUS_VALUES.join(", ")}`);
            setCode(ExitCode.usage);
            return;
          }
        }
        const report = await selectSpecs({
          directory,
          base: options.base,
          head: options.head,
          strict: Boolean(global.strict),
          requiredStatuses: (statuses.length ? statuses : ["approved"]) as Status[],
          ...(options.changed.length ? { changed: changedFromPathList(options.changed, options.changeKind as ChangeKind) } : {}),
          staged: Boolean(options.staged),
          worktree: Boolean(options.worktree),
          allowContractOnly: Boolean(options.allowContractOnly),
        });
        const text = [
          `select: ${report.valid ? "pass" : "fail"}`,
          `base: ${report.baseSha}`,
          `candidates: ${report.candidates.length}, eligible: ${report.candidates.filter((item) => item.eligible).length}`,
          `changed: ${report.changed.length}, selected: ${report.routes.filter((item) => item.decision === "selected").length}`,
          `change classification: ${report.governance.classification}`,
          ...report.routes.map((route) => `${route.decision === "selected" ? "✓" : "x"} ${route.path} (${route.kind}): ${route.selected?.specId ?? route.decision}`),
          ...report.diagnostics.map((diagnostic) => `${diagnostic.severity}: ${diagnostic.code} ${diagnostic.message}`),
        ].join("\n");
        if (!global.quiet) {
          if (global.format === "github") for (const diagnostic of report.diagnostics) console.log(formatGitHubDiagnostic(diagnostic));
          else output(global.format === "json" ? report : text, global.format);
        }
        setCode(report.valid ? ExitCode.success : ExitCode.validation);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        setCode(ExitCode.io);
      }
    });

  program
    .command("measure")
    .description("Generate unsigned deterministic scope evidence from committed base and head revisions")
    .argument("<contract-id>", "exact approved EngineeringSpec contract ID")
    .requiredOption("--spec-dir <directory>", "base-pinned EngineeringSpec directory")
    .requiredOption("--base <ref>", "approved Git base ref")
    .requiredOption("--head <ref>", "committed Git head ref")
    .option("--include-paths", "explicitly include repository paths in the receipt")
    .option("--output <path>", "write the receipt to a file")
    .addOption(new Option("--format <format>", "output format").choices(["text", "json"]))
    .action(async (contractId, options, command) => {
      try {
        const global = command.optsWithGlobals() as GlobalOptions;
        const report = await measureScope({ contractId, specDirectory: options.specDir, base: options.base, head: options.head, strict: Boolean(global.strict), includePaths: Boolean(options.includePaths) });
        if (options.output) await writeFile(options.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
        const text = [
          "measure: complete (unsigned; grants no authorization)",
          `contract: ${report.contract.id} revision ${report.contract.revision}`,
          `base/head: ${report.baseSha} / ${report.headSha}`,
          `authority breadth: ${report.authorityBreadth}`,
          `paths: approved ${report.counts.approvedWritablePaths}, actual ${report.counts.actualChangedPaths}, requested ${report.counts.selectedForRequestedContract}, other ${report.counts.selectedForOtherContracts}, denied ${report.counts.denied}, ambiguous ${report.counts.ambiguous}, uncovered ${report.counts.uncovered}`,
          `scope precision: ${report.metricEligibility.scopePrecision ? "eligible" : `unavailable (${report.metricEligibility.reason})`}`,
        ].join("\n");
        if (!global.quiet) output(global.format === "json" ? report : text, global.format);
        setCode(ExitCode.success);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        setCode(ExitCode.validation);
      }
    });

  program
    .command("prepare")
    .description("Load one approved base contract as a concise pre-code implementation brief")
    .argument("<contract-id>", "exact EngineeringSpec contract ID")
    .option("--spec-dir <directory>", "base-pinned EngineeringSpec directory; defaults from trusted config")
    .option("--base <ref>", "approved Git base ref; safely auto-resolved when omitted")
    .addOption(new Option("--format <format>", "output format").choices(["text", "json", "markdown"]))
    .action(async (contractId, options, command) => {
      try {
        const global = command.optsWithGlobals() as GlobalOptions;
        const config = await resolveRepositoryConfig({ ...(options.base ? { base: options.base } : {}) });
        const report = await prepareChange({
          contractId,
          specDirectory: options.specDir ?? config.config.specDirectory,
          base: config.baseSha,
          strict: Boolean(global.strict || config.config.strict),
        });
        if (!global.quiet) {
          if (global.format === "json") output(report, "json");
          else if (global.format === "markdown") output(prepareMarkdown(report), "text");
          else output(prepareText(report), "text");
        }
        setCode(report.result === "ready" ? ExitCode.success : ExitCode.validation);
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
