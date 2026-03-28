import { useEffect, useRef, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import {
  AlphaTabApi,
  Settings,
  NotationElement,
  StaveProfile as AlphaTabStaveProfile,
  synth,
  midi,
  model,
} from '@coderline/alphatab';
import type { Exercise } from '../data/exercises';
import { extractTimedNotes, buildTempoMap, tickToMs, type TimedNote } from '../audio/noteExtractor';
import { playClick as synthClick } from '../audio/clickSynth';
import MetronomeSettings, { type MetronomeConfig } from './MetronomeSettings';
import DisplaySettings from './DisplaySettings';
import { loadStaveProfile, type StaveProfile } from '@/lib/displaySettings';
import BpmDisplay from './BpmDisplay';
import MicFeedbackDisplay from './MicFeedbackDisplay';
import type { PitchResult } from '../audio/pitchDetector';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Icon } from '@iconify/react';
import InstrumentIcon from './InstrumentIcon';
import type { NoteEvaluation } from '../evaluation/types';
import NoteEvaluationOverlay, { type BeatRect } from './NoteEvaluationOverlay';

export type { TimedNote as NoteEvent };

// ── Note evaluation color constants ─────────────
const EVAL_ON_TIME_MS = 20;
const EVAL_COLOR_HIT    = new model.Color(34, 197, 94);    // emerald-500
const EVAL_COLOR_TIMING = new model.Color(245, 158, 11);   // amber-500
const EVAL_COLOR_MISS   = new model.Color(239, 68, 68);    // red-500

interface SectionMarker {
  text: string;
  startMs: number;
  startTick: number;
}

interface LoopHighlightRect {
  barIndex: number;
  startTick: number;
  endTick: number;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Full staff-row y/h including both stave + tab stave */
  rowY: number;
  rowH: number;
}

interface LoopBeatRange {
  beat: InstanceType<typeof model.Beat>;
  startTick: number;
  endTick: number;
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

  const refreshLoopBars = useCallback(() => {
    const api = apiRef.current;
    const score = api?.score;
    const renderedTracks = api?.tracks.length ? api.tracks : score?.tracks ?? [];

    if (!score || renderedTracks.length === 0 || renderedTracks[0].staves.length === 0) {
      setLoopSelectableBeats([]);
      loopBeatIndexMapRef.current = new Map();
      return;
    }

    const firstStaff = renderedTracks[0].staves[0];
    if (firstStaff.bars.length === 0) {
      setLoopSelectableBeats([]);
      loopBeatIndexMapRef.current = new Map();
      return;
    }

    let maxTick = 0;
    for (const track of renderedTracks) {
      for (const staff of track.staves) {
        for (const bar of staff.bars) {
          for (const voice of bar.voices) {
            for (const beat of voice.beats) {
              maxTick = Math.max(maxTick, beat.absolutePlaybackStart + beat.playbackDuration);
            }
          }
        }
      }
    }

    const beats: LoopBeatRange[] = [];
    const beatIndexMap = new Map<InstanceType<typeof model.Beat>, number>();
    for (const staff of renderedTracks[0].staves) {
      for (const bar of staff.bars) {
        for (const voice of bar.voices) {
          for (const beat of voice.beats) {
            const startTick = beat.absolutePlaybackStart;
            const endTick = startTick + beat.playbackDuration;
            if (endTick <= startTick) {
              continue;
            }

            const beatIndex = beats.length;
            beatIndexMap.set(beat, beatIndex);
            beats.push({ beat, startTick, endTick });
          }
        }
      }
    }

    setLoopSelectableBeats(beats);
    loopBeatIndexMapRef.current = beatIndexMap;
  }, []);

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
  const [isMuted, setIsMuted] = useState(false);
  const [staveProfile, setStaveProfile] = useState<StaveProfile>(() => loadStaveProfile());
  const [beatBoundsMap, setBeatBoundsMap] = useState<Map<number, BeatRect>>(new Map());
  const [sections, setSections] = useState<SectionMarker[]>([]);

  const [loopSelectableBeats, setLoopSelectableBeats] = useState<LoopBeatRange[]>([]);
  const [isLooping, setIsLooping] = useState(false);
  const [hasLoopSelection, setHasLoopSelection] = useState(false);
  const [isLoopDragging, setIsLoopDragging] = useState(false);
  const [loopDragStartBeatIndex, setLoopDragStartBeatIndex] = useState<number | null>(null);
  const [loopSelectionStartTick, setLoopSelectionStartTick] = useState<number | null>(null);
  const [loopSelectionEndTick, setLoopSelectionEndTick] = useState<number | null>(null);
  const [loopHighlightRects, setLoopHighlightRects] = useState<LoopHighlightRect[]>([]);
  const [availableTracks, setAvailableTracks] = useState<AlphaTabTrack[]>([]);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState<number | null>(null);
  const [mutedTrackIndexes, setMutedTrackIndexes] = useState<number[]>([]);
  const [soloTrackIndexes, setSoloTrackIndexes] = useState<number[]>([]);
  const [trackVolumes, setTrackVolumes] = useState<Record<number, number>>({});
  const [activeVolumeTrackIndex, setActiveVolumeTrackIndex] = useState<number | null>(null);
  const [isTracksPanelOpen, setIsTracksPanelOpen] = useState(false);
  const [scoreInfo, setScoreInfo] = useState<{ title: string; artist: string; tunings: Map<number, string[]> } | null>(null);

  const activeVolumeTimeoutRef = useRef<number | null>(null);
  const loopBeatIndexMapRef = useRef<Map<InstanceType<typeof model.Beat>, number>>(new Map());
  /** Map beatIndex → actual AlphaTab Beat object (for native note coloring). */
  const beatObjectMapRef = useRef<Map<number, InstanceType<typeof model.Beat>>>(new Map());
  /** Track which beatIndices already have styles applied (avoid redundant work). */
  const styledBeatsRef = useRef<Set<number>>(new Set());

  // Initialise AlphaTab
  useEffect(() => {
    if (!containerRef.current) return;

    setIsPlaying(false);
    setIsLoading(true);
    setPlayerReady(false);
    setCurrentTime(0);
    setEndTime(0);
    setScoreDurationMs(0);
    setAvailableTracks([]);
    setSelectedTrackIndex(null);
    setMutedTrackIndexes([]);
    setSoloTrackIndexes([]);
    setTrackVolumes({});
    setLoopSelectableBeats([]);
    setSections([]);
    setHasLoopSelection(false);
    setIsLoopDragging(false);
    setLoopDragStartBeatIndex(null);
    setLoopSelectionStartTick(null);
    setLoopSelectionEndTick(null);
    setLoopHighlightRects([]);

    const api = new AlphaTabApi(containerRef.current, {
      core: {
        fontDirectory: import.meta.env.BASE_URL + 'font/',
        tex: true,
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
        outputMode: 1, // WebAudioScriptProcessor — bypass AudioWorklet (Vite 8 compat)
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
      setIsLoading(false);
      viewportRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
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
      refreshLoopBars();
    });

    api.playerReady.on(() => {
      setPlayerReady(true);
      refreshLoopBars();
      onReady?.();
      // For GP files, read the actual tempo from the score instead of the placeholder.
      if (exercise.filePath && api.score) {
        baseTempo.current = api.score.tempo;
        setTempo(api.score.tempo);
      }

      // Extract note timing data once MIDI is loaded
      if (onNoteDataExtracted) {
        const timedNotes = extractTimedNotes(api);
        onNoteDataExtracted(timedNotes);
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
    if (loopSelectableBeats.length === 0) {
      setLoopDragStartBeatIndex(null);
      setIsLoopDragging(false);
      return;
    }

    if (loopDragStartBeatIndex !== null && loopDragStartBeatIndex >= loopSelectableBeats.length) {
      setLoopDragStartBeatIndex(null);
      setIsLoopDragging(false);
    }
  }, [loopDragStartBeatIndex, loopSelectableBeats]);

  const refreshLoopHighlights = useCallback(() => {
    const api = apiRef.current;
    const lookup = api?.renderer.boundsLookup;

    if (!lookup || loopSelectableBeats.length === 0) {
      setLoopHighlightRects([]);
      return;
    }

    // Build full-height row bounds from bar lineAlignedBounds (covers notation + tab stave)
    const staffRowBounds: { y: number; h: number }[] = [];
    for (const staffSystem of lookup.staffSystems) {
      if (staffSystem.bars.length > 0) {
        const b = staffSystem.bars[0].lineAlignedBounds
          ?? staffSystem.bars[0].realBounds
          ?? staffSystem.bars[0].visualBounds;
        staffRowBounds.push({ y: b.y, h: b.h });
      }
    }

    const rects: LoopHighlightRect[] = [];

    for (const beatRange of loopSelectableBeats) {
      const beatBounds = lookup.findBeat(beatRange.beat);
      if (!beatBounds) {
        continue;
      }

      const vb = beatBounds.visualBounds;
      const beatCenterY = vb.y + vb.h / 2;
      const row = staffRowBounds.find((r) => beatCenterY >= r.y && beatCenterY <= r.y + r.h)
        ?? { y: vb.y, h: vb.h };

      rects.push({
        barIndex: 0,
        startTick: beatRange.startTick,
        endTick: beatRange.endTick,
        x: vb.x,
        y: vb.y,
        w: vb.w,
        h: vb.h,
        rowY: row.y,
        rowH: row.h,
      });
    }

    setLoopHighlightRects(rects);
  }, [loopSelectableBeats]);

  useEffect(() => {
    refreshLoopHighlights();
  }, [refreshLoopHighlights]);

  const setLoopRangeFromBeatIndexes = useCallback((startIndex: number, endIndex: number) => {
    const clampedStart = Math.max(0, Math.min(startIndex, loopSelectableBeats.length - 1));
    const clampedEnd = Math.max(0, Math.min(endIndex, loopSelectableBeats.length - 1));
    const fromIndex = Math.min(clampedStart, clampedEnd);
    const toIndex = Math.max(clampedStart, clampedEnd);

    const startTick = loopSelectableBeats[fromIndex]?.startTick ?? null;
    const endTick = loopSelectableBeats[toIndex]?.endTick ?? null;
    if (startTick === null || endTick === null) {
      return;
    }

    setLoopSelectionStartTick(startTick);
    setLoopSelectionEndTick(endTick);
    setHasLoopSelection(true);
  }, [loopSelectableBeats]);

  const applyLoopRangeForBeatIndexes = useCallback((startIndex: number, endIndex: number) => {
    const api = apiRef.current;
    if (!api || loopSelectableBeats.length === 0) return;

    const clampedStart = Math.max(0, Math.min(startIndex, loopSelectableBeats.length - 1));
    const clampedEnd = Math.max(0, Math.min(endIndex, loopSelectableBeats.length - 1));
    const fromIndex = Math.min(clampedStart, clampedEnd);
    const toIndex = Math.max(clampedStart, clampedEnd);

    const startTick = loopSelectableBeats[fromIndex]?.startTick;
    const endTick = loopSelectableBeats[toIndex]?.endTick;
    if (startTick === undefined || endTick === undefined || endTick <= startTick) {
      return;
    }

    api.playbackRange = { startTick, endTick };
    api.isLooping = true;
    setIsLooping(true);
    setLoopSelectionStartTick(startTick);
    setLoopSelectionEndTick(endTick);
    setHasLoopSelection(true);
  }, [loopSelectableBeats]);

  const getBeatIndexFromPointerPosition = useCallback((clientX: number, clientY: number): number | null => {
    const api = apiRef.current;
    const lookup = api?.renderer.boundsLookup;
    const scoreElement = containerRef.current;

    if (!lookup || !scoreElement || loopSelectableBeats.length === 0) {
      return null;
    }

    const rect = scoreElement.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const beat = lookup.getBeatAtPos(x, y) as InstanceType<typeof model.Beat> | null;

    if (!beat) {
      return null;
    }

    const mappedIndex = loopBeatIndexMapRef.current.get(beat);
    if (mappedIndex === undefined) {
      return null;
    }

    return mappedIndex;
  }, [loopSelectableBeats]);

  const handleLoopSelectionPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isLooping || event.button !== 0) {
      return;
    }

    const clickedBeatIndex = getBeatIndexFromPointerPosition(event.clientX, event.clientY);
    if (clickedBeatIndex === null) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    setIsLoopDragging(true);
    setLoopDragStartBeatIndex(clickedBeatIndex);
    setLoopRangeFromBeatIndexes(clickedBeatIndex, clickedBeatIndex);
  }, [getBeatIndexFromPointerPosition, isLooping, setLoopRangeFromBeatIndexes]);

  const handleLoopSelectionPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isLooping || !isLoopDragging || loopDragStartBeatIndex === null) {
      return;
    }

    const hoveredBeatIndex = getBeatIndexFromPointerPosition(event.clientX, event.clientY);
    if (hoveredBeatIndex === null) {
      return;
    }

    setLoopRangeFromBeatIndexes(loopDragStartBeatIndex, hoveredBeatIndex);
  }, [getBeatIndexFromPointerPosition, isLoopDragging, isLooping, loopDragStartBeatIndex, setLoopRangeFromBeatIndexes]);

  const handleLoopSelectionPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isLooping || !isLoopDragging || loopDragStartBeatIndex === null) {
      return;
    }

    const releasedBeatIndex = getBeatIndexFromPointerPosition(event.clientX, event.clientY) ?? loopDragStartBeatIndex;

    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setIsLoopDragging(false);
    setLoopDragStartBeatIndex(null);
    applyLoopRangeForBeatIndexes(loopDragStartBeatIndex, releasedBeatIndex);
  }, [applyLoopRangeForBeatIndexes, getBeatIndexFromPointerPosition, isLoopDragging, isLooping, loopDragStartBeatIndex]);

  const handleLoopSelectionPointerCancel = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isLoopDragging) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setIsLoopDragging(false);
    setLoopDragStartBeatIndex(null);
  }, [isLoopDragging]);

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

  const toggleMute = useCallback(() => {
    if (!apiRef.current) return;
    const next = !isMuted;
    apiRef.current.masterVolume = next ? 0 : 1;
    setIsMuted(next);
  }, [isMuted]);

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
      apiRef.current.countInVolume = cfg.enabled && cfg.countInBars > 0 ? 1 : 0;
    }
  }, [metronomeConfig, useCustomClicks]);

  // ── Custom click sound & accent via Web Audio ──────────
  const metronomeConfigRef = useRef(metronomeConfig);
  metronomeConfigRef.current = metronomeConfig;

  // Build a simple click using the shared synthesiser
  const playClick = useCallback((accent: boolean) => {
    const cfg = metronomeConfigRef.current;
    if (!cfg.enabled) return;
    synthClick(cfg.clickSound, accent && cfg.accentFirstBeat, cfg.volume ?? 1);
  }, []);

// Subscribe to AlphaTab metronome MIDI events for custom click
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;

    const handleEvents = (e: { events: unknown[] }) => {
      for (const evt of e.events) {
        const me = evt as { isMetronome?: boolean; metronomeNumerator?: number };
        if (me.isMetronome) {
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
  }, [playClick]);

  // Looping
  const toggleLoop = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;

    if (isLooping) {
      api.isLooping = false;
      api.playbackRange = null;
      setIsLooping(false);
      setIsLoopDragging(false);
      setLoopDragStartBeatIndex(null);
      return;
    }

    setIsLoopDragging(false);
    setLoopDragStartBeatIndex(null);

    if (hasLoopSelection && loopSelectionStartTick !== null && loopSelectionEndTick !== null && loopSelectionEndTick > loopSelectionStartTick) {
      api.playbackRange = { startTick: loopSelectionStartTick, endTick: loopSelectionEndTick };
      api.isLooping = true;
      setIsLooping(true);
      return;
    }

    if (loopSelectableBeats.length === 0) {
      return;
    }

    setLoopRangeFromBeatIndexes(0, 0);
    applyLoopRangeForBeatIndexes(0, 0);
  }, [applyLoopRangeForBeatIndexes, hasLoopSelection, isLooping, loopSelectableBeats.length, loopSelectionEndTick, loopSelectionStartTick, setLoopRangeFromBeatIndexes]);

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

  // Merge selected beat rects into one rectangle per staff row
  const loopSelectionMergedRects = (() => {
    if (!isLooping || !hasLoopSelection || loopSelectionStartTick === null || loopSelectionEndTick === null) {
      return [];
    }

    const byRow = new Map<number, { minX: number; maxX: number; rowY: number; rowH: number }>();

    for (const rect of loopHighlightRects) {
      if (rect.endTick <= loopSelectionStartTick || rect.startTick >= loopSelectionEndTick) {
        continue;
      }

      const existing = byRow.get(rect.rowY);
      if (existing) {
        existing.minX = Math.min(existing.minX, rect.x);
        existing.maxX = Math.max(existing.maxX, rect.x + rect.w);
      } else {
        byRow.set(rect.rowY, { minX: rect.x, maxX: rect.x + rect.w, rowY: rect.rowY, rowH: rect.rowH });
      }
    }

    return Array.from(byRow.values());
  })();

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
    <div className="flex flex-col h-full bg-card min-h-0">
      {/* Top bar */}
      <div className="border-b border-border grid grid-cols-[1fr_auto_1fr] h-14 overflow-visible relative z-20" role="toolbar" aria-label="Playback Controls">

        {/* ── Far left: Tracks / Mixer toggle ── */}
        <div className="flex items-stretch">
          {availableTracks.length > 1 && (
            <button
              onClick={() => setIsTracksPanelOpen((v) => !v)}
              disabled={!playerReady}
              className="h-full px-4 bg-secondary hover:bg-secondary/80 text-secondary-foreground border-r border-border disabled:opacity-40 inline-flex items-center gap-2 shrink-0 transition-colors"
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
        <div className="flex items-center justify-center">
          {/* Return to start — outlined, left-rounded, right edge hidden behind play button */}
          <button
            onClick={stop}
            disabled={!playerReady}
            className="h-9 px-3 rounded-l-lg border border-r-0 border-border bg-secondary text-secondary-foreground hover:bg-secondary/70 disabled:opacity-40 transition-colors shrink-0 translate-x-1"
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
              className="absolute top-1/2 -translate-y-1/2 bg-primary hover:bg-primary/80 disabled:bg-muted text-primary-foreground w-[4.5rem] h-[4.5rem] rounded-full transition-all flex items-center justify-center z-20 shadow-md"
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

          {/* Mic / Speaker section */}
          {onToggleMic && (
            <>
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
                      <div className="pt-2">
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
            className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${
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

          {/* Display settings popover */}
          <DisplaySettings
            staveProfile={staveProfile}
            onChange={setStaveProfile}
            disabled={!playerReady}
          />
        </div>
      </div>

      {/* Content row: sliding tracks panel + viewport */}
      <div className="flex flex-1 min-h-0">

        {/* Sliding tracks panel */}
        {availableTracks.length > 1 && (
          <div
            className={`shrink-0 overflow-hidden border-r border-border bg-secondary transition-[width] duration-200 ease-in-out relative z-10 ${isTracksPanelOpen ? 'w-72' : 'w-0'}`}
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
                        isSelected ? 'bg-primary/10' : 'hover:bg-muted/60'
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
                      <span className={`flex items-center justify-center shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                        <InstrumentIcon label={getTrackLabel(track)} size={24} />
                      </span>

                      {/* Right column: title top, controls bottom */}
                      <div className="flex flex-col flex-1 min-w-0 gap-2.5">
                        {/* Track name */}
                        <span className={`text-xs font-semibold truncate leading-none ${isSelected ? 'text-primary' : 'text-foreground'}`}>
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
                                isMutedTrack ? 'bg-destructive/10 text-destructive' : 'bg-white text-muted-foreground hover:text-foreground'
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
                                isSoloTrack ? 'bg-yellow-400 text-yellow-900' : 'bg-white text-muted-foreground hover:text-foreground'
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
        <div className="flex-1 flex flex-col min-h-0">

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

        {/* Custom score header: tuning left, title+artist centered */}
        {scoreInfo && (scoreInfo.title || scoreInfo.artist) && (() => {
          const tuningNotes = selectedTrackIndex !== null
            ? (scoreInfo.tunings.get(selectedTrackIndex) ?? null)
            : null;
          return (
            <div className="flex flex-col items-center px-6 pt-6 pb-4 gap-1">
              {/* Title + artist */}
              <div className="text-center">
                {scoreInfo.title && (
                  <h2 className="text-lg font-bold text-foreground leading-tight">{scoreInfo.title}</h2>
                )}
                {scoreInfo.artist && (
                  <p className="text-sm text-muted-foreground mt-0.5">{scoreInfo.artist}</p>
                )}
              </div>
              {/* Tuning row — strings left (high) to right (low) */}
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

        <div
          className={`relative ${isLooping ? 'cursor-ew-resize' : ''}`}
          onPointerDown={handleLoopSelectionPointerDown}
          onPointerMove={handleLoopSelectionPointerMove}
          onPointerUp={handleLoopSelectionPointerUp}
          onPointerCancel={handleLoopSelectionPointerCancel}
        >
          <div ref={containerRef} className="at-main" />
          {isLooping && loopSelectionMergedRects.length > 0 && (
            <div className="absolute inset-0 pointer-events-none z-[2]">
              {loopSelectionMergedRects.map((r, i) => (
                <div
                  key={`loop-sel-${i}`}
                  className="absolute rounded ring-2 ring-primary/80 bg-primary/10"
                  style={{ left: r.minX, top: r.rowY, width: r.maxX - r.minX, height: r.rowH }}
                />
              ))}
            </div>
          )}
          {noteEvaluations.length > 0 && beatBoundsMap.size > 0 && (
            <NoteEvaluationOverlay
              evaluations={noteEvaluations}
              beatBoundsMap={beatBoundsMap}
            />
          )}
        </div>
      </div>

        {/* Progress bar — pinned at bottom */}
        <div
          className="shrink-0 flex items-stretch border-t border-border"
          style={{ height: sections.length > 0 ? '2.5rem' : '1.25rem' }}
          role="progressbar"
          aria-label="Playback progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={endTime > 0 ? Math.round((currentTime / endTime) * 100) : 0}
        >
          {/* Timeline area */}
          <div className="flex-1 relative overflow-hidden bg-muted/60">
            {/* Section bands */}
            {sections.length > 0 && sections.map((section, i) => {
              const duration = Math.max(endTime, scoreDurationMs);
              const startPct = duration > 0 ? (section.startMs / duration) * 100 : 0;
              const nextStartMs = sections[i + 1]?.startMs ?? duration;
              const widthPct = duration > 0 ? ((nextStartMs - section.startMs) / duration) * 100 : 0;
              return (
                <button
                  key={i}
                  className="absolute inset-y-0 flex items-center px-2 overflow-hidden border-r border-border/60 hover:brightness-110 transition-[filter] cursor-pointer"
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
          <div className="shrink-0 w-28 flex items-center justify-end px-3 gap-0.5 border-l border-border/40">
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
