import { useState } from 'react';
import { Music2 } from 'lucide-react';
import { Progression as TonalProgression } from 'tonal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BpmDisplay from '@/components/BpmDisplay';
import { useJamPlayer } from '@/hooks/useJamPlayer';
import {
  PROGRESSIONS,
  STYLE_LABELS,
  CHROMATIC_ROOTS,
  type Style,
  type RootNote,
} from '@/data/jam/progressions';

const STYLES: Style[] = ['rock', 'funk', 'blues', 'reggae'];

export default function JamPage() {
  const [style, setStyle] = useState<Style>('blues');
  const [progIndex, setProgIndex] = useState(0);
  const [rootNote, setRootNote] = useState<RootNote>('A');

  const progression = PROGRESSIONS[style][progIndex] ?? PROGRESSIONS[style][0];

  const { bpm, isPlaying, isLoaded, currentBar, play, stop, setBpm } =
    useJamPlayer(style, progression, rootNote);

  const handleStyleChange = (s: Style) => {
    setStyle(s);
    setProgIndex(0);
  };

  return (
    <div className="dark flex-1 flex flex-col bg-zinc-900 overflow-y-auto">
      {/* Style tabs */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-800">
        <div className="flex gap-1">
          {STYLES.map(s => (
            <button
              key={s}
              onClick={() => handleStyleChange(s)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                style === s
                  ? 'bg-amber-500 text-zinc-900'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              }`}
            >
              {STYLE_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 font-medium">Key</span>
          <Select value={rootNote} onValueChange={v => setRootNote(v as RootNote)}>
            <SelectTrigger className="w-20 h-8 bg-zinc-800 border-zinc-700 text-zinc-100 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-52 overflow-y-auto">
              {CHROMATIC_ROOTS.map(r => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 min-h-0">
        {/* Progressions sidebar */}
        <div className="w-56 border-r border-zinc-800 p-4 flex flex-col gap-1 shrink-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">
            Progressions
          </p>
          {PROGRESSIONS[style].map((prog, i) => (
            <button
              key={i}
              onClick={() => setProgIndex(i)}
              className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                progIndex === i
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <span className={`mr-2 ${progIndex === i ? 'text-amber-400' : 'text-zinc-600'}`}>
                {progIndex === i ? '●' : '○'}
              </span>
              {prog.name}
            </button>
          ))}
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
          {/* Chord display */}
          <ChordDisplay
            bars={progression.bars}
            rootNote={rootNote}
            currentBar={isPlaying ? currentBar : -1}
            totalBars={progression.bars.length}
          />

          {/* BPM control */}
          <BpmDisplay value={bpm} onChange={setBpm} min={40} max={220} />

          {/* Play / Stop */}
          <button
            onClick={isPlaying ? stop : () => void play()}
            disabled={!isLoaded}
            className={`w-full max-w-xs rounded-xl font-bold tracking-wide transition-colors ${
              !isLoaded
                ? 'py-4 text-lg bg-primary/40 text-primary-foreground/50 cursor-not-allowed'
                : isPlaying
                ? 'py-3 bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/30'
                : 'py-4 text-lg bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
            aria-label={isPlaying ? 'Stop' : 'Start'}
          >
            {!isLoaded ? (
              <span className="flex items-center justify-center gap-2">
                <Music2 size={18} className="animate-pulse" /> Loading…
              </span>
            ) : isPlaying ? (
              <span className="flex items-center justify-center gap-3 text-lg">
                <span aria-hidden="true" className="text-base leading-none relative -top-0.5">■</span>
                Stop
              </span>
            ) : '▶ Start'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChordDisplay
// ---------------------------------------------------------------------------

interface ChordDisplayProps {
  bars: string[];
  rootNote: string;
  currentBar: number;
  totalBars: number;
}

function ChordDisplay({ bars, rootNote, currentBar, totalBars }: ChordDisplayProps) {
  const resolvedNames = bars.map(roman => {
    const [name] = TonalProgression.fromRomanNumerals(rootNote, [roman]);
    return name ?? roman;
  });

  const itemsPerRow = Math.min(totalBars, 4);

  return (
    <div className="w-full max-w-lg">
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${itemsPerRow}, minmax(0, 1fr))` }}
      >
        {resolvedNames.map((name, i) => {
          const isCurrent = i === currentBar;
          const isNext = i === (currentBar + 1) % totalBars && currentBar >= 0;
          return (
            <div
              key={i}
              className={`rounded-xl border h-14 flex items-center justify-center transition-colors duration-150 ${
                isCurrent
                  ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                  : isNext
                  ? 'border-zinc-600 bg-zinc-800/60 text-zinc-300'
                  : 'border-zinc-700/50 bg-zinc-800/30 text-zinc-500'
              }`}
            >
              <span className={`text-lg tracking-tight ${isCurrent ? 'font-semibold' : 'font-normal'}`}>
                {name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
