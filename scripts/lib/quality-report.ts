/** Compare executable release gates without treating missing evidence as success. */
export const qualityGates = ["tests", "types", "lint", "build"] as const;
export type QualityGate = typeof qualityGates[number];
export interface QualityResult {
  gate: QualityGate;
  exitCode: number | null;
  durationMs: number;
}
export interface QualityReport {
  version: 1;
  suite: "static";
  revision: string;
  dirty: boolean;
  startedAt: string;
  status: "running" | "completed";
  results: QualityResult[];
}

/** All required commands must finish successfully in this run. */
export function staticGatesPassed(report: QualityReport): boolean {
  return report.status === "completed" && qualityGates.every(gate =>
    report.results.some(result => result.gate === gate && result.exitCode === 0));
}

/** Compare the same gates; this is a regression summary, never a product-quality score. */
export function compareQuality(current: QualityReport, previous?: QualityReport) {
  const passed = (report: QualityReport, gate: QualityGate) =>
    report.status === "completed" && report.results.some(result => result.gate === gate && result.exitCode === 0);
  return {
    passed: qualityGates.filter(gate => passed(current, gate)),
    missingOrFailed: qualityGates.filter(gate => !passed(current, gate)),
    improved: previous ? qualityGates.filter(gate => !passed(previous, gate) && passed(current, gate)) : [],
    regressed: previous ? qualityGates.filter(gate => passed(previous, gate) && !passed(current, gate)) : [],
  };
}

/** Reject unrelated or incomplete report formats before comparing a saved baseline. */
export function isQualityReport(value: unknown): value is QualityReport {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<QualityReport>;
  return report.version === 1 && report.suite === "static" &&
    typeof report.revision === "string" && typeof report.dirty === "boolean" &&
    typeof report.startedAt === "string" && ["running", "completed"].includes(report.status ?? "") &&
    Array.isArray(report.results) && report.results.length <= qualityGates.length &&
    new Set(report.results.map(result => result?.gate)).size === report.results.length &&
    report.results.every(result => result && qualityGates.includes(result.gate) &&
      (result.exitCode === null || Number.isInteger(result.exitCode)) &&
      Number.isFinite(result.durationMs) && result.durationMs >= 0);
}
