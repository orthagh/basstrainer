import { useState } from 'react';
import { Grid3x3, Ruler, TrendingUp, Music2, ChevronRight } from 'lucide-react';
import type { PracticeMode } from './types';
import NoteTrainer from './NoteTrainer';
import IntervalTrainer from './IntervalTrainer';
import ScaleTrainer from './ScaleTrainer';
import ChordChangesTrainer from './ChordChangesTrainer';

type SubView = 'hub' | PracticeMode;

interface ModeCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  locked?: boolean; // reserved for future use
  onClick: () => void;
}

function ModeCard({ icon, title, description, locked, onClick }: ModeCardProps) {
  return (
    <button
      onClick={locked ? undefined : onClick}
      disabled={locked}
      className={`
        relative flex flex-col gap-3 p-5 rounded-xl border text-left transition-all duration-200
        ${locked
          ? 'bg-zinc-900 border-zinc-800 opacity-40 cursor-not-allowed'
          : 'bg-zinc-800/70 border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800 active:scale-[0.98]'
        }
      `}
    >
      <div className="p-2 rounded-lg bg-zinc-700/60 text-primary w-fit">
        {icon}
      </div>

      <div className="flex-1">
        <h3 className="font-semibold text-zinc-100 text-sm mb-1">{title}</h3>
        <p className="text-xs text-zinc-400 leading-relaxed">{description}</p>
      </div>

      <div className="flex items-center gap-1 text-zinc-500 text-xs">
        Start <ChevronRight size={12} />
      </div>
    </button>
  );
}

export default function PracticeHub() {
  const [subView, setSubView] = useState<SubView>('hub');

  if (subView === 'notes') return <NoteTrainer onBack={() => setSubView('hub')} />;
  if (subView === 'intervals') return <IntervalTrainer onBack={() => setSubView('hub')} />;
  if (subView === 'scales') return <ScaleTrainer onBack={() => setSubView('hub')} />;
  if (subView === 'chordChanges') return <ChordChangesTrainer onBack={() => setSubView('hub')} />;

  return (
    <div className="flex-1 flex flex-col items-center justify-start p-6 bg-zinc-900 overflow-y-auto">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="mb-10">
          <h2 className="text-5xl font-medium tracking-tight text-zinc-100 mb-3">
            Train your <em className="text-primary font-normal italic">fretboard</em>.
          </h2>
          <p className="text-sm text-zinc-500">
            Short, focused sessions that build real neck knowledge.
          </p>
        </div>

        {/* Mode cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ModeCard
            icon={<Grid3x3 size={20} />}
            title="Notes on Neck"
            description="Find a named note anywhere on the fretboard. Starts on one string, expands to the full neck."
            onClick={() => setSubView('notes')}
          />
          <ModeCard
            icon={<Ruler size={20} />}
            title="Intervals"
            description="Play a root note then its interval. Builds intervallic thinking, the core of bass vocabulary."
            onClick={() => setSubView('intervals')}
          />
          <ModeCard
            icon={<TrendingUp size={20} />}
            title="Scales"
            description="Navigate scale patterns on the fretboard in order. Expands from open position to the full neck."
            onClick={() => setSubView('scales')}
          />
          <ModeCard
            icon={<Music2 size={20} />}
            title="Chord Changes"
            description="A backing track plays chord changes — outline them with single notes. Choose style, key, and progression."
            onClick={() => setSubView('chordChanges')}
          />
        </div>
      </div>
    </div>
  );
}
