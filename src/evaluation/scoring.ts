/**
 * Scoring — compute a comprehensive evaluation summary
 * from per-note evaluation results.
 */

import type {
  NoteEvaluation,
  EvaluationSummary,
  TimingDistribution,
} from './types';

/** Notes within this many ms of perfect are classified as "on time". */
const ON_TIME_THRESHOLD_MS = 20;

/**
 * Compute a comprehensive evaluation summary from per-note evaluations.
 */
export function computeSummary(
  evaluations: NoteEvaluation[],
): EvaluationSummary {
  const totalNotes = evaluations.length;

  if (totalNotes === 0) {
    return emptySummary();
  }

  const hits = evaluations.filter((e) => e.isHit);
  const hitCount = hits.length;
  const missCount = totalNotes - hitCount;
  const accuracy = hitCount / totalNotes;

  // ── Timing analysis (among hits only) ──────────────────
  const timingOffsets = hits.map((e) => e.timingOffsetMs);

  const averageTimingOffsetMs =
    timingOffsets.length > 0
      ? timingOffsets.reduce((s, v) => s + v, 0) / timingOffsets.length
      : 0;

  const timingDistribution = computeTimingDistribution(timingOffsets);

  // ── Pitch accuracy (among hits: exact pitch match) ─────
  const exactPitchHits = hits.filter(
    (e) => e.pitchOffsetSemitones === 0,
  ).length;
  const pitchAccuracy = hitCount > 0 ? exactPitchHits / hitCount : 0;

  // ── Groove metric ──────────────────────────────────────
  const timingStdDevMs = stdDev(timingOffsets);

  // Map stddev to a 0..1 score:
  //   0 ms stddev → 1.0 (perfectly locked groove)
  // 100 ms stddev → 0.0 (very loose)
  const grooveLock =
    timingOffsets.length > 0
      ? Math.max(0, 1 - timingStdDevMs / 100)
      : 0;

  return {
    totalNotes,
    hitCount,
    missCount,
    accuracy,
    averageTimingOffsetMs,
    timingDistribution,
    pitchAccuracy,
    timingStdDevMs,
    grooveLock,
    noteEvaluations: evaluations,
  };
}

// ── Helpers ────────────────────────────────────────────────

function computeTimingDistribution(offsets: number[]): TimingDistribution {
  let early = 0;
  let onTime = 0;
  let late = 0;

  for (const offset of offsets) {
    if (offset < -ON_TIME_THRESHOLD_MS) {
      early++;
    } else if (offset > ON_TIME_THRESHOLD_MS) {
      late++;
    } else {
      onTime++;
    }
  }

  return { early, onTime, late };
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const sumSqDiff = values.reduce((s, v) => s + (v - mean) ** 2, 0);
  return Math.sqrt(sumSqDiff / values.length);
}

function emptySummary(): EvaluationSummary {
  return {
    totalNotes: 0,
    hitCount: 0,
    missCount: 0,
    accuracy: 0,
    averageTimingOffsetMs: 0,
    timingDistribution: { early: 0, onTime: 0, late: 0 },
    pitchAccuracy: 0,
    timingStdDevMs: 0,
    grooveLock: 0,
    noteEvaluations: [],
  };
}
