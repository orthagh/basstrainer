import { useEffect, useRef, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import {
  AlphaTabApi,
  Settings,
  NotationElement,
  StaveProfile as AlphaTabStaveProfile,
  synth,
  model,
} from '@coderline/alphatab';
import type { Exercise } from '../types';
import { buildTempoMap, tickToMs } from '../audio/noteExtractor';
import MetronomeSettings, { type MetronomeConfig } from './MetronomeSettings';
import DisplaySettings from './DisplaySettings';
import { loadStaveProfile, type StaveProfile } from '@/lib/displaySettings';

const SCORE_DARK_LS_KEY = 'groovetrainer:scoreDark';
import BpmDisplay from './BpmDisplay';
import { Slider } from '@/components/ui/slider';
import { ChevronRight } from 'lucide-react';
import { Icon } from '@iconify/react';
import InstrumentIcon from './InstrumentIcon';

interface SectionMarker {
  text: string;
  startMs: number;
  startTick: number;
}

type AlphaTabTrack = InstanceType<typeof model.Track>;

function sameIndexes(left: number[], right: number[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const normalizedLeft = [...left].sort((a, b) => a - b);
  const normalizedRight = [...right].sort((a, b) => a - b);

  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
}

function getTrackLabel(track: AlphaTabTrack): string {
  const name = track.name.trim();
  if (name.length > 0) {
    return name;
  }

  const shortName = track.shortName.trim();
  if (shortName.length > 0) {
    return shortName;
  }

  return `Track ${track.index + 1}`;
}


function getDefaultSelectedTrackIndex(tracks: AlphaTabTrack[]): number | null {
  if (tracks.length === 0) {
    return null;
  }

  const bassTrack = tracks.find((track) => /bass/i.test(getTrackLabel(track)));
  if (bassTrack) {
    return bassTrack.index;
  }

  const bassStringTrack = tracks.find((track) => {
    const stringCount = track.staves?.[0]?.tuning?.length ?? 0;
    return stringCount === 4 || stringCount === 5;
  });
  if (bassStringTrack) {
    return bassStringTrack.index;
  }

  const visibleTrack = tracks.find((track) => track.isVisibleOnMultiTrack);
  return (visibleTrack ?? tracks[0]).index;
}

/** Imperative handle exposed via ref. */
export interface AlphaTabHandle {
  playPause: () => void;
  stop: () => void;
  toggleLoop: () => void;
  changeTempo: (delta: number) => void;
  getTempo: () => number;
  moveToPreviousBar: () => void;
  moveToNextBar: () => void;
  moveToPreviousLine: () => void;
  moveToNextLine: () => void;
  toggleTracks: () => void;
}

interface AlphaTabViewProps {
  exercise: Exercise;
  sidebarWidth?: number;
  onReady?: () => void;
  onTempoChange?: (tempo: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onPositionChange?: (positionMs: number) => void;
  metronomeConfig: MetronomeConfig;
  onMetronomeConfigChange: (config: MetronomeConfig) => void;
}

const AlphaTabView = forwardRef<AlphaTabHandle, AlphaTabViewProps>(function AlphaTabView({
  exercise,
  sidebarWidth = 0,
  onReady,
  onPlayStateChange,
  onPositionChange,
  metronomeConfig,
  onMetronomeConfigChange,
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
  // For GP files loaded directly, defaultTempo is unknown upfront.
  // We update this ref from api.masterBpm once playerReady fires.
  const baseTempo = useRef(exercise.defaultTempo);
  const [currentTime, setCurrentTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [scoreDurationMs, setScoreDurationMs] = useState(0);
  const [staveProfile, setStaveProfile] = useState<StaveProfile>(() => loadStaveProfile());
  const [scoreDark, setScoreDark] = useState<boolean>(() => {
    const stored = localStorage.getItem(SCORE_DARK_LS_KEY);
    return stored === null ? true : stored === 'true';
  });
  const [sections, setSections] = useState<SectionMarker[]>([]);

  const [isLooping, setIsLooping] = useState(false);
  const [availableTracks, setAvailableTracks] = useState<AlphaTabTrack[]>([]);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState<number | null>(null);
  const [mutedTrackIndexes, setMutedTrackIndexes] = useState<number[]>([]);
  const [soloTrackIndexes, setSoloTrackIndexes] = useState<number[]>([]);
  const [trackVolumes, setTrackVolumes] = useState<Record<number, number>>({});
  const [activeVolumeTrackIndex, setActiveVolumeTrackIndex] = useState<number | null>(null);
  const [isTracksPanelOpen, setIsTracksPanelOpen] = useState(false);
  const [scoreInfo, setScoreInfo] = useState<{ title: string; artist: string; tunings: Map<number, string[]> } | null>(null);

  const activeVolumeTimeoutRef = useRef<number | null>(null);
  const dragStartBeatRef = useRef<InstanceType<typeof model.Beat> | null>(null);
  const renderFinishedRef = useRef(false);
  const playerReadyRef = useRef(false);

  // Initialise AlphaTab
  useEffect(() => {
    if (!containerRef.current) return;

    setIsPlaying(false);
    setIsLoading(true);
    setPlayerReady(false);
    renderFinishedRef.current = false;
    playerReadyRef.current = false;
    setCurrentTime(0);
    setEndTime(0);
    setScoreDurationMs(0);
    setAvailableTracks([]);
    setSelectedTrackIndex(null);
    setMutedTrackIndexes([]);
    setSoloTrackIndexes([]);
    setTrackVolumes({});
    setSections([]);

    const api = new AlphaTabApi(containerRef.current, {
      core: {
        fontDirectory: import.meta.env.BASE_URL + 'font/',
        tex: !!exercise.tex,
      },
      display: {
        staveProfile: 'Default',  // Standard notation + tab
        layoutMode: 0, // Page — wraps score onto multiple lines
        scale: 1.0,
        firstSystemPaddingTop: 8,
        systemPaddingTop: 20,
        systemPaddingBottom: 20,
      },
      player: {
        enablePlayer: true,
        enableCursor: true,
        enableUserInteraction: true,
        soundFont: import.meta.env.BASE_URL + 'soundfont/musescore-general.sf3',
        scrollElement: viewportRef.current!,
        scrollOffsetX: -30,
        scrollOffsetY: -30,
        scrollMode: 1, // OffScreen — scroll when cursor leaves viewport
      },
    } as unknown as Settings);

    apiRef.current = api;
    // Score header rendered as custom React elements; hide AlphaTab's native rendering
    const els = api.settings.notation.elements;
    els.set(NotationElement.ScoreTitle, false);
    els.set(NotationElement.ScoreSubTitle, false);
    els.set(NotationElement.ScoreArtist, false);
    els.set(NotationElement.GuitarTuning, false);
    els.set(NotationElement.ScoreAlbum, false);
    els.set(NotationElement.ScoreWords, false);
    els.set(NotationElement.ScoreMusic, false);
    els.set(NotationElement.ScoreWordsAndMusic, false);
    els.set(NotationElement.ScoreCopyright, false);
    els.set(NotationElement.EffectTempo, false);
    // ── Events ────────────────────────────────────
    api.scoreLoaded.on((score) => {
      const nextTracks = score.tracks as AlphaTabTrack[];
      const validIndexes = new Set(nextTracks.map((track) => track.index));

      // Extract title, artist, and per-track tuning for custom header
      const tunings = new Map<number, string[]>();
      for (const track of nextTracks) {
        const raw: number[] = track.staves?.[0]?.tuning ?? [];
        if (raw.length > 0) {
          tunings.set(track.index, raw.map((midi) => model.Tuning.getTextForTuning(midi, false)));
        }
      }
      setScoreInfo({
        title: (score as unknown as { title: string }).title ?? '',
        artist: (score as unknown as { artist: string }).artist ?? '',
        tunings,
      });

      setAvailableTracks(nextTracks);
      setSelectedTrackIndex((previous) => {
        if (previous !== null && validIndexes.has(previous)) {
          return previous;
        }

        return getDefaultSelectedTrackIndex(nextTracks);
      });
      setMutedTrackIndexes((previous) => previous.filter((index) => validIndexes.has(index)));
      setSoloTrackIndexes((previous) => previous.filter((index) => validIndexes.has(index)));
      setTrackVolumes((previous) => {
        const nextVolumes: Record<number, number> = {};
        for (const track of nextTracks) {
          const previousVolume = previous[track.index];
          nextVolumes[track.index] = typeof previousVolume === 'number'
            ? Math.max(0, Math.min(previousVolume, 1.5))
            : 1;
        }
        return nextVolumes;
      });
    });

    api.renderStarted.on(() => setIsLoading(true));
    api.renderFinished.on(() => {
      renderFinishedRef.current = true;
      viewportRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (playerReadyRef.current) {
        setIsLoading(false);
      }
    });

    api.playerReady.on(() => {
      playerReadyRef.current = true;
      setPlayerReady(true);
      if (renderFinishedRef.current) {
        setIsLoading(false);
      }
      onReady?.();
      // For GP files, read the actual tempo from the score instead of the placeholder.
      if (exercise.filePath && api.score) {
        baseTempo.current = api.score.tempo;
        setTempo(api.score.tempo);
      }

      // Extract section markers for the progress bar
      if (api.score && api.tickCache) {
        const tempoMap = buildTempoMap(api);
        const mbs = api.tickCache.masterBars;
        if (mbs.length > 0) {
          const lastMb = mbs[mbs.length - 1];
          setScoreDurationMs(tickToMs(tempoMap, lastMb.end));
        }
        const extracted: SectionMarker[] = [];
        for (const mb of api.tickCache.masterBars) {
          const sec = mb.masterBar.section;
          if (sec) {
            const label = sec.text?.trim() || sec.marker?.trim() || '';
            extracted.push({ text: label, startMs: tickToMs(tempoMap, mb.start), startTick: mb.start });
          }
        }
        // If the score starts before the first section marker, prepend an unnamed section at tick 0
        if (extracted.length > 0 && extracted[0].startTick > 0) {
          extracted.unshift({ text: '', startMs: 0, startTick: 0 });
        }
        setSections(extracted);
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

    // ── Loop selection via AlphaTab's native beat mouse events ───────────
    api.beatMouseDown.on((beat) => {
      dragStartBeatRef.current = beat as InstanceType<typeof model.Beat>;
      api.highlightPlaybackRange(beat, beat);
    });
    api.beatMouseMove.on((beat) => {
      if (!dragStartBeatRef.current) return;
      api.highlightPlaybackRange(dragStartBeatRef.current, beat);
    });
    api.beatMouseUp.on((beat) => {
      if (!dragStartBeatRef.current) return;
      const endBeat = (beat ?? dragStartBeatRef.current) as InstanceType<typeof model.Beat>;
      api.highlightPlaybackRange(dragStartBeatRef.current, endBeat);
      api.applyPlaybackRangeFromHighlight();
      dragStartBeatRef.current = null;
    });

    // Load the exercise — GP binary file or AlphaTex string
    if (exercise.filePath) {
      api.load(exercise.filePath);
    } else if (exercise.tex) {
      api.tex(exercise.tex);
    }

    return () => {
      api.destroy();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id]);

  // Re-render after sidebar transition completes so AlphaTab lays out at the correct width
  useEffect(() => {
    const id = setTimeout(() => apiRef.current?.render(), 220);
    return () => clearTimeout(id);
  }, [sidebarWidth]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api || availableTracks.length === 0 || selectedTrackIndex === null) {
      return;
    }

    const nextTrack = availableTracks.find((track) => track.index === selectedTrackIndex);
    if (!nextTrack) {
      return;
    }

    const currentTrackIndexes = api.tracks.map((track) => track.index);
    const nextTrackIndexes = [nextTrack.index];
    if (sameIndexes(currentTrackIndexes, nextTrackIndexes)) {
      return;
    }

    api.renderTracks([nextTrack]);
  }, [availableTracks, selectedTrackIndex]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api || availableTracks.length === 0) {
      return;
    }

    const mutedSet = new Set(mutedTrackIndexes);
    const soloSet = new Set(soloTrackIndexes);

    for (const track of availableTracks) {
      api.changeTrackSolo([track], false);
      api.changeTrackMute([track], false);
    }

    for (const track of availableTracks) {
      if (mutedSet.has(track.index)) {
        api.changeTrackMute([track], true);
      }
    }

    for (const track of availableTracks) {
      if (soloSet.has(track.index)) {
        api.changeTrackSolo([track], true);
      }
    }
  }, [availableTracks, mutedTrackIndexes, soloTrackIndexes]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api || availableTracks.length === 0) {
      return;
    }

    for (const track of availableTracks) {
      const volume = trackVolumes[track.index] ?? 1;
      api.changeTrackVolume([track], volume);
    }
  }, [availableTracks, trackVolumes]);

  // ── Playback actions ────────────────────────────
  const playPause = useCallback(() => {
    apiRef.current?.playPause();
  }, []);

  const stop = useCallback(() => {
    apiRef.current?.stop();
    // Scroll the notation viewport back to the start
    viewportRef.current?.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, []);

  // ── Bar / line navigation ────────────────────────
  const moveToPreviousBar = useCallback(() => {
    const api = apiRef.current;
    if (!api?.tickCache) return;
    const bars = api.tickCache.masterBars;
    if (bars.length === 0) return;
    const cur = api.tickPosition;
    let currentIdx = 0;
    for (let i = 0; i < bars.length; i++) {
      if (bars[i].start <= cur) currentIdx = i;
      else break;
    }
    api.tickPosition = bars[Math.max(0, currentIdx - 1)].start;
  }, []);

  const moveToNextBar = useCallback(() => {
    const api = apiRef.current;
    if (!api?.tickCache) return;
    const bars = api.tickCache.masterBars;
    if (bars.length === 0) return;
    const cur = api.tickPosition;
    let currentIdx = 0;
    for (let i = 0; i < bars.length; i++) {
      if (bars[i].start <= cur) currentIdx = i;
      else break;
    }
    api.tickPosition = bars[Math.min(bars.length - 1, currentIdx + 1)].start;
  }, []);

  const getLineStartTicks = useCallback((): number[] => {
    const api = apiRef.current;
    if (!api?.tickCache || !api.renderer?.boundsLookup) return [];
    const masterBars = api.tickCache.masterBars;
    const ticks: number[] = [];
    for (const system of api.renderer.boundsLookup.staffSystems) {
      if (system.bars.length > 0) {
        // MasterBarBounds.index is the master bar index
        const mbIdx = system.bars[0].index;
        if (mbIdx >= 0 && mbIdx < masterBars.length) {
          ticks.push(masterBars[mbIdx].start);
        }
      }
    }
    return ticks;
  }, []);

  const moveToPreviousLine = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    const lineTicks = getLineStartTicks();
    if (lineTicks.length === 0) return;
    const cur = api.tickPosition;
    let currentLineIdx = 0;
    for (let i = 0; i < lineTicks.length; i++) {
      if (lineTicks[i] <= cur) currentLineIdx = i;
      else break;
    }
    api.tickPosition = lineTicks[Math.max(0, currentLineIdx - 1)];
  }, [getLineStartTicks]);

  const moveToNextLine = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    const lineTicks = getLineStartTicks();
    if (lineTicks.length === 0) return;
    const cur = api.tickPosition;
    let currentLineIdx = 0;
    for (let i = 0; i < lineTicks.length; i++) {
      if (lineTicks[i] <= cur) currentLineIdx = i;
      else break;
    }
    api.tickPosition = lineTicks[Math.min(lineTicks.length - 1, currentLineIdx + 1)];
  }, [getLineStartTicks]);

  const toggleTracks = useCallback(() => {
    if (availableTracks.length > 1) {
      setIsTracksPanelOpen((v) => !v);
    }
  }, [availableTracks.length]);

  // Tempo (playback speed multiplier)
  const changeSpeed = useCallback(
    (newTempo: number) => {
      if (!apiRef.current) return;
      setTempo(newTempo);
      apiRef.current.playbackSpeed = newTempo / baseTempo.current;
    },
    [],
  );

  // ── Stave profile (notation display) ─────────────
  const STAVE_PROFILE_MAP: Record<StaveProfile, AlphaTabStaveProfile> = {
    Default: AlphaTabStaveProfile.ScoreTab,
    Score:   AlphaTabStaveProfile.Score,
    Tab:     AlphaTabStaveProfile.Tab,
  };

  useEffect(() => {
    const api = apiRef.current;
    if (!api || !playerReady) return;
    api.settings.display.staveProfile = STAVE_PROFILE_MAP[staveProfile];
    api.updateSettings();
    api.render();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staveProfile, playerReady]);

  // ── Metronome volume management ─────────────────
  // Always use AlphaTab's built-in metronome, which is rendered sample-accurately
  // inside the same audio buffer as playback.
  useEffect(() => {
    if (!apiRef.current) return;
    const cfg = metronomeConfig;
    apiRef.current.metronomeVolume = cfg.enabled ? cfg.volume : 0;
    apiRef.current.countInVolume = cfg.countInBars > 0 ? cfg.volume : 0;
  }, [metronomeConfig]);

  // Looping — toggle on/off; range is set by dragging on the score
  const toggleLoop = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    if (isLooping) {
      api.isLooping = false;
      setIsLooping(false);
    } else {
      api.isLooping = true;
      setIsLooping(true);
    }
  }, [isLooping]);

  const toggleTrackMute = useCallback((trackIndex: number) => {
    setMutedTrackIndexes((previous) => (
      previous.includes(trackIndex)
        ? previous.filter((index) => index !== trackIndex)
        : [...previous, trackIndex].sort((left, right) => left - right)
    ));
    setSoloTrackIndexes((previous) => previous.filter((index) => index !== trackIndex));
  }, []);

  const toggleTrackSolo = useCallback((trackIndex: number) => {
    setSoloTrackIndexes((previous) => (
      previous.includes(trackIndex)
        ? previous.filter((index) => index !== trackIndex)
        : [...previous, trackIndex].sort((left, right) => left - right)
    ));
    setMutedTrackIndexes((previous) => previous.filter((index) => index !== trackIndex));
  }, []);

  const setTrackVolume = useCallback((trackIndex: number, nextVolumePercent: number) => {
    const clampedPercent = Math.max(0, Math.min(nextVolumePercent, 150));
    const normalizedVolume = clampedPercent / 100;

    if (activeVolumeTimeoutRef.current !== null) {
      window.clearTimeout(activeVolumeTimeoutRef.current);
    }
    setActiveVolumeTrackIndex(trackIndex);
    activeVolumeTimeoutRef.current = window.setTimeout(() => {
      setActiveVolumeTrackIndex((current) => (current === trackIndex ? null : current));
      activeVolumeTimeoutRef.current = null;
    }, 900);

    setTrackVolumes((previous) => ({
      ...previous,
      [trackIndex]: normalizedVolume,
    }));
  }, []);

  useEffect(() => () => {
    if (activeVolumeTimeoutRef.current !== null) {
      window.clearTimeout(activeVolumeTimeoutRef.current);
    }
  }, []);

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
    moveToPreviousBar,
    moveToNextBar,
    moveToPreviousLine,
    moveToNextLine,
    toggleTracks,
  }), [playPause, stop, toggleLoop, tempo, changeSpeed, moveToPreviousBar, moveToNextBar, moveToPreviousLine, moveToNextLine, toggleTracks]);

  // ── Time formatting helper ─────────────────────
  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 min-h-0">
      {/* Top bar */}
      <div className="bg-zinc-900 border-b border-zinc-800 grid grid-cols-[1fr_auto_1fr] h-14 overflow-visible relative z-20" role="toolbar" aria-label="Playback Controls">

        {/* ── Far left: Tracks / Mixer toggle ── */}
        <div className="flex items-stretch">
          {availableTracks.length > 1 && (
            <button
              onClick={() => setIsTracksPanelOpen((v) => !v)}
              disabled={!playerReady}
              className={`my-auto ml-3 px-3 h-8 rounded-lg disabled:opacity-40 inline-flex items-center gap-2 shrink-0 transition-colors text-sm ${isTracksPanelOpen ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700'}`}
              title="Track selection and mixer"
              aria-label="Track selection and mixer"
              aria-expanded={isTracksPanelOpen}
            >
              <span className="h-6 w-6 inline-flex items-center justify-center shrink-0 opacity-80">
                <InstrumentIcon label={getTrackLabel(availableTracks.find((t) => t.index === selectedTrackIndex) ?? availableTracks[0])} size={22} />
              </span>
              <span className="text-sm font-medium truncate max-w-32">
                {selectedTrackIndex === null
                  ? `${availableTracks.length} Tracks`
                  : getTrackLabel(availableTracks.find((track) => track.index === selectedTrackIndex) ?? availableTracks[0])}
              </span>
              <ChevronRight
                size={14}
                className={`opacity-60 shrink-0 transition-transform duration-200 ${isTracksPanelOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
          )}
        </div>


        {/* ── Center: Return to start + Play/Pause ── */}
        <div className="flex items-center justify-center" style={{ transform: `translateX(${-sidebarWidth / 2}px)` }}>
          {/* Return to start — outlined, left-rounded, right edge hidden behind play button */}
          <button
            onClick={stop}
            disabled={!playerReady}
            className="h-9 px-3 rounded-l-lg border border-r-0 border-zinc-600 bg-zinc-700 text-zinc-200 hover:bg-zinc-600 disabled:opacity-40 transition-colors shrink-0 translate-x-1"
            title="Return to start (Escape)"
            aria-label="Return to start"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="3" height="14" rx="0.5" fill="currentColor" stroke="none" />
              <path d="M20 5L10 12l10 7V5z" fill="currentColor" stroke="none" />
            </svg>
          </button>

          {/* Play / Pause — overflows toolbar via absolute positioning */}
          <div className="relative w-[4.5rem] flex items-center justify-center shrink-0">
            <button
              onClick={playPause}
              disabled={!playerReady}
              className="absolute top-1/2 -translate-y-1/2 bg-primary hover:brightness-110 disabled:bg-zinc-700 text-primary-foreground w-[4.5rem] h-[4.5rem] rounded-full transition-all flex items-center justify-center z-20 shadow-md"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              aria-pressed={isPlaying}
            >
              {isPlaying ? (
                <svg width="32" height="32" viewBox="0 0 20 20" fill="currentColor">
                  <rect x="4" y="3" width="4" height="14" rx="1" />
                  <rect x="12" y="3" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg width="32" height="32" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 3.5L16 10L5 16.5V3.5Z" />
                </svg>
              )}
            </button>
          </div>

          {/* Spacer matching return-to-start width for centering */}
          <div className="h-9 px-3 shrink-0 invisible" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" />
          </div>

        </div>

        {/* ── Right group: controls ── */}
        <div className="flex items-center justify-end gap-1.5 px-3">
          {/* Tempo */}
          <BpmDisplay
            value={tempo}
            onChange={changeSpeed}
            disabled={!playerReady}

          />

          {/* Separator */}
          <div className="w-px h-6 bg-zinc-700" role="presentation" />

          {/* Loop */}
          <button
            onClick={toggleLoop}
            disabled={!playerReady}
            className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${
              isLooping
                ? 'bg-primary/10 text-primary'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700'
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

          {/* Display settings popover */}
          <DisplaySettings
            staveProfile={staveProfile}
            onChange={setStaveProfile}
            scoreDark={scoreDark}
            onScoreDarkChange={(v) => {
              setScoreDark(v);
              localStorage.setItem(SCORE_DARK_LS_KEY, String(v));
            }}
            disabled={!playerReady}
          />
        </div>
      </div>

      {/* Content row: sliding tracks panel + viewport */}
      <div className="flex flex-1 min-h-0 min-w-0">

        {/* Sliding tracks panel */}
        {availableTracks.length > 1 && (
          <div
            className={`shrink-0 overflow-hidden bg-zinc-900 border-r border-zinc-800 transition-[width] duration-200 ease-in-out relative z-10 ${isTracksPanelOpen ? 'w-72' : 'w-0'}`}
          >
            <div className="w-72 h-full overflow-y-auto">
              <div className="divide-y divide-border">
                {availableTracks.map((track) => {
                  const isSelected = selectedTrackIndex === track.index;
                  const isMutedTrack = mutedTrackIndexes.includes(track.index);
                  const isSoloTrack = soloTrackIndexes.includes(track.index);
                  const volumePercent = Math.round((trackVolumes[track.index] ?? 1) * 100);
                  return (
                    <div
                      key={`track-${track.index}`}
                      className={`flex items-stretch gap-3 px-3 py-3 cursor-pointer select-none transition-colors ${
                        isSelected ? 'bg-primary/10' : 'hover:bg-zinc-800/80'
                      }`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedTrackIndex(track.index)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedTrackIndex(track.index);
                        }
                      }}
                      aria-label={isSelected ? `${getTrackLabel(track)} is active for notation` : `Set ${getTrackLabel(track)} as the active notation track`}
                      aria-pressed={isSelected}
                    >
                      {/* Icon — full height, centered */}
                      <span className={`flex items-center justify-center shrink-0 ${isSelected ? 'text-primary/80' : 'text-zinc-500'}`}>
                        <InstrumentIcon label={getTrackLabel(track)} size={24} />
                      </span>

                      {/* Right column: title top, controls bottom */}
                      <div className="flex flex-col flex-1 min-w-0 gap-2.5">
                        {/* Track name */}
                        <span className={`text-xs font-semibold truncate leading-none ${isSelected ? 'text-zinc-100' : 'text-zinc-400'}`}>
                          {getTrackLabel(track)}
                        </span>

                        {/* Bottom row: volume left, M/S right */}
                        <div className="flex items-center gap-2">
                          {/* Volume slider — 50% width */}
                          <div
                            className="w-1/2 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <Slider
                              min={0}
                              max={150}
                              step={5}
                              value={[volumePercent]}
                              onValueChange={([value]) => setTrackVolume(track.index, value)}
                              aria-label={`Volume for ${getTrackLabel(track)}`}
                              className={`[&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5 [&_[data-slot=slider-track]]:bg-muted-foreground/20 [&_[data-slot=slider-range]]:bg-muted-foreground/40 [&_[data-slot=slider-thumb]]:border-muted-foreground/40 [&_[data-slot=slider-thumb]]:bg-card hover:[&_[data-slot=slider-range]]:bg-primary hover:[&_[data-slot=slider-thumb]]:border-primary ${activeVolumeTrackIndex === track.index ? '[&_[data-slot=slider-range]]:bg-primary [&_[data-slot=slider-thumb]]:border-primary' : ''}`}
                            />
                          </div>

                          {/* Mute/Solo buttons */}
                          <div className="flex gap-0.5 shrink-0 ml-auto" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => toggleTrackMute(track.index)}
                              className={`h-6 w-6 rounded inline-flex items-center justify-center transition-colors ${
                                isMutedTrack ? 'bg-destructive/10 text-destructive' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                              }`}
                              aria-label={isMutedTrack ? `Unmute ${getTrackLabel(track)}` : `Mute ${getTrackLabel(track)}`}
                              aria-pressed={isMutedTrack}
                              title={isMutedTrack ? 'Unmute' : 'Mute'}
                            >
                              <Icon icon="qlementine-icons:speaker-mute-16" width={14} height={14} aria-hidden="true" />
                            </button>
                            <button
                              onClick={() => toggleTrackSolo(track.index)}
                              className={`h-6 w-6 rounded inline-flex items-center justify-center transition-colors ${
                                isSoloTrack ? 'bg-yellow-400 text-yellow-900' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                              }`}
                              aria-label={isSoloTrack ? `Disable solo for ${getTrackLabel(track)}` : `Solo ${getTrackLabel(track)}`}
                              aria-pressed={isSoloTrack}
                              title={isSoloTrack ? 'Disable solo' : 'Solo'}
                            >
                              <Icon icon="qlementine-icons:headphones-16" width={14} height={14} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Right side: viewport + progress bar */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">

        {/* Custom score header — outside scroll area so translateX doesn't affect AlphaTab resize */}
        {scoreInfo && (scoreInfo.title || scoreInfo.artist) && (() => {
          const tuningNotes = selectedTrackIndex !== null
            ? (scoreInfo.tunings.get(selectedTrackIndex) ?? null)
            : null;
          return (
            <div
              className="flex flex-col items-center px-6 pt-6 pb-4 gap-1 shrink-0"
              style={{ transform: `translateX(${-(sidebarWidth + (isTracksPanelOpen ? 288 : 0)) / 2}px)`, transition: 'transform 200ms ease-in-out' }}
            >
              <div className="text-center">
                {scoreInfo.title && (
                  <h2 className="text-lg font-bold text-foreground leading-tight">{scoreInfo.title}</h2>
                )}
                {scoreInfo.artist && (
                  <p className="text-sm text-muted-foreground mt-0.5">{scoreInfo.artist}</p>
                )}
              </div>
              {tuningNotes && (
                <div className="flex items-center gap-1.5">
                  {[...tuningNotes].reverse().map((note, i) => (
                    <span key={i} className="text-[10px] font-mono text-muted-foreground/40 leading-none">
                      {note}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* AlphaTab rendering viewport */}
        <div
          ref={viewportRef}
          className={`flex-1 overflow-y-auto min-w-0 relative isolate scrollbar-autohide transition-colors duration-200 ${scoreDark ? 'bg-zinc-900' : 'bg-white'}`}
        >
        {isLoading && (
          <div className={`absolute inset-0 flex items-center justify-center z-10 ${scoreDark ? 'bg-zinc-900/80' : 'bg-white/80'}`}>
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
          </div>
        )}

        <div className="relative">
          <div ref={containerRef} className={`at-main${scoreDark ? ' at-dark' : ''}`} />
        </div>
      </div>

        {/* Progress bar — pinned at bottom */}
        <div
          className="shrink-0 flex items-stretch border-t border-zinc-700"
          style={{ height: sections.length > 0 ? '2.5rem' : '1.25rem' }}
          role="progressbar"
          aria-label="Playback progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={endTime > 0 ? Math.round((currentTime / endTime) * 100) : 0}
        >
          {/* Timeline area */}
          <div className="flex-1 relative overflow-hidden bg-zinc-900">
            {/* Section bands */}
            {sections.length > 0 && sections.map((section, i) => {
              const duration = Math.max(endTime, scoreDurationMs);
              const startPct = duration > 0 ? (section.startMs / duration) * 100 : 0;
              const nextStartMs = sections[i + 1]?.startMs ?? duration;
              const widthPct = duration > 0 ? ((nextStartMs - section.startMs) / duration) * 100 : 0;
              return (
                <button
                  key={i}
                  className="absolute inset-y-0 flex items-center px-2 overflow-hidden border-r border-zinc-700/60 hover:brightness-110 transition-[filter] cursor-pointer"
                  style={{
                    left: `${startPct}%`,
                    width: `${widthPct}%`,
                    backgroundColor: i % 2 === 0 ? 'hsl(var(--muted) / 0.9)' : 'transparent',
                  }}
                  title={`Go to: ${section.text}`}
                  onClick={() => {
                    const api = apiRef.current;
                    if (!api) return;
                    api.tickPosition = section.startTick;
                    api.scrollToCursor();
                  }}
                >
                  <span className="text-[9px] font-medium text-muted-foreground truncate leading-none select-none pointer-events-none">
                    {section.text}
                  </span>
                </button>
              );
            })}
            {/* Playback fill */}
            <div
              className="absolute inset-y-0 left-0 bg-primary/20 pointer-events-none transition-[width] duration-200"
              style={{ width: endTime > 0 ? `${(currentTime / endTime) * 100}%` : '0%' }}
            />
            {/* Playback cursor */}
            <div
              className="absolute inset-y-0 w-px bg-primary pointer-events-none transition-[left] duration-200"
              style={{ left: endTime > 0 ? `${(currentTime / endTime) * 100}%` : '0%' }}
            />
          </div>
          {/* Timers — reserved right slot */}
          <div className="shrink-0 w-28 flex items-center justify-end px-3 gap-0.5 border-l border-zinc-700/40">
            <span className="text-[10px] font-mono tabular-nums text-foreground" aria-live="off">{fmt(currentTime)}</span>
            <span className="text-[10px] text-muted-foreground/50 mx-0.5">/</span>
            <span className="text-[10px] font-mono tabular-nums text-muted-foreground">{fmt(endTime)}</span>
          </div>
        </div>

        </div>{/* end right side */}

      </div>{/* end content row */}

    </div>
  );
});

export default AlphaTabView;
