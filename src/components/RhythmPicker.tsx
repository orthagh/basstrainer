/**
 * RhythmPicker — beat accent row + compact beats-per-bar stepper + division dropdown.
 *
 * Layout (top to bottom):
 *   1. Beat circles — toggle accent on each beat; active beat pulses when playing
 *   2. Controls row — [− Beats +]  [Division dropdown ▾]
 *      The division dropdown has two sections:
 *        • "Division" — directly set the subdivision (quarter, eighth, triplet, sixteenth)
 *        • "Time signature" — presets that set both beats and division at once
 */

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type Subdivision } from '../hooks/useMetronome';

// ── Note SVG illustrations ────────────────────────────────────────────────────
// fill="currentColor" so icons inherit the parent text colour automatically.

function QuarterNote({ height = 20 }: { height?: number }) {
  const w = (height * 10) / 20;
  return (
    <svg width={w} height={height} viewBox="0 0 10 20" fill="currentColor" aria-hidden="true">
      <rect x="8.5" y="0" width="1.2" height="15.5" rx="0.6" />
      <ellipse cx="4.5" cy="16.5" rx="4.5" ry="3" transform="rotate(-25 4.5 16.5)" />
    </svg>
  );
}

function EighthNotes({ height = 20 }: { height?: number }) {
  const w = (height * 22) / 20;
  return (
    <svg width={w} height={height} viewBox="0 0 22 20" fill="currentColor" aria-hidden="true">
      {/* stems */}
      <rect x="8.5" y="2" width="1.2" height="13.5" rx="0.6" />
      <rect x="20" y="3" width="1.2" height="12.5" rx="0.6" />
      {/* beam */}
      <path d="M8.5 2 L21.5 3 L21.5 6 L8.5 5 Z" />
      {/* noteheads */}
      <ellipse cx="4.5" cy="16.5" rx="4.5" ry="3" transform="rotate(-25 4.5 16.5)" />
      <ellipse cx="16" cy="17.5" rx="4.5" ry="3" transform="rotate(-25 16 17.5)" />
    </svg>
  );
}

function TripletNotes({ height = 20 }: { height?: number }) {
  const w = (height * 32) / 22;
  return (
    <svg width={w} height={height} viewBox="0 0 32 22" fill="currentColor" aria-hidden="true">
      {/* stems — positioned at right edge of each notehead */}
      <rect x="9"    y="2" width="1.2" height="16" rx="0.6" />
      <rect x="18.5" y="2" width="1.2" height="16" rx="0.6" />
      <rect x="28"   y="2" width="1.2" height="16" rx="0.6" />
      {/* beam */}
      <path d="M9 2 L29.5 2 L29.5 5 L9 5 Z" />
      {/* noteheads — shifted left so stem meets right side */}
      <ellipse cx="5"    cy="18" rx="5" ry="3.5" transform="rotate(-25 5 18)" />
      <ellipse cx="14.5" cy="18" rx="5" ry="3.5" transform="rotate(-25 14.5 18)" />
      <ellipse cx="24"   cy="18" rx="5" ry="3.5" transform="rotate(-25 24 18)" />
    </svg>
  );
}

function SixteenthNotes({ height = 20 }: { height?: number }) {
  const w = (height * 22) / 20;
  return (
    <svg width={w} height={height} viewBox="0 0 22 20" fill="currentColor" aria-hidden="true">
      {/* stems */}
      <rect x="8.5" y="1" width="1.2" height="14.5" rx="0.6" />
      <rect x="20" y="2" width="1.2" height="13.5" rx="0.6" />
      {/* two beams */}
      <path d="M8.5 1 L21.5 2 L21.5 5 L8.5 4 Z" />
      <path d="M8.5 6 L21.5 7 L21.5 10 L8.5 9 Z" />
      {/* noteheads */}
      <ellipse cx="4.5" cy="16.5" rx="4.5" ry="3" transform="rotate(-25 4.5 16.5)" />
      <ellipse cx="16" cy="17.5" rx="4.5" ry="3" transform="rotate(-25 16 17.5)" />
    </svg>
  );
}

function NoteIcon({ subdivision, height = 20 }: { subdivision: Subdivision; height?: number }) {
  switch (subdivision) {
    case 'quarter':   return <QuarterNote height={height} />;
    case 'eighth':    return <EighthNotes height={height} />;
    case 'triplet':   return <TripletNotes height={height} />;
    case 'sixteenth': return <SixteenthNotes height={height} />;
  }
}

// ── Time signature presets ────────────────────────────────────────────────────

const TIME_SIGNATURES: { label: string; beats: number; subdivision: Subdivision }[] = [
  { label: '2/4', beats: 2, subdivision: 'quarter' },
  { label: '3/4', beats: 3, subdivision: 'quarter' },
  { label: '4/4', beats: 4, subdivision: 'quarter' },
  { label: '5/4', beats: 5, subdivision: 'quarter' },
  { label: '6/8', beats: 2, subdivision: 'triplet' },
  { label: '7/8', beats: 7, subdivision: 'eighth' },
  { label: '9/8', beats: 3, subdivision: 'triplet' },
  { label: '12/8', beats: 4, subdivision: 'triplet' },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface RhythmPickerProps {
  beatsPerBar: number;
  subdivision: Subdivision;
  /** length === beatsPerBar; index 0 is always true */
  accentPattern: boolean[];
  /** 0-based index of the currently active beat (while playing) */
  currentBeat?: number;
  isPlaying?: boolean;
  onBeatsChange: (n: number) => void;
  onSubdivisionChange: (s: Subdivision) => void;
  /** Beat 0 toggle is ignored (always accented). */
  onAccentToggle: (beatIndex: number) => void;
}

export default function RhythmPicker({
  beatsPerBar,
  subdivision,
  accentPattern,
  currentBeat,
  isPlaying,
  onBeatsChange,
  onSubdivisionChange,
  onAccentToggle,
}: RhythmPickerProps) {
  // Division dropdown: encode as "div:<subdivision>" so value always reflects
  // the current subdivision even after a time-signature shortcut is applied.
  const divSelectValue = `div:${subdivision}`;

  function handleDivisionChange(v: string) {
    if (v.startsWith('div:')) {
      onSubdivisionChange(v.slice(4) as Subdivision);
    } else if (v.startsWith('ts:')) {
      const preset = TIME_SIGNATURES.find((t) => t.label === v.slice(3));
      if (preset) {
        onBeatsChange(preset.beats);
        onSubdivisionChange(preset.subdivision);
      }
    }
  }

  return (
    <div className="relative py-1">

      {/* Beat accent circles — centered across full width */}
      <div
        className="flex items-center justify-center gap-2.5 flex-wrap min-h-[44px]"
        role="group"
        aria-label="Rhythm pattern"
      >
        {accentPattern.flatMap((isAccent, i) => {
          // Insert a line-break sentinel before beat 5 when there are more than 4 beats
          const isBreakPoint = beatsPerBar > 4 && i === 4;
          const isActive = isPlaying && currentBeat === i;
          const circle = (
            <button
              key={i}
              onClick={() => onAccentToggle(i)}
              disabled={i === 0}
              title={
                i === 0
                  ? 'Beat 1 (always accented)'
                  : isAccent
                  ? `Beat ${i + 1} — click to remove accent`
                  : `Beat ${i + 1} — click to accent`
              }
              aria-label={`Beat ${i + 1}${isAccent ? ', accented' : ''}${isActive ? ', active' : ''}`}
              aria-pressed={isAccent}
              className={[
                'w-11 h-11 rounded-full border-2 flex items-center justify-center',
                'select-none transition-all duration-75',
                isActive
                  ? 'scale-125 border-primary bg-primary shadow-[0_0_6px_2px_color-mix(in_oklch,var(--color-primary)_35%,transparent)]'
                  : isAccent
                  ? 'scale-110 border-primary bg-primary/20 hover:bg-primary/30'
                  : 'scale-100 border-border bg-transparent hover:border-primary/50',
                i === 0 ? 'cursor-default' : 'cursor-pointer',
              ].join(' ')}
            />
          );
          return isBreakPoint
            ? [<div key={`break-${i}`} className="w-full" aria-hidden="true" />, circle]
            : [circle];
        })}
      </div>

      {/* Division dropdown — absolute right, aligned with first beat row */}
      <div className="absolute right-0 top-1 h-11 flex items-center">
      <Select value={divSelectValue} onValueChange={handleDivisionChange}>
        <SelectTrigger
          className="h-11 w-auto text-sm bg-muted border-0 rounded-lg px-4"
          onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">

          {/* Section 1: direct division */}
          <SelectGroup>
            <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1">
              Division
            </SelectLabel>
            {(['quarter', 'eighth', 'triplet', 'sixteenth'] as Subdivision[]).map((s) => (
              <SelectItem key={s} value={`div:${s}`} className="text-sm">
                <NoteIcon subdivision={s} height={20} />
              </SelectItem>
            ))}
          </SelectGroup>

          <SelectSeparator />

          {/* Section 2: time signature shortcuts */}
          <SelectGroup>
            <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1">
              Time signature
            </SelectLabel>
            {TIME_SIGNATURES.map((ts) => (
              <SelectItem key={ts.label} value={`ts:${ts.label}`} className="text-sm font-bold">
                {ts.label}
              </SelectItem>
            ))}
          </SelectGroup>

        </SelectContent>
      </Select>
      </div>
    </div>
  );
}

