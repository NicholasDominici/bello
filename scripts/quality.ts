/** Run the static hill-climb gates and retain revision-bound reports locally. No live model or browser scenarios. */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { compareQuality, isQualityReport, staticGatesPassed, type QualityReport } from "./lib/quality-report.ts";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));
if (Number(process.versions.node.split(".")[0]) !== 24) {
  console.error("BELLO quality checks require Node.js 24. Select Node 24 and retry.");
  process.exit(1);
}
const git = (...args: string[]) => {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error("Could not identify the Git worktree.");
  return result.stdout.trim();
};
const directory = ".bell/quality";
mkdirSync(`${directory}/runs`, { recursive: true, mode: 0o700 });
let baseline: QualityReport | undefined;
try {
  const value: unknown = JSON.parse(readFileSync(`${directory}/baseline.json`, "utf8"));
  if (isQualityReport(value) && value.status === "completed") baseline = value;
} catch { /* The first run has no baseline. */ }
const report: QualityReport = {
  version: 1, suite: "static", revision: git("rev-parse", "HEAD"),
  dirty: Boolean(git("status", "--porcelain")), startedAt: new Date().toISOString(),
  status: "running", results: [],
};
const save = (path: string, value: unknown) => {
  writeFileSync(`${path}.tmp`, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  renameSync(`${path}.tmp`, path);
};
save(`${directory}/latest.json`, report);
const commands = [
  ["tests", "test"], ["types", "typecheck"], ["lint", "lint"], ["build", "build"],
] as const;
for (const [gate, command] of commands) {
  console.log(`\nBELLO quality: ${gate}`);
  const started = performance.now();
  const result = spawnSync("pnpm", [command], { stdio: "inherit", timeout: 20 * 60_000 });
  report.results.push({ gate, exitCode: result.status, durationMs: Math.round(performance.now() - started) });
  save(`${directory}/latest.json`, report);
  if (result.signal || result.error) break;
}
report.status = "completed";
const summary = compareQuality(report, baseline);
save(`${directory}/latest.json`, report);
save(`${directory}/runs/${report.startedAt.replaceAll(":", "-")}.json`, report);
save(`${directory}/baseline.json`, report);
console.log(`\nStatic gates: ${summary.passed.length}/4 passed at ${report.revision.slice(0, 8)}${report.dirty ? " (uncommitted changes)" : ""}.`);
if (summary.improved.length) console.log(`Improved: ${summary.improved.join(", ")}`);
if (summary.regressed.length) console.log(`Regressed: ${summary.regressed.join(", ")}`);
if (summary.missingOrFailed.length) console.log(`Missing or failed: ${summary.missingOrFailed.join(", ")}`);
console.log("Report: .bell/quality/latest.json. Live agent, provider, and visual gates require separate evidence.");
process.exitCode = staticGatesPassed(report) ? 0 : 1;
