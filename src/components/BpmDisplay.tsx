import { useState, useRef, useEffect, useCallback } from 'react';
import { Minus, Plus } from 'lucide-react';

interface BpmDisplayProps {
  value: number;
  onChange: (bpm: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  beatPulse?: boolean;
  showPulse?: boolean;
}

const CLAMP = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export default function BpmDisplay({
  value,
  onChange,
  disabled = false,
  min = 40,
  max = 200,
  beatPulse = false,
  showPulse = false,
}: BpmDisplayProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep draft in sync when value changes externally
  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  // Auto-focus & select when entering edit mode
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = useCallback(() => {
    setEditing(false);
    const n = parseInt(draft, 10);
    if (!isNaN(n)) {
      onChange(CLAMP(n, min, max));
    } else {
      setDraft(String(value));
    }
  }, [draft, onChange, min, max, value]);

  const nudge = useCallback(
    (delta: number) => {
      if (disabled) return;
      onChange(CLAMP(value + delta, min, max));
    },
    [value, onChange, disabled, min, max],
  );

  // Scroll wheel on the display
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (disabled) return;
      e.preventDefault();
      nudge(e.deltaY < 0 ? 1 : -1);
    },
    [nudge, disabled],
  );

  return (
    <div className="relative flex items-center gap-1.5 select-none bg-muted rounded-lg px-2 py-1.5" role="group" aria-label="Tempo setting">
      {showPulse && (
        <div
          className={`absolute top-1 right-3 w-1.5 h-1.5 rounded-full transition-all duration-100 ease-out ${
            beatPulse ? 'bg-primary scale-125 opacity-100' : 'bg-primary/30 scale-100 opacity-60'
          }`}
          aria-hidden="true"
        />
      )}
      {/* −1 button */}
      <button
        onClick={() => nudge(-1)}
        disabled={disabled || value <= min}
        className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
        title="−1 BPM"
        aria-label="Decrease tempo by 1"
      >
        <Minus size={12} aria-hidden="true" />
      </button>

      {/* Big BPM number */}
      <div
        className="relative flex flex-col items-center cursor-pointer"
        onWheel={handleWheel}
        title="Click to edit · Scroll to adjust"
      >
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') {
                setDraft(String(value));
                setEditing(false);
              }
            }}
            aria-label="Enter tempo BPM"
            className="w-[4.5ch] text-center text-3xl font-extrabold tabular-nums tracking-tighter bg-transparent text-foreground outline-none border-b-2 border-primary caret-primary"
            maxLength={3}
          />
        ) : (
          <button
            onClick={() => !disabled && setEditing(true)}
            disabled={disabled}
            className="text-3xl font-extrabold tabular-nums tracking-tighter text-foreground hover:text-primary disabled:opacity-40 transition-colors leading-none"
            aria-label={`Current tempo ${value} BPM. Click to edit.`}
          >
            {value}
          </button>
        )}
        <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground leading-none mt-0.5" aria-hidden="true">
          BPM
        </span>
      </div>

      {/* +1 button */}
      <button
        onClick={() => nudge(1)}
        disabled={disabled || value >= max}
        className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
        title="+1 BPM"
        aria-label="Increase tempo by 1"
      >
        <Plus size={12} aria-hidden="true" />
      </button>
    </div>
  );
}
