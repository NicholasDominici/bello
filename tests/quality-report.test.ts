/** A partial or failed hill-climb run must never be reported as release evidence. */
import { describe, expect, it } from "vitest";
import { compareQuality, isQualityReport, qualityGates, staticGatesPassed, type QualityReport } from "../scripts/lib/quality-report";
const report = (): QualityReport => ({
  version: 1, suite: "static", revision: "fixture-revision", dirty: false,
  startedAt: "2026-10-28T00:00:00.000Z", status: "completed",
  results: qualityGates.map(gate => ({ gate, exitCode: 0, durationMs: 10 })),
});

describe("quality evidence", () => {
  it("requires every gate to finish successfully", () => {
    expect(staticGatesPassed(report())).toBe(true);
    const missing = report(); missing.results.pop();
    expect(staticGatesPassed(missing)).toBe(false);
    const running = report(); running.status = "running";
    expect(staticGatesPassed(running)).toBe(false);
    const interrupted = report(); interrupted.results[0].exitCode = null;
    expect(staticGatesPassed(interrupted)).toBe(false);
  });
  it("compares improvements and regressions without hiding failures", () => {
    const before = report(); before.results[0].exitCode = 1;
    const after = report(); after.results[3].exitCode = 1;
    expect(compareQuality(after, before)).toEqual({
      passed: ["tests", "types", "lint"], missingOrFailed: ["build"],
      improved: ["tests"], regressed: ["build"],
    });
  });
  it("does not invent an improvement on the first run", () => {
    expect(compareQuality(report()).improved).toEqual([]);
  });
  it("validates stored reports and rejects ambiguous duplicate or unknown gates", () => {
    expect(isQualityReport(report())).toBe(true);
    expect(isQualityReport({ ...report(), version: 2 })).toBe(false);
    expect(isQualityReport({ ...report(), results: [report().results[0], report().results[0]] })).toBe(false);
    expect(isQualityReport({ ...report(), results: [{ gate: "live", exitCode: 0, durationMs: 1 }] })).toBe(false);
    expect(isQualityReport({ ...report(), results: [{ gate: "tests", exitCode: 0, durationMs: -1 }] })).toBe(false);
    expect(isQualityReport(null)).toBe(false);
  });
});
