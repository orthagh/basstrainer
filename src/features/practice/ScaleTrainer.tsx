import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { ArrowLeft, ChevronRight, Play, X } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select';
import Fretboard from '../../components/Fretboard';
import type { FretHighlight } from '../../components/Fretboard';
import {
  STANDARD_BASS_4,
  midiToNoteInfo,
  buildScalePositions,
  SCALES,
  NOTE_NAMES_EN,
  NOTE_NAMES_FR,
  shuffle,
} from '../../lib/musicTheory';
import type { ScalePosition } from '../../lib/musicTheory';
import { usePracticeProgress } from './usePracticeProgress';
import { useAudioInput } from '../../hooks/useAudioInput';

interface ScaleLevel {
  label: string;
  sublabel: string;
  scaleKeys: string[];
  direction: 'up' | 'both';
  positions: { minFret: number; maxFret: number; label: string }[];
}

const SCALE_LEVELS: Record<number, ScaleLevel> = {
  1: {
    label: 'Major Scale',
    sublabel: 'Open position · Ascending',
    scaleKeys: ['major'],
    direction: 'up',
    positions: [{ minFret: 0, maxFret: 4, label: 'Open (0–4)' }],
  },
  2: {
    label: 'Natural Minor',
    sublabel: 'Open position · Ascending',
    scaleKeys: ['naturalMinor'],
    direction: 'up',
    positions: [{ minFret: 0, maxFret: 4, label: 'Open (0–4)' }],
  },
  3: {
    label: 'Minor Pentatonic',
    sublabel: 'Open & 5th position · Ascending',
    scaleKeys: ['minorPentatonic'],
    direction: 'up',
    positions: [
      { minFret: 0, maxFret: 4, label: 'Open (0–4)' },
      { minFret: 5, maxFret: 9, label: '5th pos (5–9)' },
    ],
  },
  4: {
    label: 'Penta + Blues',
    sublabel: 'Open & 5th position · Ascending',
    scaleKeys: ['majorPentatonic', 'blues'],
    direction: 'up',
    positions: [
      { minFret: 0, maxFret: 4, label: 'Open (0–4)' },
      { minFret: 5, maxFret: 9, label: '5th pos (5–9)' },
    ],
  },
  5: {
    label: 'Up + Down',
    sublabel: 'All scales · Ascending & descending',
    scaleKeys: ['major', 'naturalMinor', 'minorPentatonic', 'majorPentatonic', 'blues'],
    direction: 'both',
    positions: [
      { minFret: 0, maxFret: 4, label: 'Open (0–4)' },
      { minFret: 5, maxFret: 9, label: '5th pos (5–9)' },
    ],
  },
  6: {
    label: 'Full Neck',
    sublabel: 'All scales · Random position',
    scaleKeys: ['major', 'naturalMinor', 'minorPentatonic', 'majorPentatonic', 'blues'],
    direction: 'both',
    positions: [
      { minFret: 0, maxFret: 4, label: 'Open (0–4)' },
      { minFret: 5, maxFret: 9, label: '5th pos (5–9)' },
      { minFret: 7, maxFret: 11, label: '7th pos (7–11)' },
      { minFret: 12, maxFret: 16, label: '12th pos (12–16)' },
    ],
  },
};

// Root note pitch classes (C=0 to B=11)
const ROOT_PITCH_CLASSES = Array.from({ length: 12 }, (_, i) => i);

function LevelPicker({
  levels,
  selected,
  onSelect,
}: {
  levels: { num: number; label: string; sublabel: string; locked: boolean }[];
  selected: number;
  onSelect: (n: number) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pill, setPill] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const idx = levels.findIndex(l => l.num === selected);
    const el = refs.current[idx];
    if (el) setPill({ left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight });
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative flex flex-wrap gap-1 p-1 rounded-lg border border-zinc-800 bg-zinc-900">
      {pill && (
        <div
          className="absolute rounded-md bg-zinc-800/70 border border-zinc-700 pointer-events-none"
          style={{
            left: pill.left,
            top: pill.top,
            width: pill.width,
            height: pill.height,
            transition: 'left 180ms cubic-bezier(0.4,0,0.2,1), top 180ms cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      )}
      {levels.map(({ num, label, sublabel, locked }, i) => (
        <button
          key={num}
          ref={el => { refs.current[i] = el; }}
          onClick={locked ? undefined : () => onSelect(num)}
          disabled={locked}
          className={[
            'relative px-3.5 py-3 rounded-md font-mono transition-colors whitespace-nowrap flex flex-col items-start gap-1',
            locked
              ? 'opacity-30 cursor-not-allowed text-zinc-600'
              : selected === num
                ? 'text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-200',
          ].join(' ')}
        >
          <span className="text-[13px] tracking-[0.10em]">L{num} · {label}</span>
          <span className={`text-xs tracking-[0.05em] ${selected === num ? 'text-zinc-500' : 'text-zinc-700'}`}>
            {sublabel}
          </span>
        </button>
      ))}
    </div>
  );
}

const SESSION_COUNTS = [5, 10, 20];
const STABLE_FRAMES = 4;

type Screen = 'setup' | 'playing' | 'result';
type Direction = 'up' | 'down';

interface ScaleRun {
  scaleKey: string;
  rootMidi: number;
  positionLabel: string;
  notes: ScalePosition[];
}

interface RunResult {
  totalNotes: number;
  correctNotes: number;
}

interface Props {
  onBack: () => void;
}

function buildScaleRun(level: ScaleLevel, rootPitchClass: number): ScaleRun | null {
  const scaleKey = level.scaleKeys[Math.floor(Math.random() * level.scaleKeys.length)];
  const posConfig = level.positions[Math.floor(Math.random() * level.positions.length)];
  const scale = SCALES[scaleKey];

  // Find a root MIDI in the right fret range on any string
  let rootMidi: number | null = null;
  for (const s of [0, 1, 2, 3]) {
    for (let f = posConfig.minFret; f <= posConfig.maxFret; f++) {
      const midi = STANDARD_BASS_4[s] + f;
      if (((midi % 12) + 12) % 12 === rootPitchClass) {
        rootMidi = midi;
        break;
      }
    }
    if (rootMidi !== null) break;
  }
  if (rootMidi === null) return null;

  const notes = buildScalePositions(rootMidi, scale.intervals, STANDARD_BASS_4, posConfig.minFret, posConfig.maxFret + 4);
  if (notes.length < 3) return null;

  return { scaleKey, rootMidi, positionLabel: posConfig.label, notes };
}

export default function ScaleTrainer({ onBack }: Props) {
  const { progress, updateAfterSession } = usePracticeProgress();
  const [screen, setScreen] = useState<Screen>('setup');
  const [selectedLevel, setSelectedLevel] = useState<number>(() => {
    const levels = progress.scales.levels;
    for (let l = 6; l >= 1; l--) if (levels[l]?.unlocked) return l;
    return 1;
  });
  const [sessionCount, setSessionCount] = useState(10);
  const [selectedRoot, setSelectedRoot] = useState(0); // C

  // Playing state
  const [runs, setRuns] = useState<ScaleRun[]>([]);
  const [runResults, setRunResults] = useState<RunResult[]>([]);
  const [runIdx, setRunIdx] = useState(0);
  const [noteIdx, setNoteIdx] = useState(0);
  const [direction, setDirection] = useState<Direction>('up');
  const [wrongFlash, setWrongFlash] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  const audio = useAudioInput();
  const prevMidiRef = useRef<number | null>(null);
  const stableFramesRef = useRef(0);
  const advancingRef = useRef(false);
  useLayoutEffect(() => { advancingRef.current = advancing; }, [advancing]);

  const level = SCALE_LEVELS[selectedLevel];
  const currentRun = runs[runIdx] ?? null;

  // Build the ordered note sequence for current direction (deduplicated by MIDI)
  const orderedNotes: ScalePosition[] = (() => {
    if (!currentRun) return [];
    const seenMidi = new Set<number>();
    const unique = currentRun.notes
      .sort((a, b) => a.midi - b.midi)
      .filter(n => { if (seenMidi.has(n.midi)) return false; seenMidi.add(n.midi); return true; });
    if (direction === 'down') return [...unique].reverse();
    return unique;
  })();

  const currentTargetMidi = orderedNotes[noteIdx]?.midi ?? null;
  const wrongFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearWrongFlash = useCallback(() => {
    if (wrongFlashTimeoutRef.current) clearTimeout(wrongFlashTimeoutRef.current);
  }, []);

  const advanceNote = useCallback((correctNotesSoFar: number, totalNotesSoFar: number) => {
    if (advancingRef.current) return;

    const nextNoteIdx = noteIdx + 1;
    const isEndOfAscending = direction === 'up' && nextNoteIdx >= orderedNotes.length;
    const isEndOfDescending = direction === 'down' && nextNoteIdx >= orderedNotes.length;

    if (isEndOfAscending && level.direction === 'both') {
      // Switch to descending
      prevMidiRef.current = null;
      stableFramesRef.current = 0;
      setNoteIdx(0);
      setDirection('down');
      return;
    }

    if (nextNoteIdx >= orderedNotes.length || (isEndOfDescending)) {
      // Run complete
      setRunResults(prev => [...prev, { totalNotes: totalNotesSoFar, correctNotes: correctNotesSoFar }]);
      setAdvancing(true);
      advancingRef.current = true;
      setTimeout(() => {
        setNoteIdx(0);
        setDirection('up');
        setRunIdx(i => i + 1);
        prevMidiRef.current = null;
        stableFramesRef.current = 0;
        setAdvancing(false);
        advancingRef.current = false;
      }, 500);
    } else {
      prevMidiRef.current = null;
      stableFramesRef.current = 0;
      setNoteIdx(nextNoteIdx);
    }
  }, [noteIdx, direction, orderedNotes.length, level.direction]);

  const correctNotesRef = useRef(0);
  const totalNotesRef = useRef(0);

  // Reset per-run counters when run changes
  useEffect(() => {
    correctNotesRef.current = 0;
    totalNotesRef.current = 0;
  }, [runIdx]);

  // End session when all runs done
  useEffect(() => {
    if (screen === 'playing' && runIdx >= runs.length && runs.length > 0) {
      setScreen('result');
    }
  }, [screen, runIdx, runs.length]);

  // Note detection
  useEffect(() => {
    if (screen !== 'playing' || advancing || !currentRun || currentTargetMidi === null) return;
    const { midi } = audio.currentPitch;
    if (midi === null) {
      prevMidiRef.current = null;
      stableFramesRef.current = 0;
      return;
    }
    if (midi === prevMidiRef.current) {
      stableFramesRef.current++;
      if (stableFramesRef.current === STABLE_FRAMES) {
        totalNotesRef.current += 1;
        if (midi === currentTargetMidi) {
          correctNotesRef.current += 1;
          advanceNote(correctNotesRef.current, totalNotesRef.current);
        } else {
          // Wrong note — flash and stay on current note
          clearWrongFlash();
          setWrongFlash(true);
          wrongFlashTimeoutRef.current = setTimeout(() => setWrongFlash(false), 400);
          prevMidiRef.current = null;
          stableFramesRef.current = 0;
        }
      }
    } else {
      prevMidiRef.current = midi;
      stableFramesRef.current = 1;
    }
  }, [audio.currentPitch, screen, advancing, currentRun, currentTargetMidi, advanceNote, clearWrongFlash]);

  function startSession() {
    sessionReportedRef.current = false;
    const builtRuns: ScaleRun[] = [];
    let attempts = 0;
    while (builtRuns.length < sessionCount && attempts < sessionCount * 10) {
      const run = buildScaleRun(level, selectedRoot);
      if (run) builtRuns.push(run);
      attempts++;
    }
    setRuns(shuffle(builtRuns));
    setRunResults([]);
    setRunIdx(0);
    setNoteIdx(0);
    setDirection('up');
    setWrongFlash(false);
    setAdvancing(false);
    advancingRef.current = false;
    setScreen('playing');
    audio.start();
  }

  // Result stats
  const totalNotes = runResults.reduce((s, r) => s + r.totalNotes, 0);
  const totalCorrect = runResults.reduce((s, r) => s + r.correctNotes, 0);
  const accuracy = totalNotes > 0 ? Math.round((totalCorrect / totalNotes) * 100) : 0;

  const sessionReportedRef = useRef(false);
  useEffect(() => {
    if (screen === 'result' && runResults.length > 0 && !sessionReportedRef.current) {
      sessionReportedRef.current = true;
      updateAfterSession('scales', selectedLevel, accuracy);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, runResults.length]);

  // Highlights
  const highlights: FretHighlight[] = [];
  if (screen === 'playing' && currentRun) {
    for (let i = 0; i < orderedNotes.length; i++) {
      const note = orderedNotes[i];
      let state: FretHighlight['state'];
      if (i < noteIdx) {
        state = 'scale-active';
      } else if (i === noteIdx) {
        state = wrongFlash ? 'wrong' : 'target';
      } else {
        state = 'scale';
      }
      highlights.push({ string: note.string, fret: note.fret, state });
    }
  }

  // ── Setup ─────────────────────────────────────────────────────────────────
  if (screen === 'setup') {
    return (
      <div className="flex-1 flex flex-col p-6 bg-zinc-900 overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto">
          <button onClick={onBack} className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 text-sm mb-10 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <h2 className="text-3xl font-medium tracking-tight text-zinc-100 mb-3">
            Play the <em className="text-primary font-normal italic">scale</em>.
          </h2>
          <p className="text-sm text-zinc-500 mb-12">
            All scale dots are shown — navigate them in order without mistakes.
          </p>

          <h3 className="text-xs font-mono tracking-widest text-zinc-500 uppercase mb-4">Select Level</h3>
          <div className="mb-12">
            <LevelPicker
              levels={Object.entries(SCALE_LEVELS).map(([num, lvl]) => ({
                num: parseInt(num),
                label: lvl.label,
                sublabel: lvl.sublabel,
                locked: !(progress.scales.levels[parseInt(num)]?.unlocked ?? false),
              }))}
              selected={selectedLevel}
              onSelect={setSelectedLevel}
            />
          </div>

          <div className="flex gap-8 mb-14">
            <div>
              <h3 className="text-xs font-mono tracking-widest text-zinc-500 uppercase mb-4">Session length</h3>
              <Select value={String(sessionCount)} onValueChange={v => setSessionCount(Number(v))}>
                <SelectTrigger className="w-40 h-9 bg-zinc-800 border-zinc-700 text-zinc-200 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-200 text-sm">
                  {SESSION_COUNTS.map(c => (
                    <SelectItem key={c} value={String(c)}>{c} scales</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <h3 className="text-xs font-mono tracking-widest text-zinc-500 uppercase mb-4">Root note</h3>
              <Select value={String(selectedRoot)} onValueChange={v => setSelectedRoot(Number(v))}>
                <SelectTrigger className="w-40 h-9 bg-zinc-800 border-zinc-700 text-zinc-200 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-200 text-sm">
                  {ROOT_PITCH_CLASSES.map(pc => (
                    <SelectItem key={pc} value={String(pc)}>
                      {NOTE_NAMES_EN[pc]} · {NOTE_NAMES_FR[pc]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <button onClick={startSession}
            className="w-full py-4 rounded-xl bg-primary text-zinc-900 font-bold tracking-wide text-base flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
            <Play size={16} fill="currentColor" /> Start session
          </button>
        </div>
      </div>
    );
  }

  // ── Playing ───────────────────────────────────────────────────────────────
  if (screen === 'playing' && currentRun) {
    const scale = SCALES[currentRun.scaleKey];
    const rootInfo = midiToNoteInfo(currentRun.rootMidi);
    const runProgressPct = runIdx / sessionCount;

    return (
      <div className="flex-1 flex flex-col bg-zinc-900 overflow-y-auto">

        {/* Top bar + progress — constrained */}
        <div className="w-full max-w-3xl mx-auto px-6 pt-8 space-y-4">
          <div>
            <button
              onClick={() => setScreen('result')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 font-mono tracking-wide text-xs transition-all"
            >
              <X size={12} /> End session
            </button>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-zinc-500">L{selectedLevel} · {level.label}</span>
            <span className="text-zinc-300 font-semibold">{runIdx} / {sessionCount}</span>
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${runProgressPct * 100}%` }} />
          </div>
        </div>

        {/* Scale info — constrained */}
        <div className="w-full max-w-3xl mx-auto px-6 py-8 flex flex-col items-center gap-2">
          <div className="text-2xl font-bold text-zinc-100">
            {rootInfo.en} {scale.name}
          </div>
          <div className="text-sm text-zinc-400">{rootInfo.fr} {scale.nameFr}</div>
          <div className="text-xs text-zinc-500 mt-1 font-mono">{currentRun.positionLabel}</div>
          {level.direction === 'both' && (
            <div className="mt-1 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-xs text-zinc-400 font-mono">
              {direction === 'up' ? '▲ ascending' : '▼ descending'}
            </div>
          )}
        </div>

        {/* Note progress dots — constrained */}
        <div className="w-full max-w-3xl mx-auto px-6 pb-2 flex items-center justify-center gap-1.5 flex-wrap">
          {orderedNotes.map((_, i) => (
            <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${
              i < noteIdx ? 'bg-green-500' :
              i === noteIdx ? (wrongFlash ? 'bg-red-400' : 'bg-amber-400 scale-125') :
              'bg-zinc-700'
            }`} />
          ))}
        </div>

        {/* Fretboard — full width */}
        <div className="w-full px-3 my-6">
          <Fretboard
            frets={currentRun.positionLabel.includes('12') ? 17 : 12}
            highlights={highlights}
            showFretNumbers={true}
          />
        </div>
      </div>
    );
  }

  const unlocked = accuracy >= 80 && selectedLevel < 6 && !progress.scales.levels[selectedLevel + 1]?.unlocked;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-zinc-900">
      <div className="w-full max-w-sm text-center space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-100 mb-1">Session complete</h2>
          <p className="text-sm text-zinc-500">L{selectedLevel} · {level.label}</p>
        </div>
        <div className="flex justify-center">
          <div className="relative">
            <svg width={120} height={120} className="rotate-[-90deg]">
              <circle cx={60} cy={60} r={50} fill="none" stroke="#27272a" strokeWidth={8} />
              <circle cx={60} cy={60} r={50} fill="none"
                stroke={accuracy >= 80 ? '#22c55e' : accuracy >= 50 ? '#f5a623' : '#ef4444'}
                strokeWidth={8}
                strokeDasharray={`${(accuracy / 100) * 314} ${314 - (accuracy / 100) * 314}`}
                strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-zinc-100">{accuracy}%</span>
            </div>
          </div>
        </div>
        {unlocked && (
          <div className="p-3 rounded-xl bg-green-900/20 border border-green-700/40 text-green-400 text-sm font-medium">
            ★ Level {selectedLevel + 1} unlocked!
          </div>
        )}
        <div className="flex flex-col gap-3">
          {selectedLevel < 6 && progress.scales.levels[selectedLevel + 1]?.unlocked && (
            <button
              onClick={() => { setSelectedLevel(selectedLevel + 1); setScreen('setup'); }}
              className="w-full py-2.5 rounded-xl bg-primary text-zinc-900 font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              Next: {SCALE_LEVELS[selectedLevel + 1].label} <ChevronRight size={16} />
            </button>
          )}
          <button onClick={startSession}
            className="w-full py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition-colors text-sm">
            Retry
          </button>
          <button onClick={() => setScreen('setup')}
            className="w-full py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition-colors text-sm">
            Change level
          </button>
          <button onClick={onBack} className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
            Back to Practice
          </button>
        </div>
      </div>
    </div>
  );
}
