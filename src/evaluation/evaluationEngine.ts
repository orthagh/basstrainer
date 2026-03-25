/**
 * EvaluationEngine — core note-matching logic.
 *
 * Compares detected microphone notes against expected score notes
 * using configurable timing and pitch tolerance windows.
 * Tracks hits, misses, and per-note timing/pitch offsets.
 */

import type { TimedNote } from '../audio/noteExtractor';
import type { DetectedNote } from '../audio/audioAnalyser';
import type { ToleranceSettings, NoteEvaluation } from './types';
import { TOLERANCE_PRESETS } from './types';

export class EvaluationEngine {
  private expectedNotes: TimedNote[];
  private tolerance: ToleranceSettings;
  private latencyOffsetMs: number;

  /** Map from expected note index → evaluation result. */
  private evaluations: Map<number, NoteEvaluation> = new Map();
  /** Indices of expected notes that have been matched to a detected note. */
  private matchedIndices: Set<number> = new Set();

  constructor(
    expectedNotes: TimedNote[],
    tolerance: ToleranceSettings = TOLERANCE_PRESETS.medium,
    latencyOffsetMs = 0,
  ) {
    this.expectedNotes = expectedNotes;
    this.tolerance = tolerance;
    this.latencyOffsetMs = latencyOffsetMs;
  }

  /** Update tolerance settings (e.g. when the user changes difficulty). */
  setTolerance(tolerance: ToleranceSettings): void {
    this.tolerance = tolerance;
  }

  /** Update the latency offset in ms. */
  setLatencyOffset(ms: number): void {
    this.latencyOffsetMs = ms;
  }

  /**
   * Feed a detected note from the microphone and try to match it
   * against the nearest expected note within tolerance.
   *
   * @param note – The detected note from the audio analyser.
   * @param scorePositionMs – Current playback position in the score (ms).
   * @returns The evaluation if matched, or null if it's an extra note.
   */
  feedDetectedNote(
    note: DetectedNote,
    scorePositionMs: number,
  ): NoteEvaluation | null {
    const adjustedPositionMs = scorePositionMs - this.latencyOffsetMs;

    let bestIndex = -1;
    let bestAbsOffset = Infinity;
    let bestTimingOffset = 0;

    for (let i = 0; i < this.expectedNotes.length; i++) {
      if (this.matchedIndices.has(i)) continue;

      const expected = this.expectedNotes[i];
      const timingOffset = adjustedPositionMs - expected.startMs;
      const absTimingOffset = Math.abs(timingOffset);

      // Outside timing window?
      if (absTimingOffset > this.tolerance.timingWindowMs) continue;

      // Outside pitch tolerance?
      const pitchOffset = Math.abs(note.midi - expected.midi);
      if (pitchOffset > this.tolerance.pitchToleranceSemitones) continue;

      // Keep the closest timing match
      if (absTimingOffset < bestAbsOffset) {
        bestIndex = i;
        bestAbsOffset = absTimingOffset;
        bestTimingOffset = timingOffset;
      }
    }

    if (bestIndex === -1) return null; // Extra note — no penalty

    const expected = this.expectedNotes[bestIndex];
    const evaluation: NoteEvaluation = {
      expectedIndex: bestIndex,
      expected,
      detected: note,
      timingOffsetMs: bestTimingOffset,
      pitchOffsetSemitones: Math.abs(note.midi - expected.midi),
      isHit: true,
    };

    this.matchedIndices.add(bestIndex);
    this.evaluations.set(bestIndex, evaluation);

    return evaluation;
  }

  /**
   * Mark expected notes whose timing window has fully passed as missed.
   * Call periodically (e.g. every 200 ms or on each position update).
   *
   * @param scorePositionMs – Current playback position in the score (ms).
   * @returns Array of newly detected missed notes.
   */
  checkMissedNotes(scorePositionMs: number): NoteEvaluation[] {
    const missed: NoteEvaluation[] = [];
    const adjustedPositionMs = scorePositionMs - this.latencyOffsetMs;

    for (let i = 0; i < this.expectedNotes.length; i++) {
      if (this.matchedIndices.has(i)) continue;
      if (this.evaluations.has(i)) continue; // Already marked as missed

      const expected = this.expectedNotes[i];

      // Has the timing window fully passed?
      if (adjustedPositionMs > expected.startMs + this.tolerance.timingWindowMs) {
        const evaluation: NoteEvaluation = {
          expectedIndex: i,
          expected,
          detected: null,
          timingOffsetMs: 0,
          pitchOffsetSemitones: 0,
          isHit: false,
        };
        this.evaluations.set(i, evaluation);
        missed.push(evaluation);
      }
    }

    return missed;
  }

  /** Get all evaluations (hits + misses) sorted by expected index. */
  getEvaluations(): NoteEvaluation[] {
    return Array.from(this.evaluations.values()).sort(
      (a, b) => a.expectedIndex - b.expectedIndex,
    );
  }

  /** Number of hits so far. */
  get hitCount(): number {
    let count = 0;
    for (const ev of this.evaluations.values()) {
      if (ev.isHit) count++;
    }
    return count;
  }

  /** Number of misses so far. */
  get missCount(): number {
    let count = 0;
    for (const ev of this.evaluations.values()) {
      if (!ev.isHit) count++;
    }
    return count;
  }

  /** Total expected notes. */
  get totalNotes(): number {
    return this.expectedNotes.length;
  }

  /** Live accuracy (based on evaluated notes so far, 0..1). */
  get currentAccuracy(): number {
    if (this.evaluations.size === 0) return 0;
    return this.hitCount / this.evaluations.size;
  }

  /** Reset all state (e.g. when restarting playback). */
  reset(): void {
    this.evaluations.clear();
    this.matchedIndices.clear();
  }
}
