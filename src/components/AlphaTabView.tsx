import { useEffect, useRef, useCallback, useState } from 'react';
import {
  AlphaTabApi,
  Settings,
  synth,
} from '@coderline/alphatab';
import type { Exercise } from '../data/exercises';
import { extractTimedNotes, type TimedNote } from '../audio/noteExtractor';

export type { TimedNote as NoteEvent };

interface AlphaTabViewProps {
  exercise: Exercise;
  onReady?: () => void;
  onNoteDataExtracted?: (notes: TimedNote[]) => void;
  /** Fires when playback starts or stops/pauses. */
  onPlayStateChange?: (isPlaying: boolean) => void;
  /** Fires when playback position changes (ms into the score). */
  onPositionChange?: (positionMs: number) => void;
}

export default function AlphaTabView({
  exercise,
  onReady,
  onNoteDataExtracted,
  onPlayStateChange,
  onPositionChange,
}: AlphaTabViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<AlphaTabApi | null>(null);

  // Stable refs for callbacks (avoids stale closures inside the one-time useEffect)
  const onPlayStateChangeRef = useRef(onPlayStateChange);
  onPlayStateChangeRef.current = onPlayStateChange;
  const onPositionChangeRef = useRef(onPositionChange);
  onPositionChangeRef.current = onPositionChange;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [playerReady, setPlayerReady] = useState(false);
  const [tempo, setTempo] = useState(exercise.defaultTempo);
  const [metronomeOn, setMetronomeOn] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  // Initialise AlphaTab
  useEffect(() => {
    if (!containerRef.current) return;

    const api = new AlphaTabApi(containerRef.current, {
      core: {
        fontDirectory: '/font/',
        tex: true,
      },
      display: {
        staveProfile: 'Tab',
        layoutMode: 1, // Horizontal
        scale: 1.0,
      },
      player: {
        enablePlayer: true,
        enableCursor: true,
        enableUserInteraction: true,
        soundFont: '/soundfont/sonivox.sf2',
        outputMode: 1, // WebAudioScriptProcessor — bypass AudioWorklet (Vite 8 compat)
        scrollElement: viewportRef.current!,
        scrollOffsetX: -30,
      },
    } as unknown as Settings);

    apiRef.current = api;

    // ── Events ────────────────────────────────────
    api.renderStarted.on(() => setIsLoading(true));
    api.renderFinished.on(() => setIsLoading(false));

    api.playerReady.on(() => {
      setPlayerReady(true);
      onReady?.();

      // Extract note timing data once MIDI is loaded
      if (onNoteDataExtracted) {
        const timedNotes = extractTimedNotes(api);
        onNoteDataExtracted(timedNotes);
      }
    });

    api.playerStateChanged.on((args) => {
      const playing = args.state === synth.PlayerState.Playing;
      setIsPlaying(playing);
      onPlayStateChangeRef.current?.(playing);
    });

    api.playerPositionChanged.on((args) => {
      setCurrentTime(args.currentTime);
      setEndTime(args.endTime);
      onPositionChangeRef.current?.(args.currentTime);
    });

    // Load the exercise tex
    api.tex(exercise.tex);

    return () => {
      api.destroy();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id]);

  // ── Playback actions ────────────────────────────
  const playPause = useCallback(() => {
    apiRef.current?.playPause();
  }, []);

  const stop = useCallback(() => {
    apiRef.current?.stop();
  }, []);

  // Tempo (playback speed multiplier)
  const changeSpeed = useCallback(
    (newTempo: number) => {
      if (!apiRef.current) return;
      setTempo(newTempo);
      apiRef.current.playbackSpeed = newTempo / exercise.defaultTempo;
    },
    [exercise.defaultTempo],
  );

  // Metronome
  const toggleMetronome = useCallback(() => {
    if (!apiRef.current) return;
    const next = metronomeOn ? 0 : 1;
    apiRef.current.metronomeVolume = next;
    setMetronomeOn(!metronomeOn);
  }, [metronomeOn]);

  // Looping
  const [isLooping, setIsLooping] = useState(false);
  const toggleLoop = useCallback(() => {
    if (!apiRef.current) return;
    apiRef.current.isLooping = !isLooping;
    setIsLooping(!isLooping);
  }, [isLooping]);

  // ── Time formatting helper ─────────────────────
  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Controls bar */}
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        {/* Left: info */}
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-800 truncate">
            {exercise.title}
          </h2>
          <p className="text-slate-500 text-sm">{exercise.subtitle}</p>
        </div>

        {/* Center: transport */}
        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
          {/* Stop */}
          <button
            onClick={stop}
            disabled={!playerReady}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-40 transition-colors"
            title="Stop"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
              <rect x="3" y="3" width="12" height="12" rx="2" />
            </svg>
          </button>

          {/* Play / Pause */}
          <button
            onClick={playPause}
            disabled={!playerReady}
            className="bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white rounded-lg p-3 shadow-md transition-all"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <rect x="4" y="3" width="4" height="14" rx="1" />
                <rect x="12" y="3" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 3.5L16 10L5 16.5V3.5Z" />
              </svg>
            )}
          </button>

          {/* Loop */}
          <button
            onClick={toggleLoop}
            disabled={!playerReady}
            className={`p-2 rounded-lg transition-colors disabled:opacity-40 ${
              isLooping
                ? 'bg-sky-100 text-sky-600'
                : 'text-slate-500 hover:bg-slate-200'
            }`}
            title="Toggle loop"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 2l4 4-4 4" />
              <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
              <path d="M7 22l-4-4 4-4" />
              <path d="M21 13v1a4 4 0 0 1-4 4H3" />
            </svg>
          </button>

          {/* Separator */}
          <div className="w-px h-8 bg-slate-200" />

          {/* Tempo */}
          <div className="flex items-center gap-2 px-2">
            <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">BPM</span>
            <input
              type="range"
              min={40}
              max={200}
              value={tempo}
              onChange={(e) => changeSpeed(Number(e.target.value))}
              disabled={!playerReady}
              className="w-24 accent-sky-500"
            />
            <span className="text-sm font-bold text-slate-700 w-8 text-center">
              {tempo}
            </span>
          </div>

          {/* Separator */}
          <div className="w-px h-8 bg-slate-200" />

          {/* Metronome toggle */}
          <button
            onClick={toggleMetronome}
            disabled={!playerReady}
            className={`p-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${
              metronomeOn
                ? 'bg-sky-100 text-sky-600'
                : 'text-slate-500 hover:bg-slate-200'
            }`}
            title="Toggle metronome"
          >
            🥁
          </button>
        </div>

        {/* Right: time */}
        <div className="text-xs text-slate-400 font-mono tabular-nums">
          {fmt(currentTime)} / {fmt(endTime)}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-100">
        <div
          className="h-full bg-sky-400 transition-all duration-200"
          style={{ width: endTime > 0 ? `${(currentTime / endTime) * 100}%` : '0%' }}
        />
      </div>

      {/* AlphaTab rendering viewport */}
      <div
        ref={viewportRef}
        className="flex-1 overflow-auto relative"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500">Loading…</p>
            </div>
          </div>
        )}
        <div ref={containerRef} className="at-main" />
      </div>
    </div>
  );
}
