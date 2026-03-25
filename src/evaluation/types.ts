import type { TimedNote } from '../audio/noteExtractor';
import type { DetectedNote } from '../audio/audioAnalyser';

/** Tolerance difficulty levels (Rocksmith-style). */
export type ToleranceLevel = 'easy' | 'medium' | 'hard';

/** Configurable tolerance settings for evaluation. */
export interface ToleranceSettings {
  /** How many ms early/late a note can be and still count as a hit. */
  timingWindowMs: number;
  /** How many semitones off the pitch can be and still count. */
  pitchToleranceSemitones: number;
}

/** Preset tolerance values for each difficulty level. */
export const TOLERANCE_PRESETS: Record<ToleranceLevel, ToleranceSettings> = {
  easy: { timingWindowMs: 150, pitchToleranceSemitones: 2 },
  medium: { timingWindowMs: 80, pitchToleranceSemitones: 1 },
  hard: { timingWindowMs: 40, pitchToleranceSemitones: 0 },
};

/** Evaluation result for a single expected note. */
export interface NoteEvaluation {
  /** Index of the expected note in the original array. */
  expectedIndex: number;
  /** The expected note from the score. */
  expected: TimedNote;
  /** The detected note that matched, or null if missed. */
  detected: DetectedNote | null;
  /** Timing offset in ms: negative = early, positive = late. 0 if missed. */
  timingOffsetMs: number;
  /** Pitch offset in semitones (absolute). 0 if missed or exact match. */
  pitchOffsetSemitones: number;
  /** Whether this note was hit within tolerance. */
  isHit: boolean;
}

/** Timing classification buckets. */
export interface TimingDistribution {
  /** Number of notes played too early. */
  early: number;
  /** Number of notes played on time. */
  onTime: number;
  /** Number of notes played too late. */
  late: number;
}

/** Comprehensive summary after evaluating a session. */
export interface EvaluationSummary {
  /** Total expected notes in the exercise. */
  totalNotes: number;
  /** Number of correctly hit notes. */
  hitCount: number;
  /** Number of missed notes. */
  missCount: number;
  /** Overall accuracy (0..1) = hitCount / totalNotes. */
  accuracy: number;
  /** Average timing offset in ms among hits (negative = generally early). */
  averageTimingOffsetMs: number;
  /** Distribution of early / on-time / late notes. */
  timingDistribution: TimingDistribution;
  /** Pitch accuracy among hits (0..1): fraction with exact pitch. */
  pitchAccuracy: number;
  /** Standard deviation of timing offsets in ms (lower = more consistent). */
  timingStdDevMs: number;
  /** Groove lock score (0..1): inverse of normalised timing variance. */
  grooveLock: number;
  /** Per-note evaluation results, ordered by expected index. */
  noteEvaluations: NoteEvaluation[];
}
