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

  // within 5 cents is "in tune"
  const isTuned = Math.abs(cents) < 5;
  const isTooSharp = cents >= 5;
  const isTooFlat = cents <= -5;

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
        <div className="text-3xl font-bold font-mono tracking-tighter text-foreground h-10 flex items-center">
          {targetName}
        </div>
        <div className="text-[10px] text-muted-foreground font-mono h-4 whitespace-pre">
          {currentPitch?.frequency ? `${Math.abs(Math.round(cents)).toString().padStart(2, ' ')} cents ${isTooSharp ? '♯' : isTooFlat ? '♭' : ' '}` : 'Waiting for mic...'}
        </div>
      </div>

      <div className="relative w-full flex flex-col items-center justify-center gap-2 pt-2 pb-1">
        
        {/* Tuning Direction Arrows & Lights */}
        <div className="flex items-center justify-between w-full px-6 text-xs">
          {/* Flat indicator */}
          <div className={`text-xl -mt-1 transition-colors ${currentPitch?.frequency && isTooFlat ? 'text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.8)]' : 'text-muted-foreground/20'}`}>
            ◀
          </div>
          
          {/* Tuned indicator */}
          <div className={`w-3 h-3 rounded-full transition-colors ${currentPitch?.frequency && isTuned ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]' : 'bg-muted-foreground/20'}`} />
          
          {/* Sharp indicator */}
          <div className={`text-xl -mt-1 transition-colors ${currentPitch?.frequency && isTooSharp ? 'text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.8)]' : 'text-muted-foreground/20'}`}>
            ▶
          </div>
        </div>

        {/* LED Bars */}
        <div className="flex items-end justify-center gap-[3px] h-12 w-full mt-2">
           {Array.from({ length: 21 }).map((_, i) => {
              const distance = Math.abs(i - 10);
              // Calculate height curve: center is tallest (36px), edges are shortest (8px)
              const maxH = 36;
              const minH = 8;
              const h = maxH - (distance / 10) * (maxH - minH);
              
              let isLit = false;
              let isBloom = false;
              let color = 'bg-muted-foreground/10'; // completely unlit background
              
              if (currentPitch?.frequency) {
                 // Clamp cents between -50 and 50
                 const clampedCents = Math.max(-50, Math.min(50, cents));
                 // Center is 10. Map roughly 5 cents per LED.
                 // -50 -> 0 ... 0 -> 10 ... +50 -> 20
                 const activeIndex = Math.round(clampedCents / 5) + 10;
                 
                 if (i === activeIndex) {
                   isLit = true;
                 } else if (Math.abs(i - activeIndex) === 1) {
                   isBloom = true;
                 }

                 if (isLit) {
                    color = isTuned ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,1)]';
                 } else if (isBloom) {
                    color = isTuned ? 'bg-emerald-500/50' : 'bg-amber-500/50';
                 }
              }
              
              // Render the center dot slightly visible when idle, to give orientation
              if (!isLit && !isBloom && i === 10) {
                 color = 'bg-muted-foreground/30';
              }

              return (
                 <div 
                   key={i} 
                   className={`w-1.5 rounded-sm transition-all duration-75 ${color}`} 
                   style={{ height: `${h}px` }} 
                 />
              );
           })}
        </div>
        
        {/* Tick labels */}
        <div className="w-full flex justify-between px-1 mt-1 text-[9px] text-muted-foreground/50 font-mono">
          <span>-50</span>
          <span>0</span>
          <span>+50</span>
        </div>

      </div>
    </div>
  );
}
