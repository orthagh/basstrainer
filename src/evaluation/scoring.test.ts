/**
 * Tests for the scoring module — computeSummary.
 */

import { computeSummary } from './scoring';
import type { NoteEvaluation } from './types';

// ── Helpers ─────────────────────────────────────────────────

function makeEval(overrides: Partial<NoteEvaluation> = {}): NoteEvaluation {
  return {
    expectedIndex: 0,
    expected: { midi: 40, startMs: 1000, durationMs: 250, beatIndex: 0 },
    detected: {
      midi: 40,
      frequency: 82.41,
      noteName: 'E2',
      time: 1.0,
      rms: 0.3,
    },
    timingOffsetMs: 0,
    pitchOffsetSemitones: 0,
    isHit: true,
    ...overrides,
  };
}

function makeMiss(index: number, startMs: number): NoteEvaluation {
  return {
    expectedIndex: index,
    expected: { midi: 40, startMs, durationMs: 250, beatIndex: index },
    detected: null,
    timingOffsetMs: 0,
    pitchOffsetSemitones: 0,
    isHit: false,
  };
}

// ── Tests ───────────────────────────────────────────────────

describe('computeSummary', () => {
  it('returns empty summary for empty evaluations', () => {
    const summary = computeSummary([]);

    expect(summary.totalNotes).toBe(0);
    expect(summary.accuracy).toBe(0);
    expect(summary.grooveLock).toBe(0);
  });

  it('computes perfect accuracy for all hits', () => {
    const evals = [
      makeEval({ expectedIndex: 0, timingOffsetMs: 5 }),
      makeEval({ expectedIndex: 1, timingOffsetMs: -3 }),
      makeEval({ expectedIndex: 2, timingOffsetMs: 10 }),
    ];

    const summary = computeSummary(evals);

    expect(summary.totalNotes).toBe(3);
    expect(summary.hitCount).toBe(3);
    expect(summary.missCount).toBe(0);
    expect(summary.accuracy).toBe(1);
  });

  it('computes 0% accuracy for all misses', () => {
    const evals = [makeMiss(0, 500), makeMiss(1, 1000), makeMiss(2, 1500)];

    const summary = computeSummary(evals);

    expect(summary.accuracy).toBe(0);
    expect(summary.hitCount).toBe(0);
    expect(summary.missCount).toBe(3);
  });

  it('computes mixed accuracy correctly', () => {
    const evals = [
      makeEval({ expectedIndex: 0 }),
      makeMiss(1, 1000),
      makeEval({ expectedIndex: 2 }),
      makeMiss(3, 2000),
    ];

    const summary = computeSummary(evals);

    expect(summary.accuracy).toBe(0.5);
    expect(summary.hitCount).toBe(2);
    expect(summary.missCount).toBe(2);
  });

  it('classifies timing distribution correctly', () => {
    const evals = [
      makeEval({ timingOffsetMs: -30 }), // Early
      makeEval({ timingOffsetMs: -5, expectedIndex: 1 }), // On time
      makeEval({ timingOffsetMs: 10, expectedIndex: 2 }), // On time
      makeEval({ timingOffsetMs: 50, expectedIndex: 3 }), // Late
    ];

    const summary = computeSummary(evals);

    expect(summary.timingDistribution.early).toBe(1);
    expect(summary.timingDistribution.onTime).toBe(2);
    expect(summary.timingDistribution.late).toBe(1);
  });

  it('computes average timing offset', () => {
    const evals = [
      makeEval({ timingOffsetMs: -10 }),
      makeEval({ timingOffsetMs: 20, expectedIndex: 1 }),
      makeEval({ timingOffsetMs: -10, expectedIndex: 2 }),
    ];

    const summary = computeSummary(evals);

    // (-10 + 20 + -10) / 3 = 0
    expect(summary.averageTimingOffsetMs).toBeCloseTo(0);
  });

  it('detects rushing tendency (negative avg offset)', () => {
    const evals = [
      makeEval({ timingOffsetMs: -40 }),
      makeEval({ timingOffsetMs: -30, expectedIndex: 1 }),
      makeEval({ timingOffsetMs: -20, expectedIndex: 2 }),
    ];

    const summary = computeSummary(evals);

    expect(summary.averageTimingOffsetMs).toBeLessThan(-10);
  });

  it('computes pitch accuracy (exact pitch among hits)', () => {
    const evals = [
      makeEval({ pitchOffsetSemitones: 0 }), // Exact
      makeEval({ pitchOffsetSemitones: 1, expectedIndex: 1 }), // Off by 1
      makeEval({ pitchOffsetSemitones: 0, expectedIndex: 2 }), // Exact
    ];

    const summary = computeSummary(evals);

    // 2/3 exact pitch
    expect(summary.pitchAccuracy).toBeCloseTo(2 / 3);
  });

  it('computes groove lock (consistent timing → high score)', () => {
    // All notes perfectly timed
    const consistent = [
      makeEval({ timingOffsetMs: 5 }),
      makeEval({ timingOffsetMs: 6, expectedIndex: 1 }),
      makeEval({ timingOffsetMs: 4, expectedIndex: 2 }),
      makeEval({ timingOffsetMs: 5, expectedIndex: 3 }),
    ];

    const summaryConsistent = computeSummary(consistent);

    // Very scattered timing
    const scattered = [
      makeEval({ timingOffsetMs: -70 }),
      makeEval({ timingOffsetMs: 60, expectedIndex: 1 }),
      makeEval({ timingOffsetMs: -50, expectedIndex: 2 }),
      makeEval({ timingOffsetMs: 80, expectedIndex: 3 }),
    ];

    const summaryScattered = computeSummary(scattered);

    expect(summaryConsistent.grooveLock).toBeGreaterThan(0.9);
    expect(summaryScattered.grooveLock).toBeLessThan(0.5);
    expect(summaryConsistent.grooveLock).toBeGreaterThan(
      summaryScattered.grooveLock,
    );
  });

  it('timing std dev is 0 for a single hit', () => {
    const evals = [makeEval({ timingOffsetMs: 15 })];

    const summary = computeSummary(evals);

    expect(summary.timingStdDevMs).toBe(0);
  });

  it('ignores misses for timing/pitch analysis', () => {
    const evals = [
      makeEval({ timingOffsetMs: 10, pitchOffsetSemitones: 0 }),
      makeMiss(1, 1000),
      makeMiss(2, 1500),
    ];

    const summary = computeSummary(evals);

    expect(summary.averageTimingOffsetMs).toBe(10);
    expect(summary.pitchAccuracy).toBe(1); // 1/1 exact
    expect(summary.timingDistribution.onTime).toBe(1);
  });

  it('returns all evaluations in the summary', () => {
    const evals = [
      makeEval({ expectedIndex: 0 }),
      makeMiss(1, 1000),
    ];

    const summary = computeSummary(evals);

    expect(summary.noteEvaluations).toHaveLength(2);
  });
});
