import { useState, useLayoutEffect, useRef } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { Progression as TonalProgression, Chord, Note } from 'tonal';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select';
import BpmDisplay from '../../components/BpmDisplay';
import { useJamPlayer } from '../../hooks/useJamPlayer';
import {
  PROGRESSIONS,
  STYLE_LABELS,
  CHROMATIC_ROOTS,
  type Style,
  type RootNote,
} from '../../data/jam/progressions';

const STYLES: Style[] = ['rock', 'funk', 'blues', 'reggae', 'jazz'];

interface Props {
  onBack: () => void;
}

type Screen = 'setup' | 'playing';

export default function ChordChangesTrainer({ onBack }: Props) {
  const [screen, setScreen] = useState<Screen>('setup');
  const [style, setStyle] = useState<Style>('blues');
  const [progIndex, setProgIndex] = useState(0);
  const [rootNote, setRootNote] = useState<RootNote>('A');

  const progression = PROGRESSIONS[style][progIndex] ?? PROGRESSIONS[style][0];

  const { bpm, isPlaying, isLoaded, currentBar, play, stop, setBpm } =
    useJamPlayer(style, progression, rootNote);

  const handleStyleChange = (s: Style) => {
    setStyle(s);
    setProgIndex(0);
    const firstProg = PROGRESSIONS[s][0];
    if (firstProg?.originalKey) setRootNote(firstProg.originalKey as RootNote);
  };

  const handleStart = () => {
    setScreen('playing');
    void play();
  };

  const handleEnd = () => {
    stop();
    setScreen('setup');
  };

  // ── Setup screen ────────────────────────────────────────────────────────────

  if (screen === 'setup') {
    return (
      <div className="dark flex-1 flex flex-col p-6 bg-zinc-900 overflow-y-auto">
        <div className="w-full max-w-lg mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 text-sm mb-10 transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>

          <h2 className="text-3xl font-medium tracking-tight text-zinc-100 mb-3">
            Follow the <em className="text-primary font-normal italic">changes</em>.
          </h2>
          <p className="text-sm text-zinc-500 mb-12">
            A backing track plays chord changes — outline them with single notes over the progression.
          </p>

          <div className="flex flex-col gap-8 mb-12">
            <div>
              <h3 className="text-xs font-mono tracking-widest text-zinc-500 uppercase mb-4">Style</h3>
              <PillPicker
                items={STYLES.map(s => ({ value: s, label: STYLE_LABELS[s] }))}
                selected={style}
                onSelect={v => handleStyleChange(v as Style)}
              />
            </div>

            <div>
              <h3 className="text-xs font-mono tracking-widest text-zinc-500 uppercase mb-4">Progression</h3>
              <PillPicker
                key={style}
                items={PROGRESSIONS[style].map((prog, i) => ({ value: String(i), label: prog.name }))}
                selected={String(progIndex)}
                onSelect={v => {
                  const idx = Number(v);
                  setProgIndex(idx);
                  const prog = PROGRESSIONS[style][idx];
                  if (prog?.originalKey) setRootNote(prog.originalKey as RootNote);
                }}
              />
            </div>

            <div className="flex gap-8">
              <div>
                <h3 className="text-xs font-mono tracking-widest text-zinc-500 uppercase mb-4">Key</h3>
                <Select value={rootNote} onValueChange={v => setRootNote(v as RootNote)}>
                  <SelectTrigger className="w-24 h-9 bg-zinc-800 border-zinc-700 text-zinc-200 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-200 text-sm max-h-52 overflow-y-auto">
                    {CHROMATIC_ROOTS.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <h3 className="text-xs font-mono tracking-widest text-zinc-500 uppercase mb-4">Tempo</h3>
                <BpmDisplay value={bpm} onChange={setBpm} min={40} max={220} />
              </div>
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={!isLoaded}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold tracking-wide text-base flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoaded ? '▶ Start' : 'Loading samples…'}
          </button>
        </div>
      </div>
    );
  }

  // ── Playing screen ──────────────────────────────────────────────────────────

  return (
    <div className="dark flex-1 flex flex-col bg-zinc-900 overflow-y-auto">
      <div className="w-full max-w-lg mx-auto px-6 pt-8 space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handleEnd}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 font-mono tracking-wide text-xs transition-all"
          >
            <X size={12} /> End session
          </button>

          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-zinc-500">
              {STYLE_LABELS[style]} · {rootNote} · {progression.name}
            </span>
            <BpmDisplay value={bpm} onChange={setBpm} min={40} max={220} />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center gap-16 px-6 pt-20 pb-8">
        <ChordGrid
          bars={progression.bars}
          rootNote={rootNote}
          currentBar={isPlaying ? currentBar : -1}
          totalBars={progression.bars.length}
          originalKey={progression.originalKey}
        />

        <button
          onClick={isPlaying ? stop : () => void play()}
          className={`w-full max-w-xs rounded-xl font-bold tracking-wide transition-colors ${
            isPlaying
              ? 'py-3 bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/30'
              : 'py-4 text-lg bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {isPlaying ? (
            <span className="flex items-center justify-center gap-3 text-lg">
              <span aria-hidden="true" className="text-base leading-none relative -top-0.5">■</span>
              Stop
            </span>
          ) : '▶ Start'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PillPicker
// ---------------------------------------------------------------------------

interface PillPickerProps {
  items: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
}

function PillPicker({ items, selected, onSelect }: PillPickerProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pill, setPill] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const idx = items.findIndex(it => it.value === selected);
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
      {items.map(({ value, label }, i) => (
        <button
          key={value}
          ref={el => { refs.current[i] = el; }}
          onClick={() => onSelect(value)}
          className={[
            'relative px-4 py-2 rounded-md font-mono text-[13px] tracking-[0.08em] transition-colors whitespace-nowrap',
            selected === value ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-200',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChordGrid
// ---------------------------------------------------------------------------

interface ChordGridProps {
  bars: string[];
  rootNote: string;
  currentBar: number;
  totalBars: number;
  originalKey?: string;
}

function ChordGrid({ bars, rootNote, currentBar, totalBars, originalKey }: ChordGridProps) {
  const names = bars.map(bar => {
    if (originalKey) {
      const ivl = Note.distance(originalKey, rootNote);
      return Chord.transpose(bar, ivl) || bar;
    }
    const [name] = TonalProgression.fromRomanNumerals(rootNote, [bar]);
    return name ?? bar;
  });

  const cols = Math.min(totalBars, 4);

  return (
    <div className="w-full max-w-sm">
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {names.map((name, i) => {
          const isCurrent = i === currentBar;
          const isNext = currentBar >= 0 && i === (currentBar + 1) % totalBars;
          return (
            <div
              key={i}
              className={`h-14 rounded-xl border flex items-center justify-center transition-colors duration-150 ${
                isCurrent
                  ? 'border-primary bg-primary/15 text-primary'
                  : isNext
                  ? 'border-zinc-600 bg-zinc-800/60 text-zinc-300'
                  : 'border-zinc-700/50 bg-zinc-800/30 text-zinc-500'
              }`}
            >
              <span className={`font-mono text-lg tracking-tight ${isCurrent ? 'font-semibold' : 'font-normal'}`}>
                {name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
