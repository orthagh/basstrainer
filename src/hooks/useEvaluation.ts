/**
 * useEvaluation – React hook that wires the EvaluationEngine to
 * the audio input and AlphaTab playback state.
 *
 * Evaluation is optional: it only activates when the user has
 * enabled evaluation, the mic is on, AND playback is running.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { EvaluationEngine } from '../evaluation/evaluationEngine';
import { LatencyCompensator } from '../evaluation/latencyCompensator';
import { computeSummary } from '../evaluation/scoring';
import { TOLERANCE_PRESETS } from '../evaluation/types';
import type {
  ToleranceLevel,
  ToleranceSettings,
  NoteEvaluation,
  EvaluationSummary,
} from '../evaluation/types';
import type { TimedNote } from '../audio/noteExtractor';
import type { DetectedNote } from '../audio/audioAnalyser';

// ── Public types ─────────────────────────────────────────

export interface LiveResults {
  hits: number;
  misses: number;
  total: number;
  accuracy: number;
}

export interface UseEvaluationOptions {
  expectedNotes: TimedNote[];
  isPlaying: boolean;
  isListening: boolean;
  evaluationEnabled: boolean;
  lastDetectedNote: DetectedNote | null;
  /** Ref updated by AlphaTabView's onPositionChange — avoids re-renders. */
  scorePositionRef: React.RefObject<number>;
}

export interface UseEvaluationReturn {
  /** Whether evaluation is currently running. */
  isActive: boolean;
  /** Current tolerance level. */
  toleranceLevel: ToleranceLevel;
  /** Change the tolerance level. */
  changeTolerance: (level: ToleranceLevel) => void;
  /** Current latency offset in ms. */
  latencyMs: number;
  /** Change the latency offset. */
  changeLatency: (ms: number) => void;
  /** Live results during evaluation. */
  liveResults: LiveResults;
  /** Last per-note evaluation result (for instant feedback). */
  lastEvaluation: NoteEvaluation | null;
  /** Post-session summary (null if no completed session yet). */
  summary: EvaluationSummary | null;
  /** Dismiss the summary overlay. */
  dismissSummary: () => void;
}

// ── Hook ─────────────────────────────────────────────────

export function useEvaluation(
  options: UseEvaluationOptions,
): UseEvaluationReturn {
  const {
    expectedNotes,
    isPlaying,
    isListening,
    evaluationEnabled,
    lastDetectedNote,
    scorePositionRef,
  } = options;

  // ── Refs (no re-renders) ────────────────────────────────
  const engineRef = useRef<EvaluationEngine | null>(null);
  const compensatorRef = useRef(new LatencyCompensator());
  const lastProcessedNoteRef = useRef<DetectedNote | null>(null);
  const wasPlayingRef = useRef(false);

  // ── State ───────────────────────────────────────────────
  const [toleranceLevel, setToleranceLevel] =
    useState<ToleranceLevel>('medium');
  const [tolerance, setTolerance] = useState<ToleranceSettings>(
    TOLERANCE_PRESETS.medium,
  );
  const [latencyMs, setLatencyMs] = useState(
    compensatorRef.current.offsetMs,
  );
  const [isActive, setIsActive] = useState(false);
  const [liveResults, setLiveResults] = useState<LiveResults>({
    hits: 0,
    misses: 0,
    total: 0,
    accuracy: 0,
  });
  const [lastEvaluation, setLastEvaluation] =
    useState<NoteEvaluation | null>(null);
  const [summary, setSummary] = useState<EvaluationSummary | null>(null);

  // ── Playback state transitions ──────────────────────────
  useEffect(() => {
    const wasPlaying = wasPlayingRef.current;
    wasPlayingRef.current = isPlaying;

    if (isPlaying && !wasPlaying) {
      // ▶ Playback just started
      if (evaluationEnabled && isListening && expectedNotes.length > 0) {
        const engine = new EvaluationEngine(
          expectedNotes,
          tolerance,
          compensatorRef.current.offsetMs,
        );
        engineRef.current = engine;
        lastProcessedNoteRef.current = null;
        setSummary(null);
        setLastEvaluation(null);
        setLiveResults({
          hits: 0,
          misses: 0,
          total: expectedNotes.length,
          accuracy: 0,
        });
        setIsActive(true);
      }
    } else if (!isPlaying && wasPlaying) {
      // ⏹ Playback just stopped / paused
      if (engineRef.current) {
        // Mark all remaining notes as missed
        engineRef.current.checkMissedNotes(Infinity);
        const evals = engineRef.current.getEvaluations();
        if (evals.length > 0) {
          setSummary(computeSummary(evals));
        }
        setIsActive(false);
        engineRef.current = null;
      }
    }
  }, [isPlaying, evaluationEnabled, isListening, expectedNotes, tolerance]);

  // ── Feed detected notes into engine ─────────────────────
  useEffect(() => {
    if (!isActive || !engineRef.current || !lastDetectedNote) return;
    if (lastDetectedNote === lastProcessedNoteRef.current) return;
    lastProcessedNoteRef.current = lastDetectedNote;

    const position = scorePositionRef.current;
    const result = engineRef.current.feedDetectedNote(
      lastDetectedNote,
      position,
    );
    if (result) {
      setLastEvaluation(result);
    }
  }, [lastDetectedNote, isActive, scorePositionRef]);

  // ── Periodic miss-checking & live results update ────────
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      if (!engineRef.current) return;
      const position = scorePositionRef.current;
      engineRef.current.checkMissedNotes(position);

      setLiveResults({
        hits: engineRef.current.hitCount,
        misses: engineRef.current.missCount,
        total: engineRef.current.totalNotes,
        accuracy: engineRef.current.currentAccuracy,
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isActive, scorePositionRef]);

  // ── Reset when exercise changes ─────────────────────────
  useEffect(() => {
    engineRef.current = null;
    setIsActive(false);
    setLiveResults({ hits: 0, misses: 0, total: 0, accuracy: 0 });
    setLastEvaluation(null);
    setSummary(null);
  }, [expectedNotes]);

  // ── Actions ─────────────────────────────────────────────
  const changeTolerance = useCallback((level: ToleranceLevel) => {
    const settings = TOLERANCE_PRESETS[level];
    setToleranceLevel(level);
    setTolerance(settings);
    engineRef.current?.setTolerance(settings);
  }, []);

  const changeLatency = useCallback((ms: number) => {
    compensatorRef.current.offsetMs = ms;
    setLatencyMs(ms);
    engineRef.current?.setLatencyOffset(ms);
  }, []);

  const dismissSummary = useCallback(() => {
    setSummary(null);
  }, []);

  return {
    isActive,
    toleranceLevel,
    changeTolerance,
    latencyMs,
    changeLatency,
    liveResults,
    lastEvaluation,
    summary,
    dismissSummary,
  };
}
