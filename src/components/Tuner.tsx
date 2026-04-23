import { useState, useMemo } from 'react';
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

const TUNING_GROUPS = [
  { label: 'BASS',   keys: ['bass_standard4', 'bass_dropD', 'bass_standard5'] },
  { label: 'GUITAR', keys: ['guitar_standard', 'guitar_dropD', 'guitar_halfStepDown'] },
  { label: 'OTHER',  keys: ['chromatic'] },
] as const;

function getCents(freq: number, targetFreq: number): number {
  return 1200 * Math.log2(freq / targetFreq);
}

function getMidiFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export default function Tuner({ currentPitch }: TunerProps) {
  const [tuningKey, setTuningKey] = useState<keyof typeof TUNINGS>('bass_standard4');
  const tuning = TUNINGS[tuningKey];

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
      {/* Tuning picker — grouped pill radio buttons */}
      <div className="flex flex-wrap items-start justify-center gap-x-6 gap-y-4">
        {TUNING_GROUPS.map((group, gi) => (
          <div key={group.label} className="flex items-start gap-x-6">
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-mono tracking-[0.18em] text-zinc-500 select-none">
                {group.label}
              </span>
              <div className="flex gap-1">
                {group.keys.map((key) => {
                  const selected = tuningKey === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setTuningKey(key)}
                      className={[
                        'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
                        selected
                          ? 'bg-zinc-600 text-zinc-100 border-zinc-500'
                          : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:border-zinc-700',
                      ].join(' ')}
                    >
                      {TUNINGS[key].label}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Vertical divider between groups */}
            {gi < TUNING_GROUPS.length - 1 && (
              <div className="mt-5 w-px h-6 bg-zinc-700 self-center" />
            )}
          </div>
        ))}
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

          {/* Cents readout */}
          <div className="mt-2 text-center text-xs font-mono text-zinc-500">
            {hasSignal ? `${cents >= 0 ? '+' : ''}${Math.round(cents)}¢` : '0¢'}
          </div>
        </div>
      </div>
    </div>
  );
}
