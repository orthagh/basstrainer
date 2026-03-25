/**
 * Tests for EvaluationEngine — core note-matching logic.
 */

import { EvaluationEngine } from './evaluationEngine';
import type { ToleranceSettings } from './types';
import type { TimedNote } from '../audio/noteExtractor';
import type { DetectedNote } from '../audio/audioAnalyser';

// ── Helpers ─────────────────────────────────────────────────

function makeExpected(overrides: Partial<TimedNote> = {}): TimedNote {
  return {
    midi: 40, // E2
    startMs: 1000,
    durationMs: 250,
    beatIndex: 0,
    ...overrides,
  };
}

function makeDetected(overrides: Partial<DetectedNote> = {}): DetectedNote {
  return {
    midi: 40,
    frequency: 82.41,
    noteName: 'E2',
    time: 1.0,
    rms: 0.3,
    ...overrides,
  };
}

const MEDIUM: ToleranceSettings = {
  timingWindowMs: 80,
  pitchToleranceSemitones: 1,
};

const EASY: ToleranceSettings = {
  timingWindowMs: 150,
  pitchToleranceSemitones: 2,
};

const HARD: ToleranceSettings = {
  timingWindowMs: 40,
  pitchToleranceSemitones: 0,
};

// ── Tests ───────────────────────────────────────────────────

describe('EvaluationEngine', () => {
  // ── Basic matching ──────────────────────────────────────
  describe('feedDetectedNote', () => {
    it('matches an exact hit (same time, same pitch)', () => {
      const engine = new EvaluationEngine(
        [makeExpected({ startMs: 1000, midi: 40 })],
        MEDIUM,
      );
      const result = engine.feedDetectedNote(
        makeDetected({ midi: 40 }),
        1000, // score position exactly at expected start
      );

      expect(result).not.toBeNull();
      expect(result!.isHit).toBe(true);
      expect(result!.timingOffsetMs).toBe(0);
      expect(result!.pitchOffsetSemitones).toBe(0);
    });

    it('matches a note within timing window (early)', () => {
      const engine = new EvaluationEngine(
        [makeExpected({ startMs: 1000 })],
        MEDIUM,
      );
      const result = engine.feedDetectedNote(makeDetected(), 950); // 50ms early

      expect(result).not.toBeNull();
      expect(result!.isHit).toBe(true);
      expect(result!.timingOffsetMs).toBe(-50);
    });

    it('matches a note within timing window (late)', () => {
      const engine = new EvaluationEngine(
        [makeExpected({ startMs: 1000 })],
        MEDIUM,
      );
      const result = engine.feedDetectedNote(makeDetected(), 1070); // 70ms late

      expect(result).not.toBeNull();
      expect(result!.isHit).toBe(true);
      expect(result!.timingOffsetMs).toBe(70);
    });

    it('rejects a note outside timing window', () => {
      const engine = new EvaluationEngine(
        [makeExpected({ startMs: 1000 })],
        MEDIUM,
      );
      const result = engine.feedDetectedNote(makeDetected(), 1200); // 200ms late, window is 80

      expect(result).toBeNull();
    });

    it('matches a note within pitch tolerance', () => {
      const engine = new EvaluationEngine(
        [makeExpected({ midi: 40 })],
        MEDIUM, // 1 semitone tolerance
      );
      const result = engine.feedDetectedNote(
        makeDetected({ midi: 41 }), // 1 semitone off
        1000,
      );

      expect(result).not.toBeNull();
      expect(result!.isHit).toBe(true);
      expect(result!.pitchOffsetSemitones).toBe(1);
    });

    it('rejects a note outside pitch tolerance', () => {
      const engine = new EvaluationEngine(
        [makeExpected({ midi: 40 })],
        MEDIUM, // 1 semitone tolerance
      );
      const result = engine.feedDetectedNote(
        makeDetected({ midi: 43 }), // 3 semitones off
        1000,
      );

      expect(result).toBeNull();
    });

    it('does not double-match the same expected note', () => {
      const engine = new EvaluationEngine(
        [makeExpected({ startMs: 1000 })],
        MEDIUM,
      );

      const first = engine.feedDetectedNote(makeDetected(), 1000);
      const second = engine.feedDetectedNote(makeDetected(), 1010);

      expect(first).not.toBeNull();
      expect(second).toBeNull(); // Already matched
    });

    it('picks the closest timing match among multiple candidates', () => {
      const engine = new EvaluationEngine(
        [
          makeExpected({ startMs: 1000, midi: 40, beatIndex: 0 }),
          makeExpected({ startMs: 1100, midi: 40, beatIndex: 1 }),
        ],
        EASY, // wide window
      );

      // Score position 1080 — closer to the second note (1100)
      const result = engine.feedDetectedNote(makeDetected(), 1080);

      expect(result).not.toBeNull();
      expect(result!.expectedIndex).toBe(1); // Matched the closer one
      expect(result!.timingOffsetMs).toBe(-20);
    });

    it('returns null for extra notes (no expected note nearby)', () => {
      const engine = new EvaluationEngine(
        [makeExpected({ startMs: 5000 })],
        MEDIUM,
      );
      const result = engine.feedDetectedNote(makeDetected(), 1000);

      expect(result).toBeNull();
    });
  });

  // ── Miss detection ──────────────────────────────────────
  describe('checkMissedNotes', () => {
    it('marks notes as missed when their window has passed', () => {
      const engine = new EvaluationEngine(
        [
          makeExpected({ startMs: 500 }),
          makeExpected({ startMs: 1000 }),
        ],
        MEDIUM, // 80ms window
      );

      // Position well past the first note's window
      const missed = engine.checkMissedNotes(700);

      expect(missed).toHaveLength(1);
      expect(missed[0].isHit).toBe(false);
      expect(missed[0].expectedIndex).toBe(0);
    });

    it('does not mark notes whose window has not yet passed', () => {
      const engine = new EvaluationEngine(
        [makeExpected({ startMs: 1000 })],
        MEDIUM,
      );

      const missed = engine.checkMissedNotes(900); // Within window

      expect(missed).toHaveLength(0);
    });

    it('does not double-mark a missed note', () => {
      const engine = new EvaluationEngine(
        [makeExpected({ startMs: 500 })],
        MEDIUM,
      );

      const first = engine.checkMissedNotes(700);
      const second = engine.checkMissedNotes(800);

      expect(first).toHaveLength(1);
      expect(second).toHaveLength(0);
    });

    it('does not mark already-matched notes as missed', () => {
      const engine = new EvaluationEngine(
        [makeExpected({ startMs: 1000 })],
        MEDIUM,
      );

      engine.feedDetectedNote(makeDetected(), 1000);
      const missed = engine.checkMissedNotes(2000);

      expect(missed).toHaveLength(0);
    });
  });

  // ── Latency compensation ────────────────────────────────
  describe('latency compensation', () => {
    it('shifts the effective score position by the latency offset', () => {
      const engine = new EvaluationEngine(
        [makeExpected({ startMs: 1000 })],
        MEDIUM,
        50, // 50ms latency offset
      );

      // Score position 1050 → adjusted to 1000 → exact match
      const result = engine.feedDetectedNote(makeDetected(), 1050);

      expect(result).not.toBeNull();
      expect(result!.isHit).toBe(true);
      expect(result!.timingOffsetMs).toBe(0);
    });

    it('latency offset can be changed at runtime', () => {
      const engine = new EvaluationEngine(
        [makeExpected({ startMs: 1000 })],
        MEDIUM,
        0,
      );
      engine.setLatencyOffset(30);

      // Score position 1030 → adjusted to 1000
      const result = engine.feedDetectedNote(makeDetected(), 1030);

      expect(result).not.toBeNull();
      expect(result!.timingOffsetMs).toBe(0);
    });
  });

  // ── Tolerance presets ───────────────────────────────────
  describe('tolerance levels', () => {
    it('easy tolerance allows wider timing window', () => {
      const engine = new EvaluationEngine(
        [makeExpected({ startMs: 1000 })],
        EASY,
      );
      // 140ms late — outside medium (80ms) but inside easy (150ms)
      const result = engine.feedDetectedNote(makeDetected(), 1140);

      expect(result).not.toBeNull();
      expect(result!.isHit).toBe(true);
    });

    it('hard tolerance rejects even small pitch deviation', () => {
      const engine = new EvaluationEngine(
        [makeExpected({ midi: 40 })],
        HARD, // 0 semitones pitch tolerance
      );
      // 1 semitone off — rejected by hard
      const result = engine.feedDetectedNote(
        makeDetected({ midi: 41 }),
        1000,
      );

      expect(result).toBeNull();
    });

    it('tolerance can be changed during a session', () => {
      const engine = new EvaluationEngine(
        [
          makeExpected({ startMs: 1000, beatIndex: 0 }),
          makeExpected({ startMs: 2000, beatIndex: 1 }),
        ],
        HARD,
      );

      // First note: hard tolerance, 1 semitone off → rejected
      const first = engine.feedDetectedNote(
        makeDetected({ midi: 41 }),
        1000,
      );
      expect(first).toBeNull();

      // Switch to easy tolerance
      engine.setTolerance(EASY);

      // Second note: 1 semitone off → now accepted
      const second = engine.feedDetectedNote(
        makeDetected({ midi: 41 }),
        2000,
      );
      expect(second).not.toBeNull();
      expect(second!.isHit).toBe(true);
    });
  });

  // ── Aggregate getters ───────────────────────────────────
  describe('aggregates', () => {
    it('tracks hitCount and missCount', () => {
      const engine = new EvaluationEngine(
        [
          makeExpected({ startMs: 500, beatIndex: 0 }),
          makeExpected({ startMs: 1000, beatIndex: 1 }),
          makeExpected({ startMs: 1500, beatIndex: 2 }),
        ],
        MEDIUM,
      );

      engine.feedDetectedNote(makeDetected(), 1000); // Hit note at 1000
      engine.checkMissedNotes(2000); // Miss notes at 500 and 1500

      expect(engine.hitCount).toBe(1);
      expect(engine.missCount).toBe(2);
      expect(engine.totalNotes).toBe(3);
    });

    it('computes currentAccuracy correctly', () => {
      const engine = new EvaluationEngine(
        [
          makeExpected({ startMs: 500, beatIndex: 0 }),
          makeExpected({ startMs: 1000, beatIndex: 1 }),
        ],
        MEDIUM,
      );

      engine.feedDetectedNote(makeDetected(), 1000); // 1 hit
      engine.checkMissedNotes(2000); // 1 miss

      expect(engine.currentAccuracy).toBeCloseTo(0.5);
    });

    it('getEvaluations returns sorted results', () => {
      const engine = new EvaluationEngine(
        [
          makeExpected({ startMs: 500, beatIndex: 0 }),
          makeExpected({ startMs: 1500, beatIndex: 2 }),
          makeExpected({ startMs: 1000, beatIndex: 1 }),
        ],
        MEDIUM,
      );

      // Match in reverse order
      engine.feedDetectedNote(makeDetected(), 1500);
      engine.feedDetectedNote(makeDetected(), 1000);
      engine.checkMissedNotes(2000);

      const evals = engine.getEvaluations();
      expect(evals.map((e) => e.expectedIndex)).toEqual([0, 1, 2]);
    });

    it('reset clears all state', () => {
      const engine = new EvaluationEngine(
        [makeExpected({ startMs: 1000 })],
        MEDIUM,
      );

      engine.feedDetectedNote(makeDetected(), 1000);
      expect(engine.hitCount).toBe(1);

      engine.reset();
      expect(engine.hitCount).toBe(0);
      expect(engine.missCount).toBe(0);
      expect(engine.getEvaluations()).toHaveLength(0);

      // Can match the same note again
      const result = engine.feedDetectedNote(makeDetected(), 1000);
      expect(result).not.toBeNull();
    });
  });
});
