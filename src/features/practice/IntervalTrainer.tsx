import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { ArrowLeft, ChevronRight, Lightbulb, Play, Volume2, X } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select';
import Fretboard from '../../components/Fretboard';
import type { FretHighlight } from '../../components/Fretboard';
import {
  STANDARD_BASS_4,
  midiToNoteInfo,
  getNotePositions,
  INTERVALS,
  shuffle,
} from '../../lib/musicTheory';
import { usePracticeProgress } from './usePracticeProgress';
import { useAudioInput } from '../../hooks/useAudioInput';
import { playMidiSequence, isNotePlaying, preloadBassSynth } from '../../audio/bassSynth';

// Open string MIDI values for levels 1-3
const OPEN_STRING_MIDIS = STANDARD_BASS_4; // [28, 33, 38, 43]

// Bass MIDI range for random roots (frets 0-7 across strings)
function randomRootMidi(): number {
  const s = Math.floor(Math.random() * STANDARD_BASS_4.length);
  const fret = Math.floor(Math.random() * 8); // 0-7
  return STANDARD_BASS_4[s] + fret;
}

interface IntervalLevel {
  label: string;
  sublabel: string;
  intervalIndices: number[]; // indices into INTERVALS array
  randomRoot: boolean;
}

// INTERVALS order: P8(0), P5(1), P4(2), M3(3), m3(4), m7(5), M7(6), M2(7), m2(8), M6(9), m6(10), b5(11)
const INTERVAL_LEVELS: Record<number, IntervalLevel> = {
  1: { label: 'Octave',          sublabel: 'Open strings only',          intervalIndices: [0],          randomRoot: false },
  2: { label: '+ Perfect 5th',   sublabel: 'Open strings',               intervalIndices: [0,1],        randomRoot: false },
  3: { label: '+ Perfect 4th',   sublabel: 'Open strings',               intervalIndices: [0,1,2],      randomRoot: false },
  4: { label: '+ 3rds',          sublabel: 'Random roots',               intervalIndices: [0,1,2,3,4],  randomRoot: true  },
  5: { label: '+ 7ths',          sublabel: 'Random roots',               intervalIndices: [0,1,2,3,4,5,6], randomRoot: true },
  6: { label: 'All Intervals',   sublabel: 'Random roots',               intervalIndices: [0,1,2,3,4,5,6,7,8,9,10,11], randomRoot: true },
};

const SESSION_COUNTS = [10, 20, 50];
const STABLE_FRAMES = 4;

type Screen = 'setup' | 'playing' | 'result';
type Step = 'root' | 'target';
type Flash = 'none' | 'root-ok' | 'correct' | 'wrong';

interface Challenge {
  rootMidi: number;
  targetMidi: number;
  intervalIdx: number;
}

interface ChallengeResult {
  correct: boolean;
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

function buildChallenges(level: IntervalLevel, count: number): Challenge[] {
  const challenges: Challenge[] = [];
  while (challenges.length < count) {
    const intervalIdx = level.intervalIndices[Math.floor(Math.random() * level.intervalIndices.length)];
    const interval = INTERVALS[intervalIdx];
    let rootMidi: number;
    if (level.randomRoot) {
      rootMidi = randomRootMidi();
    } else {
      rootMidi = OPEN_STRING_MIDIS[Math.floor(Math.random() * OPEN_STRING_MIDIS.length)];
    }
    const targetMidi = rootMidi + interval.semitones;
    // Only accept challenges where target is visible within the 12-fret display
    const positions = getNotePositions(targetMidi, STANDARD_BASS_4, 12);
    if (positions.length > 0) {
      challenges.push({ rootMidi, targetMidi, intervalIdx });
    }
  }
  return shuffle(challenges);
}

export default function IntervalTrainer({ onBack }: Props) {
  const { progress, updateAfterSession } = usePracticeProgress();
  const [screen, setScreen] = useState<Screen>('setup');
  const [selectedLevel, setSelectedLevel] = useState<number>(() => {
    const levels = progress.intervals.levels;
    for (let l = 6; l >= 1; l--) if (levels[l]?.unlocked) return l;
    return 1;
  });
  const [sessionCount, setSessionCount] = useState(20);

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [results, setResults] = useState<ChallengeResult[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [step, setStep] = useState<Step>('root');
  const [flash, setFlash] = useState<Flash>('none');
  const [advancing, setAdvancing] = useState(false);
  const [revealed, setRevealed] = useState(false); // target shown (hint or after correct)

  const audio = useAudioInput();
  const prevMidiRef = useRef<number | null>(null);
  const stableFramesRef = useRef(0);
  const advancingRef = useRef(false);
  const stepRef = useRef<Step>('root');
  useLayoutEffect(() => { advancingRef.current = advancing; }, [advancing]);
  useLayoutEffect(() => { stepRef.current = step; }, [step]);

  const currentChallenge = challenges[currentIdx] ?? null;

  const advance = useCallback((correct: boolean) => {
    if (advancingRef.current) return;
    setAdvancing(true);
    advancingRef.current = true;
    setResults(prev => [...prev, { correct }]);

    setTimeout(() => {
      setFlash('none');
      setStep('root');
      setRevealed(false);
      prevMidiRef.current = null;
      stableFramesRef.current = 0;
      setCurrentIdx(i => i + 1);
      setAdvancing(false);
      advancingRef.current = false;
    }, 700);
  }, []);

  // End session
  useEffect(() => {
    if (screen === 'playing' && currentIdx >= challenges.length && challenges.length > 0) {
      setScreen('result');
    }
  }, [screen, currentIdx, challenges.length]);

  // Play root → target as an ear cue; reusable for the replay button
  const playCue = useCallback(() => {
    if (!currentChallenge) return;
    void playMidiSequence([currentChallenge.rootMidi, currentChallenge.targetMidi], {
      noteMs: 600,
      gapMs: 120,
    });
  }, [currentChallenge]);

  // Auto-play the cue when a new challenge appears
  useEffect(() => {
    if (screen !== 'playing' || !currentChallenge) return;
    playCue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, currentIdx]);

  // Note onset detection
  useEffect(() => {
    if (screen !== 'playing' || advancing || !currentChallenge) return;
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
      if (stableFramesRef.current === STABLE_FRAMES) {
        const currentStep = stepRef.current;
        if (currentStep === 'root' && midi === currentChallenge.rootMidi) {
          setFlash('root-ok');
          prevMidiRef.current = null;
          stableFramesRef.current = 0;
          setStep('target');
        } else if (currentStep === 'target' && midi === currentChallenge.targetMidi) {
          setFlash('correct');
          advance(true);
        }
      }
    } else {
      prevMidiRef.current = midi;
      stableFramesRef.current = 1;
    }
  }, [audio.currentPitch, screen, advancing, currentChallenge, advance]);

  function startSession() {
    sessionReportedRef.current = false;
    const cfg = INTERVAL_LEVELS[selectedLevel];
    const ch = buildChallenges(cfg, sessionCount);
    setChallenges(ch);
    setResults([]);
    setCurrentIdx(0);
    setStep('root');
    setFlash('none');
    setRevealed(false);
    setAdvancing(false);
    advancingRef.current = false;
    preloadBassSynth();
    setScreen('playing');
    audio.start();
  }

  const correctCount = results.filter(r => r.correct).length;
  const accuracy = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;

  const sessionReportedRef = useRef(false);
  useEffect(() => {
    if (screen === 'result' && results.length > 0 && !sessionReportedRef.current) {
      sessionReportedRef.current = true;
      updateAfterSession('intervals', selectedLevel, accuracy);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, results.length]);

  // Highlights
  const highlights: FretHighlight[] = [];
  if (screen === 'playing' && currentChallenge) {
    // Root
    const rootPos = getNotePositions(currentChallenge.rootMidi, STANDARD_BASS_4, 12)[0];
    if (rootPos) {
      highlights.push({
        string: rootPos.string, fret: rootPos.fret,
        state: flash === 'root-ok' || flash === 'correct' ? 'correct' : 'root',
      });
    }
    // Target — hidden until the user nails it (or reveals it with a hint)
    if (flash === 'correct' || revealed) {
      const targetPositions = getNotePositions(currentChallenge.targetMidi, STANDARD_BASS_4, 12);
      if (targetPositions[0]) {
        highlights.push({
          string: targetPositions[0].string, fret: targetPositions[0].fret,
          state: flash === 'correct' ? 'correct' : 'target',
        });
      }
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
            Hear the <em className="text-primary font-normal italic">interval</em>.
          </h2>
          <p className="text-sm text-zinc-500 mb-12">
            Listen to the interval, play the root, then find the target by ear. No time
            pressure — the target stays hidden until you nail it.
          </p>

          <h3 className="text-xs font-mono tracking-widest text-zinc-500 uppercase mb-4">Select Level</h3>
          <div className="mb-12">
            <LevelPicker
              levels={Object.entries(INTERVAL_LEVELS).map(([num, lvl]) => ({
                num: parseInt(num),
                label: lvl.label,
                sublabel: lvl.sublabel,
                locked: !(progress.intervals.levels[parseInt(num)]?.unlocked ?? false),
              }))}
              selected={selectedLevel}
              onSelect={setSelectedLevel}
            />
          </div>

          {/* Show which intervals are active */}
          <div className="mb-12 p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Active intervals</p>
            <div className="flex flex-wrap gap-1.5">
              {INTERVAL_LEVELS[selectedLevel].intervalIndices.map(i => (
                <span key={i} className="px-2 py-0.5 rounded bg-zinc-700 text-zinc-200 text-xs font-mono">
                  {INTERVALS[i].shortName}
                </span>
              ))}
            </div>
          </div>

          <h3 className="text-xs font-mono tracking-widest text-zinc-500 uppercase mb-4">Session length</h3>
          <div className="mb-14">
            <Select value={String(sessionCount)} onValueChange={v => setSessionCount(Number(v))}>
              <SelectTrigger className="w-44 h-9 bg-zinc-800 border-zinc-700 text-zinc-200 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-200 text-sm">
                {SESSION_COUNTS.map(c => (
                  <SelectItem key={c} value={String(c)}>{c} intervals</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
  if (screen === 'playing' && currentChallenge) {
    const interval = INTERVALS[currentChallenge.intervalIdx];
    const rootInfo = midiToNoteInfo(currentChallenge.rootMidi);
    const targetInfo = midiToNoteInfo(currentChallenge.targetMidi);
    const progressPct = currentIdx / sessionCount;

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
            <span className="font-mono text-zinc-500">L{selectedLevel} · {INTERVAL_LEVELS[selectedLevel].label}</span>
            <span className="text-zinc-300 font-semibold">{currentIdx} / {sessionCount}</span>
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progressPct * 100}%` }} />
          </div>
        </div>

        {/* Interval display — constrained */}
        <div className="w-full max-w-3xl mx-auto px-6 py-10 flex flex-col items-center gap-3">
          <div className={`text-3xl font-bold tracking-tight transition-colors duration-200 ${
            flash === 'correct' ? 'text-green-400' : 'text-zinc-100'
          }`}>
            {interval.name}
          </div>
          <div className="text-sm text-zinc-500 font-mono">{interval.nameFr}</div>
          <div className="flex items-center gap-4 mt-4">
            <div className="text-center">
              <div className={`text-2xl font-semibold transition-colors ${
                flash === 'root-ok' || flash === 'correct' ? 'text-green-400' : 'text-blue-400'
              }`}>{rootInfo.en}</div>
              <div className="text-sm text-zinc-500">{rootInfo.fr}</div>
            </div>
            <div className="text-zinc-600 text-xl">→</div>
            <div className="text-center">
              <div className={`text-2xl font-semibold transition-colors ${
                flash === 'correct' ? 'text-green-400' : 'text-amber-400'
              }`}>{flash === 'correct' || revealed ? targetInfo.en : '?'}</div>
              <div className="text-sm text-zinc-500">{flash === 'correct' || revealed ? targetInfo.fr : '—'}</div>
            </div>
          </div>
        </div>

        {/* Step indicator — constrained */}
        <div className="w-full max-w-3xl mx-auto px-6 flex flex-col items-center gap-4">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-sm ${
            step === 'root' ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' :
            'border-green-500/30 bg-green-500/10 text-green-400'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {step === 'root' ? 'Play the root note' : 'Root ✓ — now find the target by ear'}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={playCue}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-zinc-100 text-sm transition-all"
            >
              <Volume2 size={15} /> Replay interval
            </button>
            <button
              onClick={() => setRevealed(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-zinc-100 text-sm transition-all"
            >
              <Lightbulb size={15} /> Hint
            </button>
          </div>
        </div>

        {/* Fretboard — full width */}
        <div className="w-full px-3 my-6">
          <Fretboard frets={12} highlights={highlights} />
        </div>
      </div>
    );
  }

  const unlocked = accuracy >= 80 && selectedLevel < 6 && !progress.intervals.levels[selectedLevel + 1]?.unlocked;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-zinc-900">
      <div className="w-full max-w-sm text-center space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-100 mb-1">Session complete</h2>
          <p className="text-sm text-zinc-500">L{selectedLevel} · {INTERVAL_LEVELS[selectedLevel].label}</p>
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
          {selectedLevel < 6 && progress.intervals.levels[selectedLevel + 1]?.unlocked && (
            <button
              onClick={() => { setSelectedLevel(selectedLevel + 1); setScreen('setup'); }}
              className="w-full py-2.5 rounded-xl bg-primary text-zinc-900 font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              Next: {INTERVAL_LEVELS[selectedLevel + 1].label} <ChevronRight size={16} />
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
