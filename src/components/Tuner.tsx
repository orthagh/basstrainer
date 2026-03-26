import { useState, useMemo } from 'react';
import type { PitchResult } from '../audio/pitchDetector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';

export interface TunerProps {
  currentPitch?: PitchResult | null;
}

type Tuning = {
  name: string;
  notes: { name: string; freq: number }[];
};

const TUNINGS: Record<string, Tuning> = {
  // ── Bass Tunings ──
  bass_standard4: {
    name: 'Bass - Standard (EADG)',
    notes: [
      { name: 'E1', freq: 41.20 },
      { name: 'A1', freq: 55.00 },
      { name: 'D2', freq: 73.42 },
      { name: 'G2', freq: 98.00 },
    ],
  },
  bass_dropD: {
    name: 'Bass - Drop D (DADG)',
    notes: [
      { name: 'D1', freq: 36.71 },
      { name: 'A1', freq: 55.00 },
      { name: 'D2', freq: 73.42 },
      { name: 'G2', freq: 98.00 },
    ],
  },
  bass_standard5: {
    name: 'Bass - 5-String (BEADG)',
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
    notes: [],
  },
};

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

  const isTuned = Math.abs(cents) < 5;

  return (
    <div className="bg-card p-3 rounded-lg border border-border space-y-4">
      <div className="flex items-center justify-center">
        <Select value={tuningKey} onValueChange={setTuningKey}>
          <SelectTrigger className="h-8 w-56 text-sm border-border bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel className="text-xs font-semibold">Bass</SelectLabel>
              {Object.entries(TUNINGS)
                .filter(([key]) => key.startsWith('bass_'))
                .map(([key, t]) => (
                  <SelectItem key={key} value={key} className="text-sm">
                    {t.name.replace('Bass - ', '')}
                  </SelectItem>
                ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel className="text-xs font-semibold">Guitar</SelectLabel>
              {Object.entries(TUNINGS)
                .filter(([key]) => key.startsWith('guitar_'))
                .map(([key, t]) => (
                  <SelectItem key={key} value={key} className="text-sm">
                    {t.name.replace('Guitar - ', '')}
                  </SelectItem>
                ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel className="text-xs font-semibold">Other</SelectLabel>
              {Object.entries(TUNINGS)
                .filter(([key]) => !key.startsWith('bass_') && !key.startsWith('guitar_'))
                .map(([key, t]) => (
                  <SelectItem key={key} value={key} className="text-sm">
                    {t.name}
                  </SelectItem>
                ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="relative w-full flex flex-col items-center justify-center gap-2 pt-2 pb-1">
        {/* PolyTune-style LED Bars — hang from top, V-shape pointing down */}
        <div className="flex items-start justify-center gap-[5px] h-50 w-full">
           {Array.from({ length: 11 }).map((_, i) => {
              const center = 5;
              const distance = Math.abs(i - center);
              const maxH = 160;
              const minH = 28;
              const h = maxH - (distance / center) * (maxH - minH);

              let barStyle = '';
              let style: React.CSSProperties = { height: `${h}px` };

              if (currentPitch?.frequency) {
                // Map cents to bar index: -50→0, 0→5, +50→10
                const clampedCents = Math.max(-50, Math.min(50, cents));
                const activeIndex = Math.round((clampedCents / 50) * center) + center;
                const dist = Math.abs(i - activeIndex);

                if (dist === 0) {
                  if (isTuned) {
                    barStyle = 'bg-emerald-400';
                    style = {
                      ...style,
                      boxShadow: '0 0 8px 4px rgba(52,211,153,0.9), 0 0 22px 8px rgba(52,211,153,0.55), 0 0 40px 12px rgba(52,211,153,0.25)',
                    };
                  } else {
                    barStyle = 'bg-amber-400';
                    style = {
                      ...style,
                      boxShadow: '0 0 8px 4px rgba(251,191,36,0.9), 0 0 22px 8px rgba(251,191,36,0.55), 0 0 40px 12px rgba(251,191,36,0.25)',
                    };
                  }
                } else if (dist === 1) {
                  barStyle = isTuned ? 'bg-emerald-500/60' : 'bg-amber-500/60';
                  style = {
                    ...style,
                    boxShadow: isTuned
                      ? '0 0 5px 3px rgba(52,211,153,0.35), 0 0 12px 5px rgba(52,211,153,0.15)'
                      : '0 0 5px 3px rgba(251,191,36,0.35), 0 0 12px 5px rgba(251,191,36,0.15)',
                  };
                } else {
                  barStyle = 'bg-muted-foreground/10';
                }
              } else {
                barStyle = i === center ? 'bg-muted-foreground/25' : 'bg-muted-foreground/10';
              }

              return (
                <div
                  key={i}
                  className={`w-6 rounded-sm transition-all duration-75 ${barStyle}`}
                  style={style}
                />
              );
           })}
        </div>
        {/* Note label — below bars */}
        <div className="flex flex-col items-center justify-center h-24 mb-4">
           <div 
             className="text-[100px] text-[#6b6354]"
             style={{ 
               fontFamily: "'DSEG14-Classic', monospace",
               fontStyle: "italic",
               textShadow: "0 0 12px rgba(107, 99, 84, 0.8), 0 0 24px rgba(107, 99, 84, 0.4)"
             }}
           >
             {currentPitch?.frequency ? targetName.replace(/\d+$/, '') : '-'}
           </div>
        </div>      </div>
    </div>
  );
}
