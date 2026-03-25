import { useState, useMemo } from 'react';
import type { PitchResult } from '../audio/pitchDetector';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface TunerProps {
  currentPitch?: PitchResult | null;
}

type Tuning = {
  name: string;
  notes: { name: string; freq: number }[];
};

const TUNINGS: Record<string, Tuning> = {
  standard4: {
    name: 'Standard (EADG)',
    notes: [
      { name: 'E1', freq: 41.20 },
      { name: 'A1', freq: 55.00 },
      { name: 'D2', freq: 73.42 },
      { name: 'G2', freq: 98.00 },
    ],
  },
  dropD: {
    name: 'Drop D (DADG)',
    notes: [
      { name: 'D1', freq: 36.71 },
      { name: 'A1', freq: 55.00 },
      { name: 'D2', freq: 73.42 },
      { name: 'G2', freq: 98.00 },
    ],
  },
  standard5: {
    name: '5-String (BEADG)',
    notes: [
      { name: 'B0', freq: 30.87 },
      { name: 'E1', freq: 41.20 },
      { name: 'A1', freq: 55.00 },
      { name: 'D2', freq: 73.42 },
      { name: 'G2', freq: 98.00 },
    ],
  },
  chromatic: {
    name: 'Chromatic',
    notes: [], // Chromatic mode doesn't lock to specific strings
  },
};

/** Calculate cents difference between two frequencies */
function getCents(freq: number, targetFreq: number): number {
  return 1200 * Math.log2(freq / targetFreq);
}

/** Get exact frequency of a MIDI note */
function getMidiFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export default function Tuner({ currentPitch }: TunerProps) {
  const [tuningKey, setTuningKey] = useState<keyof typeof TUNINGS>('standard4');
  const tuning = TUNINGS[tuningKey];

  // Derive target note and cents
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

    // Find the closest string in the selected tuning
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

  // Visuals for the tuner needle
  // Clamp cents between -50 and 50 for display
  const clampedCents = Math.max(-50, Math.min(50, cents));
  // Map -50..+50 to 0..100% position
  const needleLeft = `${50 + clampedCents}%`;

  const isTuned = Math.abs(cents) < 5; // within 5 cents is "in tune"
  const isTooSharp = cents >= 5;
  const isTooFlat = cents <= -5;

  let statusColor = 'bg-muted';
  if (currentPitch?.frequency) {
    statusColor = isTuned ? 'bg-emerald-500' : isTooSharp ? 'bg-rose-500' : 'bg-amber-500';
  }

  return (
    <div className="bg-muted/30 p-3 rounded-lg border border-border space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-foreground">Tuner</Label>
        <Select value={tuningKey} onValueChange={setTuningKey}>
          <SelectTrigger className="h-6 w-32 text-xs border-border bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TUNINGS).map(([key, t]) => (
              <SelectItem key={key} value={key} className="text-xs">
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col items-center gap-1">
        <div className="text-2xl font-bold font-mono tracking-tighter text-foreground h-8 flex items-center">
          {targetName}
        </div>
        <div className="text-[10px] text-muted-foreground font-mono h-4 whitespace-pre">
          {currentPitch?.frequency ? `${Math.abs(Math.round(cents)).toString().padStart(2, ' ')} cents ${isTooSharp ? '♯' : isTooFlat ? '♭' : ' '}` : 'Waiting for mic...'}
        </div>
      </div>

      <div className="relative w-full h-8 flex items-center justify-center">
        {/* Track */}
        <div className="absolute w-full h-1 bg-muted rounded-full overflow-hidden">
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-foreground/20 -translate-x-1/2" />
        </div>
        
        {/* Tick marks */}
        <div className="absolute w-full flex justify-between px-1 top-0 text-[8px] text-muted-foreground/50">
          <span>-50</span>
          <span>0</span>
          <span>+50</span>
        </div>

        {/* Needle */}
        {currentPitch?.frequency && (
          <div
            className={`absolute top-0 bottom-0 w-1 flex flex-col items-center transition-all duration-75`}
            style={{ left: needleLeft, transform: 'translateX(-50%)' }}
          >
            <div className={`w-0.5 h-full rounded-full ${statusColor}`} />
          </div>
        )}
      </div>
    </div>
  );
}
