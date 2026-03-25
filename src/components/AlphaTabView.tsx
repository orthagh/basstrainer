import { useEffect, useRef, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import {
  AlphaTabApi,
  Settings,
  NotationElement,
  synth,
  midi,
  model,
} from '@coderline/alphatab';
import type { Exercise } from '../data/exercises';
import { extractTimedNotes, type TimedNote } from '../audio/noteExtractor';
import { playClick as synthClick } from '../audio/clickSynth';
import MetronomeSettings, { type MetronomeConfig } from './MetronomeSettings';
import BpmDisplay from './BpmDisplay';
import MicFeedbackDisplay from './MicFeedbackDisplay';
import Tuner from './Tuner';
import type { PitchResult } from '../audio/pitchDetector';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { ChevronDown } from 'lucide-react';
import type { NoteEvaluation } from '../evaluation/types';
import NoteEvaluationOverlay, { type BeatRect } from './NoteEvaluationOverlay';

export type { TimedNote as NoteEvent };

// ── Note evaluation color constants ─────────────
const EVAL_ON_TIME_MS = 20;
const EVAL_COLOR_HIT    = new model.Color(34, 197, 94);    // emerald-500
const EVAL_COLOR_TIMING = new model.Color(245, 158, 11);   // amber-500
const EVAL_COLOR_MISS   = new model.Color(239, 68, 68);    // red-500

/** Imperative handle exposed via ref. */
export interface AlphaTabHandle {
  playPause: () => void;
  stop: () => void;
  toggleLoop: () => void;
  changeTempo: (delta: number) => void;
  getTempo: () => number;
}

interface AlphaTabViewProps {
  exercise: Exercise;
  onReady?: () => void;
  onTempoChange?: (tempo: number) => void;
  onNoteDataExtracted?: (notes: TimedNote[]) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onPositionChange?: (positionMs: number) => void;
  metronomeConfig: MetronomeConfig;
  onMetronomeConfigChange: (config: MetronomeConfig) => void;
  isListening?: boolean;
  currentPitch?: PitchResult;
  onToggleMic?: () => void;
  latencyMs?: number;
  onLatencyChange?: (ms: number) => void;
  noteEvaluations?: NoteEvaluation[];
  demoMode?: boolean;
  onToggleDemo?: () => void;
}

const AlphaTabView = forwardRef<AlphaTabHandle, AlphaTabViewProps>(function AlphaTabView({
  exercise,
  onReady,
  onNoteDataExtracted,
  onPlayStateChange,
  onPositionChange,
  metronomeConfig,
  onMetronomeConfigChange,
  isListening = false,
  currentPitch,
  onToggleMic,
  latencyMs = 0,
  onLatencyChange,
  noteEvaluations = [],
  demoMode = false,
  onToggleDemo,
}, ref) {
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
  const [currentTime, setCurrentTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [beatBoundsMap, setBeatBoundsMap] = useState<Map<number, BeatRect>>(new Map());
  const [beatPulse, setBeatPulse] = useState(false);
  const beatPulseTimeoutRef = useRef<number | null>(null);
  /** Map beatIndex → actual AlphaTab Beat object (for native note coloring). */
  const beatObjectMapRef = useRef<Map<number, InstanceType<typeof model.Beat>>>(new Map());
  /** Track which beatIndices already have styles applied (avoid redundant work). */
  const styledBeatsRef = useRef<Set<number>>(new Set());

  // Initialise AlphaTab
  useEffect(() => {
    if (!containerRef.current) return;

    const api = new AlphaTabApi(containerRef.current, {
      core: {
        fontDirectory: import.meta.env.BASE_URL + 'font/',
        tex: true,
      },
      display: {
        staveProfile: 'Default',  // Standard notation + tab
        layoutMode: 0, // Page — wraps score onto multiple lines
        scale: 1.0,
      },
      player: {
        enablePlayer: true,
        enableCursor: true,
        enableUserInteraction: true,
        soundFont: import.meta.env.BASE_URL + 'soundfont/sonivox.sf2',
        outputMode: 1, // WebAudioScriptProcessor — bypass AudioWorklet (Vite 8 compat)
        scrollElement: viewportRef.current!,
        scrollOffsetX: -30,
        scrollOffsetY: -30,
        scrollMode: 1, // OffScreen — scroll when cursor leaves viewport
      },
    } as unknown as Settings);

    apiRef.current = api;
    // Hide score header & tempo from rendered notation (shown in our toolbar)
    const els = api.settings.notation.elements;
    els.set(NotationElement.ScoreTitle, false);
    els.set(NotationElement.ScoreSubTitle, false);
    els.set(NotationElement.ScoreArtist, false);
    els.set(NotationElement.ScoreAlbum, false);
    els.set(NotationElement.ScoreWords, false);
    els.set(NotationElement.ScoreMusic, false);
    els.set(NotationElement.ScoreWordsAndMusic, false);
    els.set(NotationElement.ScoreCopyright, false);
    els.set(NotationElement.GuitarTuning, false);
    els.set(NotationElement.EffectTempo, false);
    // ── Events ────────────────────────────────────
    api.renderStarted.on(() => setIsLoading(true));
    api.renderFinished.on(() => {
      setIsLoading(false);
      // Build beat bounds map for note evaluation overlay
      const lookup = api.renderer.boundsLookup;
      const score = api.score;
      if (lookup && score) {
        const map = new Map<number, BeatRect>();
        const beatObjMap = new Map<number, InstanceType<typeof model.Beat>>();
        let bi = 0;
        for (const track of score.tracks) {
          for (const staff of track.staves) {
            for (const bar of staff.bars) {
              for (const voice of bar.voices) {
                for (const beat of voice.beats) {
                  const bb = lookup.findBeat(beat);
                  if (bb) {
                    const vb = bb.visualBounds;
                    map.set(bi, { x: vb.x, y: vb.y, w: vb.w, h: vb.h });
                  }
                  beatObjMap.set(bi, beat);
                  bi++;
                }
              }
            }
          }
        }
        setBeatBoundsMap(map);
        beatObjectMapRef.current = beatObjMap;
      }
    });

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

    // ── Note coloring via AlphaTab model styles ───────
    // Wired as a separate effect below (applyNoteColors)

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

  // ── Apply note colours via AlphaTab model styles ────────
  // Colours: green (hit, good timing), amber (hit, off timing), red (miss)

  const noteEvaluationsRef = useRef(noteEvaluations);
  noteEvaluationsRef.current = noteEvaluations;

  /** Remove all note/beat styles we applied. */
  const clearNoteColors = useCallback(() => {
    for (const bi of styledBeatsRef.current) {
      const beat = beatObjectMapRef.current.get(bi);
      if (!beat) continue;
      beat.style = undefined;
      for (const note of beat.notes) {
        note.style = undefined;
      }
    }
    styledBeatsRef.current.clear();
  }, []);

  /** Apply colours for all current evaluations onto the AlphaTab model. */
  const applyNoteColors = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;

    // Group evaluations by beat — keep the worst status per beat
    const beatStatusMap = new Map<number, { isHit: boolean; timingOffsetMs: number }>();
    for (const ev of noteEvaluationsRef.current) {
      const bi = ev.expected.beatIndex;
      const existing = beatStatusMap.get(bi);
      // Prioritise: miss > timing-off > hit
      const evPriority = !ev.isHit ? 2 : Math.abs(ev.timingOffsetMs) > EVAL_ON_TIME_MS ? 1 : 0;
      const existingPriority = existing
        ? (!existing.isHit ? 2 : Math.abs(existing.timingOffsetMs) > EVAL_ON_TIME_MS ? 1 : 0)
        : -1;
      if (evPriority > existingPriority) {
        beatStatusMap.set(bi, { isHit: ev.isHit, timingOffsetMs: ev.timingOffsetMs });
      }
    }

    for (const [bi, { isHit, timingOffsetMs }] of beatStatusMap) {
      const beat = beatObjectMapRef.current.get(bi);
      if (!beat) continue;

      const color = !isHit
        ? EVAL_COLOR_MISS
        : Math.abs(timingOffsetMs) > EVAL_ON_TIME_MS
          ? EVAL_COLOR_TIMING
          : EVAL_COLOR_HIT;

      // Colour the beat elements (stems, beams, flags)
      if (!beat.style) {
        beat.style = new model.BeatStyle();
      }
      beat.style.colors.set(model.BeatSubElement.StandardNotationStem, color);
      beat.style.colors.set(model.BeatSubElement.StandardNotationFlags, color);
      beat.style.colors.set(model.BeatSubElement.StandardNotationBeams, color);
      beat.style.colors.set(model.BeatSubElement.GuitarTabStem, color);
      beat.style.colors.set(model.BeatSubElement.GuitarTabFlags, color);
      beat.style.colors.set(model.BeatSubElement.GuitarTabBeams, color);

      // Colour each note (note head / tab number)
      for (const note of beat.notes) {
        if (!note.style) {
          note.style = new model.NoteStyle();
        }
        note.style.colors.set(model.NoteSubElement.StandardNotationNoteHead, color);
        note.style.colors.set(model.NoteSubElement.GuitarTabFretNumber, color);
      }

      styledBeatsRef.current.add(bi);
    }
  }, []);

  // When playback stops and we have evaluations → apply native note colors & re-render
  const wasPlayingRef = useRef(false);
  useEffect(() => {
    const wasPlaying = wasPlayingRef.current;
    wasPlayingRef.current = isPlaying;

    if (isPlaying && !wasPlaying) {
      // Playback just started — clear any previous colouring and re-render clean
      if (styledBeatsRef.current.size > 0) {
        clearNoteColors();
        apiRef.current?.render();
      }
    } else if (!isPlaying && wasPlaying) {
      // Playback just stopped — apply note colours and re-render
      if (noteEvaluationsRef.current.length > 0) {
        applyNoteColors();
        apiRef.current?.render();
      }
    }
  }, [isPlaying, applyNoteColors, clearNoteColors]);

  // ── Playback actions ────────────────────────────
  const playPause = useCallback(() => {
    apiRef.current?.playPause();
  }, []);

  const stop = useCallback(() => {
    apiRef.current?.stop();
    // Scroll the notation viewport back to the start
    viewportRef.current?.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
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

  const toggleMute = useCallback(() => {
    if (!apiRef.current) return;
    const next = !isMuted;
    apiRef.current.masterVolume = next ? 0 : 1;
    setIsMuted(next);
  }, [isMuted]);

  // ── Metronome volume management ─────────────────
  // AlphaTab's built-in metronome is sample-accurate (rendered into the same
  // audio buffer as the playback).  Our custom Web Audio clicks, on the other
  // hand, are triggered by `midiEventsPlayed` which fires *after* the audio
  // has already played — up to ~93 ms late with ScriptProcessor (4 096 samples).
  //
  // Strategy:
  //   • Default sound, no accent → use built-in metronome (perfectly in sync)
  //   • Custom sound OR accent    → mute built-in, use Web Audio clicks
  //     (slight latency is the trade-off for custom timbre / accent)

  const useCustomClicks = metronomeConfig.enabled &&
    (metronomeConfig.accentFirstBeat || metronomeConfig.clickSound !== 'default');

  useEffect(() => {
    if (!apiRef.current) return;
    const cfg = metronomeConfig;

    if (useCustomClicks) {
      // Custom clicks active — silence ALL built-in sounds to avoid doubling.
      // countInVolume must stay > 0 to keep the count-in phase active, but
      // low enough to be inaudible.
      apiRef.current.metronomeVolume = 0;
      apiRef.current.countInVolume = cfg.countInBars > 0 ? 0.01 : 0;
    } else {
      // Use built-in metronome — perfectly in sync with playback.
      apiRef.current.metronomeVolume = cfg.enabled ? 1 : 0;
      apiRef.current.countInVolume = cfg.countInBars > 0 ? 1 : 0;
    }
  }, [metronomeConfig, useCustomClicks]);

  // ── Custom click sound & accent via Web Audio ──────────
  const metronomeConfigRef = useRef(metronomeConfig);
  metronomeConfigRef.current = metronomeConfig;

  // Build a simple click using the shared synthesiser
  const playClick = useCallback((accent: boolean) => {
    const cfg = metronomeConfigRef.current;
    if (!cfg.enabled) return;
    synthClick(cfg.clickSound, accent && cfg.accentFirstBeat);
  }, []);

  // Beat pulse — brief visual flash on each beat
  const triggerBeatPulse = useCallback(() => {
    if (beatPulseTimeoutRef.current !== null) {
      clearTimeout(beatPulseTimeoutRef.current);
    }
    setBeatPulse(true);
    beatPulseTimeoutRef.current = window.setTimeout(() => {
      setBeatPulse(false);
      beatPulseTimeoutRef.current = null;
    }, 120);
  }, []);

  // Subscribe to AlphaTab metronome MIDI events for beat pulse & custom click
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;

    const handleEvents = (e: { events: unknown[] }) => {
      for (const evt of e.events) {
        const me = evt as { isMetronome?: boolean; metronomeNumerator?: number };
        if (me.isMetronome) {
          // Always pulse on beat
          triggerBeatPulse();
          // Custom click sound (only when a non-default sound or accent is active)
          const cfg = metronomeConfigRef.current;
          if (cfg.enabled && (cfg.accentFirstBeat || cfg.clickSound !== 'default')) {
            playClick(me.metronomeNumerator === 0);
          }
        }
      }
    };

    // Tell AlphaTab to emit metronome events
    api.midiEventsPlayedFilter = [midi.MidiEventType.AlphaTabMetronome];
    api.midiEventsPlayed.on(handleEvents);

    return () => {
      api.midiEventsPlayed.off(handleEvents);
    };
  }, [playClick, triggerBeatPulse]);

  // Looping
  const [isLooping, setIsLooping] = useState(false);
  const toggleLoop = useCallback(() => {
    if (!apiRef.current) return;
    apiRef.current.isLooping = !isLooping;
    setIsLooping(!isLooping);
  }, [isLooping]);

  // Expose transport actions to parent via ref
  useImperativeHandle(ref, () => ({
    playPause,
    stop,
    toggleLoop,
    changeTempo: (delta: number) => {
      const clamped = Math.max(40, Math.min(200, tempo + delta));
      changeSpeed(clamped);
    },
    getTempo: () => tempo,
  }), [playPause, stop, toggleLoop, tempo, changeSpeed]);

  // ── Time formatting helper ─────────────────────
  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      {/* Top bar */}
      <div className="px-3 py-2 border-b border-border flex items-center gap-3" role="toolbar" aria-label="Playback Controls">

        {/* ── Left group: Play · Time · Title ── */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Play / Pause */}
          <button
            onClick={playPause}
            disabled={!playerReady}
            className="bg-primary hover:bg-primary/80 disabled:bg-muted text-primary-foreground rounded-lg p-2.5 shadow-sm transition-all shrink-0"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            aria-pressed={isPlaying}
          >
            {isPlaying ? (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <rect x="4" y="3" width="4" height="14" rx="1" />
                <rect x="12" y="3" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 3.5L16 10L5 16.5V3.5Z" />
              </svg>
            )}
          </button>

          {/* Return to start */}
          <button
            onClick={stop}
            disabled={!playerReady}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary disabled:opacity-40 transition-colors shrink-0"
            title="Return to start (Escape)"
            aria-label="Return to start"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="3" height="14" rx="0.5" fill="currentColor" stroke="none" />
              <path d="M20 5L10 12l10 7V5z" fill="currentColor" stroke="none" />
            </svg>
          </button>

          {/* Time */}
          <span className="text-xs text-muted-foreground font-mono tabular-nums shrink-0" aria-live="off">
            {fmt(currentTime)} / {fmt(endTime)}
          </span>

          {/* Separator */}
          <div className="w-px h-6 bg-border shrink-0" role="presentation" />

          {/* Title + subtitle */}
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground truncate leading-tight">
              {exercise.title}
            </h2>
            <p className="text-muted-foreground text-[11px] truncate leading-tight">{exercise.subtitle}</p>
          </div>
        </div>

        {/* ── Spacer ── */}
        <div className="flex-1" />

        {/* ── Right group: controls ── */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Tempo */}
          <BpmDisplay
            value={tempo}
            onChange={changeSpeed}
            disabled={!playerReady}
          />
          {isPlaying && (
            <div
              className={`w-2 h-2 rounded-full shrink-0 transition-all duration-100 ease-out ${
                beatPulse
                  ? 'bg-primary scale-125 opacity-100'
                  : 'bg-primary/20 scale-100 opacity-60'
              }`}
              aria-hidden="true"
            />
          )}

          {/* Mic / Speaker section */}
          {onToggleMic && (
            <>
              <div className="w-px h-6 bg-border" role="presentation" />

              {/* Mute playback */}
              <button
                onClick={toggleMute}
                disabled={!playerReady}
                className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                  isMuted
                    ? 'bg-destructive/10 text-destructive'
                    : 'text-muted-foreground hover:bg-secondary'
                }`}
                title={isMuted ? 'Unmute playback' : 'Mute playback'}
                aria-label={isMuted ? 'Unmute playback' : 'Mute playback'}
                aria-pressed={isMuted}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {isMuted ? (
                    <>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </>
                  ) : (
                    <>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </>
                  )}
                </svg>
              </button>

              {/* Mic toggle */}
              <button
                onClick={onToggleMic}
                className={`p-1.5 rounded-lg transition-colors ${
                  isListening
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'text-muted-foreground hover:bg-secondary'
                }`}
                title={isListening ? 'Stop listening' : 'Start listening'}
                aria-label={isListening ? 'Stop listening' : 'Start listening'}
                aria-pressed={isListening}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {isListening ? (
                    <>
                      <line x1="1" y1="1" x2="23" y2="23" />
                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </>
                  ) : (
                    <>
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </>
                  )}
                </svg>
              </button>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    title="Mic settings"
                    aria-label="Mic settings"
                  >
                    <ChevronDown size={12} className="opacity-50" aria-hidden="true" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-4" align="end" sideOffset={8}>
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-foreground">Mic Settings</h4>

                    {/* Latency compensation */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-foreground">Latency</Label>
                        <span className="text-xs font-mono text-muted-foreground tabular-nums w-10 text-right">
                          {latencyMs} ms
                        </span>
                      </div>
                      <Slider
                        min={0}
                        max={200}
                        step={5}
                        value={[latencyMs]}
                        onValueChange={([v]) => onLatencyChange?.(v)}
                        aria-label="Input latency"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Compensate for hardware input delay
                      </p>
                    </div>

                    {/* Demo mode */}
                    {onToggleDemo && (
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-xs text-foreground">Demo mode</Label>
                          <p className="text-[10px] text-muted-foreground">Simulate mic input</p>
                        </div>
                        <button
                          onClick={onToggleDemo}
                          className={`relative w-9 h-5 rounded-full transition-colors ${
                            demoMode ? 'bg-violet-500' : 'bg-muted'
                          }`}
                          aria-label="Toggle demo mode"
                          role="switch"
                          aria-checked={demoMode}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                              demoMode ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    )}

                    {/* Tuner */}
                    <div className="pt-2 border-t border-border">
                      <Tuner currentPitch={currentPitch} />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              {/* Note detection — right of mic toggle */}
              {isListening && currentPitch && (
                <MicFeedbackDisplay currentPitch={currentPitch} />
              )}
            </>
          )}

          {/* Separator */}
          <div className="w-px h-6 bg-border" role="presentation" />

          {/* Loop */}
          <button
            onClick={toggleLoop}
            disabled={!playerReady}
            className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
              isLooping
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-secondary'
            }`}
            title="Toggle loop (L)"
            aria-label="Toggle loop"
            aria-pressed={isLooping}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 2l4 4-4 4" />
              <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
              <path d="M7 22l-4-4 4-4" />
              <path d="M21 13v1a4 4 0 0 1-4 4H3" />
            </svg>
          </button>

          {/* Metronome settings popover */}
          <MetronomeSettings
            config={metronomeConfig}
            onChange={onMetronomeConfigChange}
            disabled={!playerReady}
          />
        </div>
      </div>

      {/* Progress bar (under toolbar) */}
      <div 
        className="h-0.5 bg-muted shrink-0"
        role="progressbar"
        aria-label="Playback progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={endTime > 0 ? Math.round((currentTime / endTime) * 100) : 0}
      >
        <div
          className="h-full bg-primary transition-all duration-200"
          style={{ width: endTime > 0 ? `${(currentTime / endTime) * 100}%` : '0%' }}
        />
      </div>

      {/* AlphaTab rendering viewport */}
      <div
        ref={viewportRef}
        className="flex-1 overflow-y-auto relative isolate scrollbar-autohide"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
          </div>
        )}
        <div className="relative">
          <div ref={containerRef} className="at-main" />
          {noteEvaluations.length > 0 && beatBoundsMap.size > 0 && (
            <NoteEvaluationOverlay
              evaluations={noteEvaluations}
              beatBoundsMap={beatBoundsMap}
            />
          )}
        </div>
      </div>

    </div>
  );
});

export default AlphaTabView;
