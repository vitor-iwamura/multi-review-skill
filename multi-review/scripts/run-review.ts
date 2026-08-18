#!/usr/bin/env node
/**
 * multi-review for Codex — run the ported review workflows, merge their findings,
 * and optionally publish one consolidated GitHub review.
 *
 * Node 24+ is required for native TypeScript type stripping.
 */

import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

type Effort = "low" | "medium" | "high" | "xhigh" | "max";
type Severity = "Critical" | "Important" | "Suggestion";

interface Lens {
  name: string;
  references: string[];
}

interface Opts {
  pr: number | null;
  model: string | null;
  effort: Effort | null;
  sequential: boolean;
  summary: boolean;
  post: boolean;
  dryRun: boolean;
}

interface Target {
  pr: number | null;
  repo: string;
  baseSha: string;
  headSha: string;
  baseRef: string;
  diff: string;
}

interface Finding {
  severity: Severity;
  path: string;
  line: number | null;
  problem: string;
  fix: string;
  flagged: string[];
}

interface LensResult {
  name: string;
  ok: boolean;
  findings: Finding[];
  error?: string;
}

interface AnchoredFinding extends Finding {
  resolved: number | null;
  anchor: "exact" | "snapped" | "no-line-given" | "file-not-in-diff";
}

type LineMap = Map<string, number[]>;

const LENSES: Lens[] = [
  {
    name: "code-review",
    references: ["orchestrator-prompt.md"],
  },
  {
    name: "pr-review-toolkit",
    references: ["orchestrator-prompt.md", "aspects.md"],
  },
  {
    name: "mattpocock-code-review",
    references: ["orchestrator-prompt.md", "smell-baseline.md"],
  },
  {
    name: "requesting-code-review",
    references: ["orchestrator-prompt.md", "reviewer-template.md"],
  },
  {
    name: "review",
    references: ["orchestrator-prompt.md"],
  },
];

const PERSONAL_SKILLS_DIR = join(homedir(), ".agents", "skills");
const FORMATTER_SKILL = "caveman-review";

const REVIEWER_TIMEOUT_MS = 20 * 60 * 1000;
const MERGE_TIMEOUT_MS = 10 * 60 * 1000;
const SEV_ORDER: Severity[] = ["Critical", "Important", "Suggestion"];
const SEV_EMOJI: Record<Severity, string> = { Critical: "🔴", Important: "🟠", Suggestion: "🔵" };

function loadSkillReferences(skill: string, references: string[]): string {
  return references
    .map((reference) => {
      const path = join(PERSONAL_SKILLS_DIR, skill, "references", reference);
      try {
        return `===== ${skill}/${reference} =====\n${readFileSync(path, "utf8").trim()}`;
      } catch (error) {
        die(`required reviewer resource is missing: ${path} (${String(error)})`);
      }
    })
    .join("\n\n");
}

const USAGE = `multi-review — run ported review workflows and publish one consolidated review.

  node run-review.ts [<PR-number>|<PR-url>] [options]

  --model <m>     model for every workflow and merge pass
  --effort <e>    low | medium | high | xhigh | max
  --sequential    run review workflows one at a time
  --summary       post one summary comment instead of inline comments
  --no-post       local report only
  --dry-run       show the planned passes; run no Codex passes and post nothing
  -h, --help      show this message

With no PR argument, review the current working tree and do not post.`;

function die(message: string): never {
  console.error(`multi-review: ${message}`);
  process.exit(1);
}

function parsePrArg(value: string): number | null {
  if (/^\d+$/.test(value)) return Number(value);
  const match = /\/pull\/(\d+)/.exec(value);
  return match ? Number(match[1]) : null;
}

export function parseArgs(argv: string[]): Opts {
  const opts: Opts = { pr: null, model: null, effort: null, sequential: false, summary: false, post: true, dryRun: false };
  const efforts = new Set(["low", "medium", "high", "xhigh", "max"]);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      console.log(USAGE);
      process.exit(0);
    } else if (arg === "--model") {
      opts.model = argv[++i] ?? die("--model requires a value");
    } else if (arg === "--effort") {
      const value = argv[++i] ?? die("--effort requires a value");
      if (!efforts.has(value)) die(`invalid effort: ${value}`);
      opts.effort = value as Effort;
    } else if (arg === "--sequential") opts.sequential = true;
    else if (arg === "--summary") opts.summary = true;
    else if (arg === "--no-post") opts.post = false;
    else if (arg === "--dry-run") opts.dryRun = true;
    else {
      const pr = parsePrArg(arg);
      if (pr == null) die(`unknown argument: ${arg}`);
      if (opts.pr != null) die("provide only one pull request");
      opts.pr = pr;
    }
  }
  return opts;
}

function run(command: string, args: string[], options: { input?: string; timeoutMs?: number } = {}): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = options.timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          child.kill("SIGKILL");
        }, options.timeoutMs)
      : null;
    child.stdout.on("data", (data) => (stdout += data));
    child.stderr.on("data", (data) => (stderr += data));
    child.on("error", (error) => resolve({ code: 1, stdout, stderr: String(error) }));
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({ code: timedOut ? 124 : code ?? 1, stdout, stderr: timedOut ? `${stderr}\n[killed: timeout]` : stderr });
    });
    if (options.input != null) child.stdin.end(options.input);
    else child.stdin.end();
  });
}

async function sh(command: string, args: string[]): Promise<string> {
  const result = await run(command, args);
  if (result.code !== 0) die(`\`${command} ${args.join(" ")}\` failed: ${result.stderr.trim() || result.stdout.trim()}`);
  return result.stdout.trim();
}

async function defaultBase(): Promise<string> {
  const symbolic = await run("git", ["symbolic-ref", "refs/remotes/origin/HEAD", "--short"]);
  if (symbolic.code === 0 && symbolic.stdout.trim()) return symbolic.stdout.trim();
  for (const candidate of ["origin/main", "origin/master", "main", "master"]) {
    const exists = await run("git", ["rev-parse", "--verify", candidate]);
    if (exists.code === 0) return candidate;
  }
  die("could not determine the default base branch");
}

async function resolveTarget(pr: number | null): Promise<Target> {
  if (pr != null) {
    const repo = await sh("gh", ["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]);
    const raw = await sh("gh", ["pr", "view", String(pr), "--json", "baseRefName,headRefOid,baseRefOid"]);
    const meta = JSON.parse(raw) as { baseRefName: string; headRefOid: string; baseRefOid: string };
    const diff = await sh("gh", ["pr", "diff", String(pr)]);
    return { pr, repo, baseSha: meta.baseRefOid, headSha: meta.headRefOid, baseRef: meta.baseRefName, diff };
  }
  const baseRef = await defaultBase();
  const baseSha = await sh("git", ["merge-base", baseRef, "HEAD"]);
  const headSha = await sh("git", ["rev-parse", "HEAD"]);
  const diff = await sh("git", ["diff", baseSha]);
  return { pr: null, repo: "", baseSha, headSha, baseRef, diff };
}

export function parseDiffLineMap(diff: string): LineMap {
  const files = new Map<string, Set<number>>();
  let current: string | null = null;
  let newLine = 0;
  for (const raw of diff.split("\n")) {
    if (raw.startsWith("diff --git ")) current = null;
    else if (raw.startsWith("+++ ")) {
      const path = raw.slice(4).trim();
      current = path === "/dev/null" ? null : path.replace(/^b\//, "");
      if (current && !files.has(current)) files.set(current, new Set());
    } else if (raw.startsWith("@@")) {
      const match = /@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
      if (match) newLine = Number(match[1]);
    } else if (current && (raw.startsWith("+") || raw.startsWith(" "))) {
      files.get(current)!.add(newLine++);
    }
  }
  return new Map([...files].map(([path, lines]) => [path, [...lines].sort((a, b) => a - b)]));
}

export function anchorFindings(findings: Finding[], map: LineMap): AnchoredFinding[] {
  return findings.map((finding) => {
    const lines = map.get(finding.path);
    if (!lines?.length) return { ...finding, resolved: null, anchor: "file-not-in-diff" };
    if (finding.line != null && lines.includes(finding.line)) return { ...finding, resolved: finding.line, anchor: "exact" };
    const target = finding.line ?? lines[0];
    const resolved = lines.reduce((best, line) => Math.abs(line - target) < Math.abs(best - target) ? line : best, lines[0]);
    return { ...finding, resolved, anchor: finding.line == null ? "no-line-given" : "snapped" };
  });
}

function renderLineMap(map: LineMap): string {
  return [...map]
    .filter(([, lines]) => lines.length)
    .map(([path, lines]) => `${path}: ${lines.slice(0, 500).join(",")}${lines.length > 500 ? ` …(+${lines.length - 500})` : ""}`)
    .join("\n");
}

function findingsSchema(): object {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      findings: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            severity: { type: "string", enum: SEV_ORDER },
            path: { type: "string" },
            line: { type: ["integer", "null"] },
            problem: { type: "string" },
            fix: { type: "string" },
            flagged: { type: "array", items: { type: "string" } },
          },
          required: ["severity", "path", "line", "problem", "fix", "flagged"],
        },
      },
    },
    required: ["findings"],
  };
}

function codexArgs(opts: Opts, schemaFile: string, outputFile: string): string[] {
  const args = ["exec", "--ephemeral", "-s", "read-only", "-C", process.cwd(), "--output-schema", schemaFile, "-o", outputFile];
  if (opts.model) args.push("--model", opts.model);
  if (opts.effort) args.push("-c", `model_reasoning_effort=${JSON.stringify(opts.effort)}`);
  args.push("-");
  return args;
}

function parseFindings(text: string, known?: Set<string>): Finding[] | null {
  try {
    const parsed = JSON.parse(text) as { findings?: unknown };
    if (!Array.isArray(parsed.findings)) return null;
    return parsed.findings.flatMap((raw: any) => {
      if (!raw || typeof raw.path !== "string" || typeof raw.problem !== "string") return [];
      const severity: Severity = SEV_ORDER.includes(raw.severity) ? raw.severity : "Suggestion";
      const flagged = Array.isArray(raw.flagged) ? raw.flagged.filter((name: unknown): name is string => typeof name === "string" && (!known || known.has(name))) : [];
      return [{
        severity,
        path: raw.path,
        line: Number.isInteger(raw.line) ? raw.line : null,
        problem: raw.problem,
        fix: typeof raw.fix === "string" ? raw.fix : "",
        flagged,
      }];
    });
  } catch {
    return null;
  }
}

function reviewerPrompt(lens: Lens, target: Target, map: LineMap): string {
  const label = target.pr != null ? `PR #${target.pr}` : `working-tree diff against ${target.baseRef}`;
  const portedInstructions = loadSkillReferences(lens.name, lens.references);
  return `Perform an independent, read-only code review of ${label} using the Codex port of the Claude ${lens.name} workflow.

Ported workflow instructions:
${portedInstructions}

Rules:
- Report only actionable defects introduced by this diff. Do not edit files or post to GitHub.
- Inspect repository context when needed, but treat the supplied diff as the change under review.
- Avoid praise, summaries, style-only feedback, and findings without a concrete failure mode.
- Use Critical only for broken/no-op/data-loss/security-compromise behavior; Important for wrong behavior in a real case; Suggestion otherwise.
- Use repo-relative paths exactly as shown. Choose a RIGHT-side commentable line listed below.
- Keep problem and fix to one terse sentence each.
- Set flagged to exactly ["${lens.name}"]. Return only the required JSON object.

Commentable lines:
${renderLineMap(map)}

BEGIN DIFF
${target.diff}
END DIFF`;
}

async function runLens(lens: Lens, target: Target, map: LineMap, opts: Opts, dir: string, schemaFile: string): Promise<LensResult> {
  const outputFile = join(dir, `${lens.name}.json`);
  const args = codexArgs(opts, schemaFile, outputFile);
  if (opts.dryRun) {
    console.error(`  → ${lens.name}: codex ${args.join(" ")} (${reviewerPrompt(lens, target, map).length} prompt chars)`);
    return { name: lens.name, ok: true, findings: [] };
  }
  console.error(`  → ${lens.name} (model=${opts.model ?? "configured default"}, effort=${opts.effort ?? "configured default"})`);
  const result = await run("codex", args, { input: reviewerPrompt(lens, target, map), timeoutMs: REVIEWER_TIMEOUT_MS });
  if (result.code !== 0) return { name: lens.name, ok: false, findings: [], error: `exit ${result.code}: ${(result.stderr || result.stdout).trim().slice(0, 500)}` };
  const parsed = parseFindings(readFileSync(outputFile, "utf8"), new Set([lens.name]));
  if (parsed == null) return { name: lens.name, ok: false, findings: [], error: "invalid structured output" };
  return { name: lens.name, ok: true, findings: parsed };
}

function mergePrompt(results: LensResult[], target: Target, map: LineMap): string {
  const reports = results.filter((result) => result.ok).map((result) => `===== ${result.name} =====\n${JSON.stringify({ findings: result.findings })}`).join("\n\n");
  const names = results.filter((result) => result.ok).map((result) => result.name);
  const formatter = loadSkillReferences(FORMATTER_SKILL, ["formatter-prompt.md"]);
  return `Merge independent code-review findings for ${target.pr != null ? `PR #${target.pr}` : "the working-tree diff"}.

Apply this ported formatter:
${formatter}

Rules:
- Deduplicate the same underlying issue into one finding and include every source workflow in flagged.
- Do not invent findings or broaden a reviewer's claim.
- flagged values must come from: ${names.join(", ")}.
- Order Critical, Important, Suggestion.
- Keep problem and fix terse, self-contained, and useful as an inline review comment.
- Select path and RIGHT-side line from the commentable lines below. If a supplied line is invalid, choose the line whose changed code causes the defect.
- Return only the required JSON object.

Commentable lines:
${renderLineMap(map)}

Raw findings:
${reports}`;
}

async function mergeResults(results: LensResult[], target: Target, map: LineMap, opts: Opts, dir: string, schemaFile: string): Promise<Finding[] | null> {
  if (opts.dryRun) {
    console.error("  → merge: skipped in dry-run");
    return [];
  }
  const outputFile = join(dir, "merged.json");
  console.error(`  → merge (model=${opts.model ?? "configured default"}, effort=${opts.effort ?? "configured default"})`);
  const result = await run("codex", codexArgs(opts, schemaFile, outputFile), { input: mergePrompt(results, target, map), timeoutMs: MERGE_TIMEOUT_MS });
  if (result.code !== 0) return null;
  return parseFindings(readFileSync(outputFile, "utf8"), new Set(results.filter((item) => item.ok).map((item) => item.name)));
}

function coverageLine(results: LensResult[]): string {
  return results.map((result) => result.ok ? `${result.name}: ok` : `${result.name}: FAILED (${result.error})`).join(" | ");
}

export function overlapMatrix(findings: Finding[], results: LensResult[]): string {
  const rows = results.filter((result) => result.ok).map((result) => {
    const mine = findings.filter((finding) => finding.flagged.includes(result.name));
    const unique = mine.filter((finding) => finding.flagged.length === 1).length;
    return `| ${result.name} | ${mine.length} | ${unique} | ${mine.length - unique} |`;
  });
  return ["| workflow | total | unique | shared |", "|---|---:|---:|---:|", ...rows].join("\n");
}

function renderReport(findings: Finding[], results: LensResult[], target: Target): string {
  const label = target.pr != null ? `PR #${target.pr}` : `working-tree diff (${target.baseSha.slice(0, 8)}..${target.headSha.slice(0, 8)})`;
  const out = [`# Consolidated Review — ${label}`, ""];
  if (!findings.length) out.push(`No findings. ${results.filter((result) => result.ok).length} review workflows ran and none reported an issue.`, "");
  for (const severity of SEV_ORDER) {
    const group = findings.filter((finding) => finding.severity === severity);
    if (!group.length) continue;
    out.push(`## ${severity} (${group.length})`, "");
    for (const finding of group) out.push(`\`${finding.path}${finding.line == null ? "" : `:L${finding.line}`}\`: ${SEV_EMOJI[severity]} ${finding.problem} ${finding.fix} _(flagged by: ${finding.flagged.join(", ") || "unattributed"})_`, "");
  }
  out.push("## Reviewer overlap", "", overlapMatrix(findings, results), "", "## Per-workflow coverage", coverageLine(results));
  return out.join("\n");
}

function commentBody(finding: AnchoredFinding): string {
  const drift = finding.anchor === "snapped" ? ` · anchored near reported L${finding.line}` : finding.anchor === "no-line-given" ? " · no line reported" : "";
  return `${SEV_EMOJI[finding.severity]} **${finding.severity}** — ${finding.problem}${finding.fix ? ` ${finding.fix}` : ""}\n\n<sub>_(flagged by: ${finding.flagged.join(", ") || "unattributed"})_ · multi-review${drift}</sub>`;
}

function summaryBody(findings: Finding[], anchored: AnchoredFinding[], results: LensResult[]): string {
  const offDiff = anchored.filter((finding) => finding.resolved == null);
  const inlineCount = anchored.length - offDiff.length;
  const counts = SEV_ORDER.map((severity) => `${severity} ${findings.filter((finding) => finding.severity === severity).length}`).join(" · ");
  const out = ["# Consolidated Review — multi-review", "", `Five ported review workflows produced ${findings.length} deduplicated findings; ${inlineCount} are posted inline.`, "", `**${counts}**`, "", "## Reviewer overlap", "", overlapMatrix(findings, results), "", "## Per-workflow coverage", coverageLine(results)];
  if (offDiff.length) out.push("", "## Findings outside the diff", "", ...offDiff.map((finding) => `- \`${finding.path}${finding.line == null ? "" : `:L${finding.line}`}\` — ${finding.problem} ${finding.fix}`));
  return out.join("\n");
}

async function postInline(findings: Finding[], results: LensResult[], target: Target, map: LineMap, dir: string): Promise<void> {
  const anchored = anchorFindings(findings, map);
  const groups = new Map<string, AnchoredFinding[]>();
  for (const finding of anchored.filter((item) => item.resolved != null)) {
    const key = `${finding.path}:${finding.resolved}`;
    groups.set(key, [...(groups.get(key) ?? []), finding]);
  }
  const comments = [...groups.values()].map((group) => ({ path: group[0].path, line: group[0].resolved, side: "RIGHT", body: group.map(commentBody).join("\n\n---\n\n") }));
  const payload = { event: "COMMENT", body: summaryBody(findings, anchored, results), comments };
  const payloadFile = join(dir, "github-review.json");
  writeFileSync(payloadFile, JSON.stringify(payload, null, 2));
  const result = await run("gh", ["api", `repos/${target.repo}/pulls/${target.pr}/reviews`, "--method", "POST", "--input", payloadFile]);
  if (result.code !== 0) die(`inline review POST failed: ${result.stderr.trim() || result.stdout.trim()}\nPayload kept at ${payloadFile}`);
  console.error(`\nPosted ${comments.length} inline comments (${findings.length} findings) to PR #${target.pr}.`);
}

async function emit(findings: Finding[], results: LensResult[], target: Target, map: LineMap, opts: Opts, dir: string): Promise<void> {
  const report = renderReport(findings, results, target);
  const label = target.pr != null ? `pr-${target.pr}` : `worktree-${target.headSha.slice(0, 8)}`;
  const reportFile = join(tmpdir(), `multi-review-${label}.md`);
  writeFileSync(reportFile, report);
  console.error(`\nSaved report: ${reportFile}`);
  console.log(report);
  if (!opts.post || target.pr == null || opts.dryRun) {
    console.error(opts.dryRun ? "\n[dry-run] Nothing posted." : target.pr == null ? "\nWorking-tree mode — local report only." : "\n(--no-post) Nothing posted.");
    return;
  }
  if (!findings.length || opts.summary) {
    const bodyFile = join(dir, "summary.md");
    writeFileSync(bodyFile, report);
    await sh("gh", ["pr", "comment", String(target.pr), "--body-file", bodyFile]);
    console.error(`\nPosted ${findings.length ? "summary review" : "clean-review note"} to PR #${target.pr}.`);
    return;
  }
  await postInline(findings, results, target, map, dir);
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  console.error("multi-review: resolving target…");
  const target = await resolveTarget(opts.pr);
  const map = parseDiffLineMap(target.diff);
  console.error(target.pr != null ? `Target: PR #${target.pr} (${target.baseSha.slice(0, 8)}..${target.headSha.slice(0, 8)})` : `Target: working tree against ${target.baseRef}`);
  console.error(`Diff: ${[...map].filter(([, lines]) => lines.length).length} commentable files.`);

  const dir = mkdtempSync(join(tmpdir(), "codex-multi-review-"));
  const schemaFile = join(dir, "findings.schema.json");
  writeFileSync(schemaFile, JSON.stringify(findingsSchema(), null, 2));

  console.error(`\nRunning ${LENSES.length} ported review workflows (${opts.sequential ? "sequential" : "parallel"})…`);
  let results: LensResult[] = [];
  if (opts.sequential) for (const lens of LENSES) results.push(await runLens(lens, target, map, opts, dir, schemaFile));
  else results = await Promise.all(LENSES.map((lens) => runLens(lens, target, map, opts, dir, schemaFile)));
  const successful = results.filter((result) => result.ok);
  console.error(`\n${successful.length} succeeded, ${results.length - successful.length} failed.`);
  for (const result of results.filter((item) => !item.ok)) console.error(`  ! ${result.name}: ${result.error}`);
  if (!successful.length) die("no review workflow produced output");

  console.error("\nMerging findings…");
  const merged = await mergeResults(results, target, map, opts, dir, schemaFile);
  const findings = merged ?? successful.flatMap((result) => result.findings);
  if (merged == null) console.error("  ! merge pass failed; using undeduplicated structured findings.");
  else console.error(`  ✓ ${findings.length} merged findings.`);
  await emit(findings, results, target, map, opts, dir);
}

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  main().catch((error) => die(String(error?.stack ?? error)));
}
