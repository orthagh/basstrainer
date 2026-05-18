import { useState, useMemo, useLayoutEffect, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { PitchResult } from '../audio/pitchDetector';

export interface TunerProps {
  currentPitch?: PitchResult | null;
}

type Tuning = {
  name: string;
  label: string;
  notes: { name: string; freq: number }[];
};

const TUNINGS: Record<string, Tuning> = {
  // ── Bass Tunings ──
  bass_standard4: {
    name: 'Bass - Standard (EADG)',
    label: 'Standard',
    notes: [
      { name: 'E1', freq: 41.20 },
      { name: 'A1', freq: 55.00 },
      { name: 'D2', freq: 73.42 },
      { name: 'G2', freq: 98.00 },
    ],
  },
  bass_dropD: {
    name: 'Bass - Drop D (DADG)',
    label: 'Drop D',
    notes: [
      { name: 'D1', freq: 36.71 },
      { name: 'A1', freq: 55.00 },
      { name: 'D2', freq: 73.42 },
      { name: 'G2', freq: 98.00 },
    ],
  },
  bass_standard5: {
    name: 'Bass - 5-String (BEADG)',
    label: '5-String',
    notes: [
      { name: 'B0', freq: 30.87 },
      { name: 'E1', freq: 41.20 },
      { name: 'A1', freq: 55.00 },
      { name: 'D2', freq: 73.42 },
      { name: 'G2', freq: 98.00 },
    ],
  },
  // ── Guitar Tunings ──
  guitar_standard: {
    name: 'Guitar - Standard (EADGBE)',
    label: 'Standard',
    notes: [
      { name: 'E2', freq: 82.41 },
      { name: 'A2', freq: 110.00 },
      { name: 'D3', freq: 146.83 },
      { name: 'G3', freq: 196.00 },
      { name: 'B3', freq: 246.94 },
      { name: 'E4', freq: 329.63 },
    ],
  },
  guitar_dropD: {
    name: 'Guitar - Drop D (DADGBE)',
    label: 'Drop D',
    notes: [
      { name: 'D2', freq: 73.42 },
      { name: 'A2', freq: 110.00 },
      { name: 'D3', freq: 146.83 },
      { name: 'G3', freq: 196.00 },
      { name: 'B3', freq: 246.94 },
      { name: 'E4', freq: 329.63 },
    ],
  },
  guitar_halfStepDown: {
    name: 'Guitar - Half Step Down (D#G#C#F#A#D#)',
    label: '½ Step Down',
    notes: [
      { name: 'D#2', freq: 77.78 },
      { name: 'G#2', freq: 103.83 },
      { name: 'C#3', freq: 138.59 },
      { name: 'F#3', freq: 184.99 },
      { name: 'A#3', freq: 233.08 },
      { name: 'D#4', freq: 311.13 },
    ],
  },
  chromatic: {
    name: 'Chromatic',
    label: 'Chromatic',
    notes: [],
  },
};

const SEGMENTS: { label: string; key: keyof typeof TUNINGS }[] = [
  { label: '4-STRING',  key: 'bass_standard4' },
  { label: '5-STRING',  key: 'bass_standard5' },
  { label: 'DROP D',    key: 'bass_dropD' },
  { label: 'CHROMATIC', key: 'chromatic' },
];

const OVERFLOW_KEYS: (keyof typeof TUNINGS)[] = [
  'guitar_standard',
  'guitar_dropD',
  'guitar_halfStepDown',
];

function getCents(freq: number, targetFreq: number): number {
  return 1200 * Math.log2(freq / targetFreq);
}

function getMidiFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export default function Tuner({ currentPitch }: TunerProps) {
  const [tuningKey, setTuningKey] = useState<keyof typeof TUNINGS>('bass_standard4');
  const tuning = TUNINGS[tuningKey];

  const segmentRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const overflowRef = useRef<HTMLButtonElement | null>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const overflowActive = OVERFLOW_KEYS.includes(tuningKey as keyof typeof TUNINGS);
    const el = overflowActive
      ? overflowRef.current
      : (segmentRefs.current[SEGMENTS.findIndex((s) => s.key === tuningKey)] ?? null);
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
  }, [tuningKey]);

  const { targetName, cents } = useMemo(() => {
    if (!currentPitch || !currentPitch.frequency) {
      return { targetName: '--', cents: 0 };
    }

    if (tuningKey === 'chromatic') {
      if (!currentPitch.midi || !currentPitch.noteName) {
        return { targetName: '--', cents: 0 };
      }
      const targetFreq = getMidiFreq(currentPitch.midi);
      return {
        targetName: currentPitch.noteName,
        cents: getCents(currentPitch.frequency, targetFreq),
      };
    }

    let closestString = tuning.notes[0];
    let minCentsAbs = Infinity;
    let closestCents = 0;

    for (const note of tuning.notes) {
      const c = getCents(currentPitch.frequency, note.freq);
      if (Math.abs(c) < minCentsAbs) {
        minCentsAbs = Math.abs(c);
        closestString = note;
        closestCents = c;
      }
    }

    return {
      targetName: closestString.name,
      cents: closestCents,
    };
  }, [currentPitch, tuning, tuningKey]);

  const hasSignal = !!currentPitch?.frequency;
  const glow = hasSignal ? Math.max(0, 1 - Math.min(Math.abs(cents), 20) / 20) : 0;
  const inTune = hasSignal && Math.abs(cents) < 3;
  const accentColor = inTune ? 'rgb(52 211 153)' : 'rgb(251 191 36)';

  const noteLetter = hasSignal ? targetName.replace(/\d+$/, '') : '—';
  const noteOctave = hasSignal ? (targetName.match(/\d+$/) ?? [''])[0] : '';

  const clampedCents = Math.max(-50, Math.min(50, cents));

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Tuning picker — segmented control */}
      <div className="relative inline-flex gap-1 p-1 rounded-lg border border-zinc-800 bg-zinc-900">
        {/* Sliding active indicator */}
        {pill && (
          <div
            className="absolute top-1 bottom-1 rounded-md bg-zinc-800/70 border border-zinc-700 pointer-events-none"
            style={{
              left: pill.left,
              width: pill.width,
              transition: 'left 180ms cubic-bezier(0.4,0,0.2,1), width 180ms cubic-bezier(0.4,0,0.2,1)',
            }}
          />
        )}

        {SEGMENTS.map(({ label, key }, i) => {
          const active = tuningKey === key;
          return (
            <button
              key={key}
              ref={(el) => { segmentRefs.current[i] = el; }}
              onClick={() => setTuningKey(key)}
              className={[
                'relative px-3.5 py-2 rounded-md font-mono text-[11px] tracking-[0.12em] transition-colors',
                active ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-200',
              ].join(' ')}
            >
              {label}
            </button>
          );
        })}

        {/* Overflow — guitar tunings */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              ref={overflowRef}
              className={[
                'relative px-3.5 py-2 rounded-md font-mono text-[11px] tracking-[0.12em] transition-colors',
                OVERFLOW_KEYS.includes(tuningKey as keyof typeof TUNINGS)
                  ? 'text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-200',
              ].join(' ')}
            >
              •••
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-1 bg-zinc-900 border-zinc-800" align="center" sideOffset={8}>
            {OVERFLOW_KEYS.map((key) => {
              const active = tuningKey === key;
              return (
                <button
                  key={key}
                  onClick={() => setTuningKey(key)}
                  className={[
                    'w-full px-3 py-2 rounded-md text-left font-mono text-[11px] tracking-[0.12em] transition-colors',
                    active
                      ? 'bg-zinc-800/70 text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800',
                  ].join(' ')}
                >
                  {TUNINGS[key].label}
                </button>
              );
            })}
          </PopoverContent>
        </Popover>
      </div>

      {/* Main display */}
      <div className="relative flex flex-col items-center gap-8 w-full overflow-hidden py-4">
        {/* Ambient background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 60% 50% at center, ${accentColor} 0%, transparent 55%)`,
            opacity: glow * 0.15,
            transition: 'opacity 120ms ease-out',
          }}
        />

        {/* Large note display */}
        <div className="relative flex items-end justify-center gap-1 leading-none select-none">
          <span
            className="font-mono text-zinc-100"
            style={{
              fontSize: 'clamp(120px, 16vw, 240px)',
              lineHeight: 1,
              opacity: hasSignal ? 1 : 0.35,
              textShadow: hasSignal ? `0 0 ${20 + glow * 80}px ${accentColor}` : 'none',
              transition: 'text-shadow 120ms ease-out, opacity 200ms ease-out',
            }}
          >
            {noteLetter}
          </span>
          {noteOctave && (
            <span
              className="font-mono text-zinc-100"
              style={{
                fontSize: 'clamp(40px, 5vw, 72px)',
                lineHeight: 1,
                marginBottom: 'clamp(12px, 1.5vw, 24px)',
                opacity: 0.7,
                textShadow: `0 0 ${20 + glow * 80}px ${accentColor}`,
                transition: 'text-shadow 120ms ease-out',
              }}
            >
              {noteOctave}
            </span>
          )}
        </div>

        {/* Horizontal pitch strip */}
        <div className="relative w-full max-w-[800px] px-2">
          <div className="relative w-full" style={{ height: '64px' }}>
            {/* 41 graduation ticks */}
            {Array.from({ length: 41 }).map((_, i) => {
              const isCenter = i === 20;
              const isMajor = i % 5 === 0;
              const tickH = isMajor ? 32 : 16;
              const tickW = isCenter ? 3 : isMajor ? 2 : 1;
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${(i / 40) * 100}%`,
                    bottom: 0,
                    transform: 'translateX(-50%)',
                    width: `${tickW}px`,
                    height: `${tickH}px`,
                    backgroundColor: isCenter
                      ? accentColor
                      : isMajor
                        ? 'rgba(161,161,170,0.35)'
                        : 'rgba(161,161,170,0.12)',
                    borderRadius: '1px',
                  }}
                />
              );
            })}

            {/* ±3¢ in-tune zone lines */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: `calc(50% + ${3 * 6}px)`,
                transform: 'translateX(-50%)',
                width: '1px',
                height: '40px',
                backgroundColor: accentColor,
                opacity: 0.25,
                transition: 'background-color 120ms ease-out',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: `calc(50% - ${3 * 6}px)`,
                transform: 'translateX(-50%)',
                width: '1px',
                height: '40px',
                backgroundColor: accentColor,
                opacity: 0.25,
                transition: 'background-color 120ms ease-out',
              }}
            />

            {/* Needle */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: `calc(50% + ${clampedCents * 6}px)`,
                transform: 'translateX(-50%)',
                width: inTune ? '6px' : '4px',
                height: '56px',
                backgroundColor: accentColor,
                borderRadius: '2px',
                boxShadow: hasSignal ? `0 0 ${12 + glow * 40}px ${accentColor}` : 'none',
                transition: 'left 80ms ease-out, box-shadow 120ms ease-out, width 120ms ease-out, background-color 120ms ease-out',
              }}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
