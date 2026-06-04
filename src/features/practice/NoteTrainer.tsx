import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { ArrowLeft, ChevronRight, Lightbulb, Play, Volume2, X } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select';
import Fretboard from '../../components/Fretboard';
import type { FretHighlight } from '../../components/Fretboard';
import {
  STANDARD_BASS_4,
  midiToNoteInfo,
  getAvailableMidiNotes,
  buildNoteQueue,
} from '../../lib/musicTheory';
import { usePracticeProgress } from './usePracticeProgress';
import { useAudioInput } from '../../hooks/useAudioInput';
import { playMidiNote, isNotePlaying, preloadBassSynth } from '../../audio/bassSynth';

interface NoteLevel {
  label: string;
  sublabel: string;
  strings: number[];
  minFret: number;
  maxFret: number;
  naturalOnly: boolean;
  timeSec: number;
}

const NOTE_LEVELS: Record<number, NoteLevel> = {
  1: { label: 'E String',     sublabel: 'Open Position',  strings: [0],       minFret: 0, maxFret: 5,  naturalOnly: true,  timeSec: 15 },
  2: { label: 'Full Neck',    sublabel: 'Natural Notes',  strings: [0,1,2,3], minFret: 0, maxFret: 12, naturalOnly: true,  timeSec: 15 },
  3: { label: 'E + A',        sublabel: 'Chromatic',      strings: [0,1],     minFret: 0, maxFret: 12, naturalOnly: false, timeSec: 15 },
  4: { label: 'Full Neck',    sublabel: 'Chromatic',      strings: [0,1,2,3], minFret: 0, maxFret: 12, naturalOnly: false, timeSec: 15 },
  5: { label: 'Upper Neck',   sublabel: 'Frets 5 – 17',   strings: [0,1,2,3], minFret: 5, maxFret: 17, naturalOnly: false, timeSec: 15 },
  6: { label: 'Speed Mode',   sublabel: 'Full Neck',      strings: [0,1,2,3], minFret: 0, maxFret: 17, naturalOnly: false, timeSec: 8  },
};

const SESSION_COUNTS = [10, 20, 50];
const STABLE_FRAMES = 4;

type Screen = 'setup' | 'playing' | 'result';
type Flash = 'none' | 'correct' | 'wrong';

interface NoteResult {
  targetMidi: number;
  outcome: 'correct' | 'timeout' | 'pending';
  hinted: boolean;
  timeTaken: number; // ms
}

interface Props {
  onBack: () => void;
}

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

export default function NoteTrainer({ onBack }: Props) {
  const { progress, updateAfterSession } = usePracticeProgress();
  const [screen, setScreen] = useState<Screen>('setup');
  const [selectedLevel, setSelectedLevel] = useState<number>(() => {
    const levels = progress.notes.levels;
    for (let l = 6; l >= 1; l--) if (levels[l]?.unlocked) return l;
    return 1;
  });
  const [sessionCount, setSessionCount] = useState(20);

  // Playing state
  const [queue, setQueue] = useState<number[]>([]);
  const [results, setResults] = useState<NoteResult[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [showHint, setShowHint] = useState(false);
  const [flash, setFlash] = useState<Flash>('none');
  const [advancing, setAdvancing] = useState(false);

  const audio = useAudioInput();
  const prevMidiRef = useRef<number | null>(null);
  const stableFramesRef = useRef(0);
  const advancingRef = useRef(false);

  const noteStartTimeRef = useRef(0);
  const hintedRef = useRef(false);

  const levelConfig = NOTE_LEVELS[selectedLevel];
  const currentMidi = queue[currentIdx] ?? null;

  // Sync advancingRef with state
  useLayoutEffect(() => { advancingRef.current = advancing; }, [advancing]);

  const advance = useCallback((outcome: 'correct' | 'timeout') => {
    if (advancingRef.current) return;
    setAdvancing(true);
    advancingRef.current = true;

    const timeTaken = Date.now() - noteStartTimeRef.current;
    setResults(prev => [...prev, {
      targetMidi: queue[currentIdx],
      outcome,
      hinted: hintedRef.current,
      timeTaken,
    }]);

    setTimeout(() => {
      setFlash('none');
      setShowHint(false);
      hintedRef.current = false;
      prevMidiRef.current = null;
      stableFramesRef.current = 0;
      setCurrentIdx(i => i + 1);
      setAdvancing(false);
      advancingRef.current = false;
      noteStartTimeRef.current = Date.now();
    }, 700);
  }, [queue, currentIdx]);

  // Countdown timer
  useEffect(() => {
    if (screen !== 'playing' || advancing) return;
    setTimeLeft(levelConfig.timeSec);
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const left = Math.max(0, levelConfig.timeSec - elapsed);
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(id);
        setFlash('wrong');
        advance('timeout');
      }
    }, 100);
    return () => clearInterval(id);
  }, [screen, currentIdx, advancing, levelConfig.timeSec, advance]);

  // End session when queue exhausted
  useEffect(() => {
    if (screen === 'playing' && currentIdx >= queue.length && queue.length > 0) {
      setScreen('result');
    }
  }, [screen, currentIdx, queue.length]);

  // Play the awaited note aloud when a new note appears
  useEffect(() => {
    if (screen !== 'playing' || currentMidi === null) return;
    void playMidiNote(currentMidi, 700);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, currentIdx]);

  // Pitch detection → onset detection
  useEffect(() => {
    if (screen !== 'playing' || advancing || currentMidi === null) return;
    if (isNotePlaying()) {
      prevMidiRef.current = null;
      stableFramesRef.current = 0;
      return;
    }
    const { midi } = audio.currentPitch;
    if (midi === null) {
      prevMidiRef.current = null;
      stableFramesRef.current = 0;
      return;
    }
    if (midi === prevMidiRef.current) {
      stableFramesRef.current++;
      if (stableFramesRef.current === STABLE_FRAMES && midi % 12 === currentMidi % 12) {
        setFlash('correct');
        advance('correct');
      }
    } else {
      prevMidiRef.current = midi;
      stableFramesRef.current = 1;
    }
  }, [audio.currentPitch, screen, advancing, currentMidi, advance]);

  function startSession() {
    sessionReportedRef.current = false;
    const cfg = NOTE_LEVELS[selectedLevel];
    const pool = getAvailableMidiNotes(STANDARD_BASS_4, cfg.strings, cfg.minFret, cfg.maxFret, cfg.naturalOnly);
    const q = buildNoteQueue(pool, sessionCount);
    setQueue(q);
    setResults([]);
    setCurrentIdx(0);
    setShowHint(false);
    setFlash('none');
    setAdvancing(false);
    advancingRef.current = false;
    noteStartTimeRef.current = Date.now();
    preloadBassSynth();
    setScreen('playing');
    audio.start();
  }

  // Result computation
  const correctCount = results.filter(r => r.outcome === 'correct').length;
  const accuracy = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;

  // Save progress when transitioning to result (must be before early returns)
  const sessionReportedRef = useRef(false);
  useEffect(() => {
    if (screen === 'result' && results.length > 0 && !sessionReportedRef.current) {
      sessionReportedRef.current = true;
      updateAfterSession('notes', selectedLevel, accuracy);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, results.length]);

  // Fretboard highlights — match any octave of the same pitch class
  const highlights: FretHighlight[] = [];
  if (screen === 'playing' && currentMidi !== null) {
    if (showHint || flash !== 'none') {
      const state = flash === 'correct' ? 'correct' : flash === 'wrong' ? 'wrong' : 'hint';
      const pitchClass = currentMidi % 12;
      for (const s of levelConfig.strings) {
        for (let f = levelConfig.minFret; f <= levelConfig.maxFret; f++) {
          if ((STANDARD_BASS_4[s] + f) % 12 === pitchClass) {
            highlights.push({ string: s, fret: f, state });
          }
        }
      }
    }
  }

  // ── Setup screen ──────────────────────────────────────────────────────────
  if (screen === 'setup') {
    return (
      <div className="flex-1 flex flex-col p-6 bg-zinc-900 overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto">
          <button onClick={onBack} className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 text-sm mb-10 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>

          <h2 className="text-3xl font-medium tracking-tight text-zinc-100 mb-3">
            Find the <em className="text-primary font-normal italic">note</em>.
          </h2>
          <p className="text-sm text-zinc-500 mb-12">
            A note name appears — find and play it anywhere on your bass.
          </p>

          <h3 className="text-xs font-mono tracking-widest text-zinc-500 uppercase mb-4">Select Level</h3>
          <div className="mb-12">
            <LevelPicker
              levels={Object.entries(NOTE_LEVELS).map(([num, lvl]) => ({
                num: parseInt(num),
                label: lvl.label,
                sublabel: lvl.sublabel,
                locked: !(progress.notes.levels[parseInt(num)]?.unlocked ?? false),
              }))}
              selected={selectedLevel}
              onSelect={setSelectedLevel}
            />
          </div>

          <h3 className="text-xs font-mono tracking-widest text-zinc-500 uppercase mb-4">Session length</h3>
          <div className="mb-14">
            <Select value={String(sessionCount)} onValueChange={v => setSessionCount(Number(v))}>
              <SelectTrigger className="w-44 h-9 bg-zinc-800 border-zinc-700 text-zinc-200 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-200 text-sm">
                {SESSION_COUNTS.map(c => (
                  <SelectItem key={c} value={String(c)}>{c} notes</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <button
            onClick={startSession}
            className="w-full py-4 rounded-xl bg-primary text-zinc-900 font-bold tracking-wide text-base flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <Play size={16} fill="currentColor" /> Start session
          </button>
        </div>
      </div>
    );
  }

  // ── Playing screen ────────────────────────────────────────────────────────
  if (screen === 'playing' && currentMidi !== null) {
    const noteInfo = midiToNoteInfo(currentMidi);
    const progressPct = currentIdx / sessionCount;
    const timePct = timeLeft / levelConfig.timeSec;

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
            <span className="font-mono text-zinc-500">L{selectedLevel} · {levelConfig.label}</span>
            <span className="text-zinc-300 font-semibold">{currentIdx} / {sessionCount}</span>
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progressPct * 100}%` }}
            />
          </div>
        </div>

        {/* Note display — constrained */}
        <div className="w-full max-w-3xl mx-auto px-6 py-10 flex flex-col items-center gap-2">
          <div className={`text-6xl font-bold tracking-tight transition-colors duration-200 ${
            flash === 'correct' ? 'text-green-400' : flash === 'wrong' ? 'text-red-400' : 'text-zinc-100'
          }`}>
            {noteInfo.en}
          </div>
          <div className="text-2xl text-zinc-400 font-medium">{noteInfo.fr}</div>
          <button
            onClick={() => { if (currentMidi !== null) void playMidiNote(currentMidi, 700); }}
            className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-zinc-100 text-sm transition-all"
          >
            <Volume2 size={15} /> Replay
          </button>
        </div>

        {/* Countdown — constrained */}
        <div className="w-full max-w-3xl mx-auto px-6 space-y-1">
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{
                width: `${timePct * 100}%`,
                backgroundColor: timePct > 0.4 ? '#f5a623' : timePct > 0.2 ? '#f97316' : '#ef4444',
              }}
            />
          </div>
          <div className="text-right text-[10px] font-mono text-zinc-600">{Math.ceil(timeLeft)}s</div>
        </div>

        {/* Fretboard — full width */}
        <div className="w-full px-3 my-6">
          <Fretboard
            frets={levelConfig.maxFret <= 12 ? 12 : 17}
            highlights={highlights}
          />
        </div>

        {/* Hint — constrained */}
        <div className="w-full max-w-3xl mx-auto px-6 pb-8">
          <button
            onClick={() => {
              if (!showHint) hintedRef.current = true;
              setShowHint(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-zinc-100 text-sm transition-all"
          >
            <Lightbulb size={15} />
            Hint
          </button>
        </div>
      </div>
    );
  }

  const unlocked = accuracy >= 80 && selectedLevel < 6 &&
    !progress.notes.levels[selectedLevel + 1]?.unlocked;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-zinc-900">
      <div className="w-full max-w-sm text-center space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-100 mb-1">Session complete</h2>
          <p className="text-sm text-zinc-500">
            L{selectedLevel} · {levelConfig.label} · {levelConfig.sublabel}
          </p>
        </div>

        {/* Accuracy ring */}
        <div className="flex justify-center">
          <div className="relative">
            <svg width={120} height={120} className="rotate-[-90deg]">
              <circle cx={60} cy={60} r={50} fill="none" stroke="#27272a" strokeWidth={8} />
              <circle
                cx={60} cy={60} r={50}
                fill="none"
                stroke={accuracy >= 80 ? '#22c55e' : accuracy >= 50 ? '#f5a623' : '#ef4444'}
                strokeWidth={8}
                strokeDasharray={`${(accuracy / 100) * 314} ${314 - (accuracy / 100) * 314}`}
                strokeLinecap="round"
              />
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
          {selectedLevel < 6 && progress.notes.levels[selectedLevel + 1]?.unlocked && (
            <button
              onClick={() => { setSelectedLevel(selectedLevel + 1); setScreen('setup'); }}
              className="w-full py-2.5 rounded-xl bg-primary text-zinc-900 font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              Next: {NOTE_LEVELS[selectedLevel + 1].label} <ChevronRight size={16} />
            </button>
          )}
          <button
            onClick={startSession}
            className="w-full py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition-colors text-sm"
          >
            Retry
          </button>
          <button
            onClick={() => setScreen('setup')}
            className="w-full py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition-colors text-sm"
          >
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
