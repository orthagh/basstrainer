/**
 * useMetronome — standalone metronome with precise Web Audio scheduling.
 *
 * Uses the standard lookahead-scheduler pattern:
 *   • A setInterval (every 25 ms) drives the scheduler.
 *   • The scheduler looks 100 ms ahead and calls `scheduleClick` for each
 *     tick that falls in that window, using absolute AudioContext timestamps.
 *   • React state (beat / bar counters) is updated via setTimeout so the
 *     visual update roughly coincides with the audio.
 *
 * All config (tempo, beatsPerBar, etc.) is kept in both React state
 * (for rendering) and a ref (for the scheduler, which runs outside React's
 * render cycle).  The ref is kept in sync by assigning in the render body.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  scheduleClick,
  getSharedAudioContext,
  type ClickSound,
} from '../audio/clickSynth';

// ── Types ────────────────────────────────────────────────────────────────────

export type Subdivision = 'quarter' | 'eighth' | 'triplet' | 'sixteenth';

export const SUBDIVISIONS: Subdivision[] = [
  'quarter',
  'eighth',
  'triplet',
  'sixteenth',
];

export const SUBDIVISION_MULTIPLIER: Record<Subdivision, number> = {
  quarter: 1,
  eighth: 2,
  triplet: 3,
  sixteenth: 4,
};

export const SUBDIVISION_SYMBOLS: Record<
  Subdivision,
  { symbol: string; label: string }
> = {
  quarter:   { symbol: '♩',  label: '1/4'  },
  eighth:    { symbol: '♫',  label: '1/8'  },
  triplet:   { symbol: '♫3', label: 'Trip.' },
  sixteenth: { symbol: '♬',  label: '1/16' },
};

interface MetronomeConfig {
  tempo: number; // 20–300 BPM
  beatsPerBar: number; // 1–8
  subdivision: Subdivision;
  /** length === beatsPerBar; index 0 is always true */
  accentPattern: boolean[];
  clickSound: ClickSound;
  silentBarsEnabled: boolean;
  /** Number of sounding bars before a silent phase */
  playBarsCount: number;
  /** Number of silent bars in each cycle */
  silentBarsCount: number;
  /** 0–1 master volume multiplier, default 1 */
  volume: number;
}

export interface MetronomeState extends MetronomeConfig {
  isRunning: boolean;
  /** 0-based index of the currently sounding main beat within the bar */
  currentBeat: number;
  /** 1-based bar counter, resets on start */
  currentBar: number;
}

export interface MetronomeHandle {
  toggle: () => void;
  stop: () => void;
  changeTempo: (delta: number) => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

const LOOKAHEAD_S = 0.1; // schedule this many seconds ahead
const SCHEDULER_INTERVAL_MS = 25; // run scheduler every N ms
const MAX_TAPS = 8;
const TAP_WINDOW_MS = 3000;
const MIN_BPM = 20;
const MAX_BPM = 300;

const DEFAULT_CONFIG: MetronomeConfig = {
  tempo: 120,
  beatsPerBar: 4,
  subdivision: 'quarter',
  accentPattern: [true, false, false, false],
  clickSound: 'default',
  silentBarsEnabled: false,
  playBarsCount: 2,
  silentBarsCount: 2,
  volume: 1,
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useMetronome(): MetronomeState & {
  start: () => void;
  stop: () => void;
  toggle: () => void;
  tap: () => void;
  changeTempo: (delta: number) => void;
  setTempo: (bpm: number) => void;
  setBeatsPerBar: (n: number) => void;
  setSubdivision: (s: Subdivision) => void;
  toggleAccent: (beatIndex: number) => void;
  setClickSound: (s: ClickSound) => void;
  setSilentBarsEnabled: (enabled: boolean) => void;
  setPlayBarsCount: (n: number) => void;
  setSilentBarsCount: (n: number) => void;
  setVolume: (v: number) => void;
} {
  const [config, setConfig] = useState<MetronomeConfig>(DEFAULT_CONFIG);
  const [isRunning, setIsRunning] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [currentBar, setCurrentBar] = useState(1);

  // Always-fresh ref for the scheduler (avoids stale closure over config).
  // Updated every render so the scheduler always reads the latest values.
  const configRef = useRef(config);
  configRef.current = config;

  // Scheduler position refs — not React state; mutated by the scheduler
  const audioCtxRef = useRef<AudioContext | null>(null);
  const schedulerTimerRef = useRef<number | null>(null);
  const nextTickTimeRef = useRef(0); // AudioContext timestamp of the next tick
  const tickPositionRef = useRef(0); // tick within bar (0 … beatsPerBar×subdivMult−1)
  const barCounterRef = useRef(1); // bar number being scheduled (for UI)
  const silentCycleRef = useRef(0); // bars completed in current play+silent cycle

  // Tap tempo
  const tapTimesRef = useRef<number[]>([]);

  // ── Scheduler ──────────────────────────────────────────────────────────────

  const schedulerTick = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const cfg = configRef.current;
    const subdivMult = SUBDIVISION_MULTIPLIER[cfg.subdivision];
    const ticksPerBar = cfg.beatsPerBar * subdivMult;
    const tickInterval = 60 / cfg.tempo / subdivMult;

    // Guard: config change (e.g., fewer beats) may put position out of range
    if (tickPositionRef.current >= ticksPerBar) {
      tickPositionRef.current = 0;
    }

    while (nextTickTimeRef.current < ctx.currentTime + LOOKAHEAD_S) {
      const tickPos = tickPositionRef.current;
      const beatIndex = Math.floor(tickPos / subdivMult);
      const isMainBeat = tickPos % subdivMult === 0;

      // Determine whether this bar is a silent bar
      const cycleLength = cfg.playBarsCount + cfg.silentBarsCount;
      const cyclePos = cfg.silentBarsEnabled
        ? silentCycleRef.current % cycleLength
        : 0;
      const isSilent = cfg.silentBarsEnabled && cyclePos >= cfg.playBarsCount;

      if (!isSilent) {
        const accent = isMainBeat && (cfg.accentPattern[beatIndex] ?? false);
        const volumeScale = (isMainBeat ? 1 : 0.35) * cfg.volume;
        scheduleClick(cfg.clickSound, accent, nextTickTimeRef.current, volumeScale);
      }

      // Schedule a UI update to roughly coincide with this main beat
      if (isMainBeat) {
        const uiDelay = Math.max(
          0,
          (nextTickTimeRef.current - ctx.currentTime) * 1000,
        );
        const uiBeat = beatIndex;
        const uiBar = barCounterRef.current;
        setTimeout(() => {
          setCurrentBeat(uiBeat);
          setCurrentBar(uiBar);
        }, uiDelay);
      }

      // Advance tick position
      tickPositionRef.current++;
      if (tickPositionRef.current >= ticksPerBar) {
        tickPositionRef.current = 0;
        barCounterRef.current++;
        silentCycleRef.current++;
      }

      nextTickTimeRef.current += tickInterval;
    }
  }, []);

  // ── Transport ──────────────────────────────────────────────────────────────

  const start = useCallback(() => {
    if (schedulerTimerRef.current !== null) return; // already running

    const ctx = getSharedAudioContext();
    audioCtxRef.current = ctx;

    nextTickTimeRef.current = ctx.currentTime;
    tickPositionRef.current = 0;
    barCounterRef.current = 1;
    silentCycleRef.current = 0;
    setCurrentBeat(0);
    setCurrentBar(1);

    setIsRunning(true);
    schedulerTimerRef.current = window.setInterval(
      schedulerTick,
      SCHEDULER_INTERVAL_MS,
    );
    schedulerTick(); // fire immediately so the first click has no delay
  }, [schedulerTick]);

  const stop = useCallback(() => {
    if (schedulerTimerRef.current !== null) {
      clearInterval(schedulerTimerRef.current);
      schedulerTimerRef.current = null;
    }
    setIsRunning(false);
    setCurrentBeat(0);
    setCurrentBar(1);
  }, []);

  const toggle = useCallback(() => {
    if (schedulerTimerRef.current !== null) {
      stop();
    } else {
      start();
    }
  }, [start, stop]);

  // Cleanup on unmount (e.g., when navigating away from the metronome page)
  useEffect(() => {
    return () => {
      if (schedulerTimerRef.current !== null) {
        clearInterval(schedulerTimerRef.current);
      }
    };
  }, []);

  // ── Config setters ─────────────────────────────────────────────────────────

  const setTempo = useCallback((bpm: number) => {
    const clamped = Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(bpm)));
    setConfig((prev) => ({ ...prev, tempo: clamped }));
  }, []);

  const changeTempo = useCallback(
    (delta: number) => {
      setConfig((prev) => ({
        ...prev,
        tempo: Math.max(MIN_BPM, Math.min(MAX_BPM, prev.tempo + delta)),
      }));
    },
    [],
  );

  const setBeatsPerBar = useCallback((n: number) => {
    const clamped = Math.max(1, Math.min(8, n));
    setConfig((prev) => {
      const nextAccent = Array.from({ length: clamped }, (_, i) =>
        i === 0 ? true : (prev.accentPattern[i] ?? false),
      );
      return { ...prev, beatsPerBar: clamped, accentPattern: nextAccent };
    });
  }, []);

  const setSubdivision = useCallback((s: Subdivision) => {
    setConfig((prev) => ({ ...prev, subdivision: s }));
  }, []);

  const toggleAccent = useCallback((beatIndex: number) => {
    if (beatIndex === 0) return; // beat 1 is always accented
    setConfig((prev) => {
      const next = [...prev.accentPattern];
      next[beatIndex] = !next[beatIndex];
      return { ...prev, accentPattern: next };
    });
  }, []);

  const setClickSound = useCallback((s: ClickSound) => {
    setConfig((prev) => ({ ...prev, clickSound: s }));
  }, []);

  const setSilentBarsEnabled = useCallback((enabled: boolean) => {
    setConfig((prev) => ({ ...prev, silentBarsEnabled: enabled }));
  }, []);

  const setPlayBarsCount = useCallback((n: number) => {
    setConfig((prev) => ({ ...prev, playBarsCount: Math.max(1, n) }));
  }, []);

  const setSilentBarsCount = useCallback((n: number) => {
    setConfig((prev) => ({ ...prev, silentBarsCount: Math.max(1, n) }));
  }, []);

  const setVolume = useCallback((v: number) => {
    setConfig((prev) => ({ ...prev, volume: Math.min(1, Math.max(0, v)) }));
  }, []);

  // ── Tap tempo ──────────────────────────────────────────────────────────────

  const tap = useCallback(() => {
    const now = performance.now();
    const recent = tapTimesRef.current.filter((t) => now - t < TAP_WINDOW_MS);
    recent.push(now);
    tapTimesRef.current = recent.slice(-MAX_TAPS);

    if (recent.length >= 2) {
      let total = 0;
      for (let i = 1; i < recent.length; i++) {
        total += recent[i] - recent[i - 1];
      }
      const bpm = Math.round(60000 / (total / (recent.length - 1)));
      setTempo(bpm);
    }
  }, [setTempo]);

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    ...config,
    isRunning,
    currentBeat,
    currentBar,
    start,
    stop,
    toggle,
    tap,
    changeTempo,
    setTempo,
    setBeatsPerBar,
    setSubdivision,
    toggleAccent,
    setClickSound,
    setSilentBarsEnabled,
    setPlayBarsCount,
    setSilentBarsCount,
    setVolume,
  };
}
