/**
 * MicFeedbackDisplay — Toolbar widget showing live microphone feedback.
 *
 * Same visual footprint as BpmDisplay (big number + sublabel).
 * Shows detected note name, frequency, and a small RMS level bar.
 */

import type { PitchResult } from '../audio/pitchDetector';

interface MicFeedbackDisplayProps {
  currentPitch: PitchResult;
}

export default function MicFeedbackDisplay({ currentPitch }: MicFeedbackDisplayProps) {
  const { noteName, frequency, rms } = currentPitch;
  const levelPct = Math.min(rms * 500, 100);

  return (
    <div 
      className="flex flex-col items-center select-none min-w-[4.5ch]" 
      role="status" 
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Detected pitch: ${noteName ?? 'none'}`}
    >
      {/* Detected note — same size as BPM number */}
      <span className="text-3xl font-extrabold tabular-nums tracking-tighter text-foreground leading-none" aria-hidden="true">
        {noteName ?? '—'}
      </span>

      {/* Sublabel: frequency */}
      <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground leading-none mt-0.5 font-mono tabular-nums" aria-hidden="true">
        {frequency ? `${frequency.toFixed(0)} Hz` : 'MIC'}
      </span>

      {/* Tiny level bar */}
      <div 
        className="w-full h-[3px] bg-secondary rounded-full overflow-hidden mt-1"
        role="progressbar"
        aria-label="Microphone input level"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(levelPct)}
      >
        <div
          className="h-full bg-emerald-400 rounded-full transition-all duration-75"
          style={{ width: `${levelPct}%` }}
        />
      </div>
    </div>
  );
}
