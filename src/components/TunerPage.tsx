import { useEffect, useRef, useState } from 'react';
import Tuner from './Tuner';
import type { PitchResult } from '../audio/pitchDetector';
import { Mic } from 'lucide-react';

export interface TunerPageProps {
  /** Global audio session properties (already running or not) */
  isListening?: boolean;
  currentPitch?: PitchResult | null;
  audioStart?: () => Promise<void>;
  audioError?: string | null;
}

export default function TunerPage({ isListening: globalListening, currentPitch: globalPitch, audioStart, audioError }: TunerPageProps) {
  const hasAutoStartedRef = useRef(false);
  const [autoStartAttempted, setAutoStartAttempted] = useState(false);

  useEffect(() => {
    if (!hasAutoStartedRef.current && audioStart && !globalListening) {
      hasAutoStartedRef.current = true;
      audioStart().finally(() => {
        setAutoStartAttempted(true);
      });
    }
  }, [audioStart, globalListening]);

  const isListening = globalListening ?? false;
  const currentPitch = globalPitch ?? null;

  return (
    <div className="flex-1 flex flex-col items-center justify-start pt-8 p-8 bg-zinc-900 overflow-y-auto">
      <div className="w-full max-w-2xl">
        {/* Status chip */}
        <div className="flex justify-center mb-6">
          {audioError ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-red-800/50 bg-red-900/20 text-[10px] font-mono tracking-[0.2em] text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              MIC NEEDED
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-800 text-[10px] font-mono tracking-[0.2em] text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              LISTENING&hellip;
            </div>
          )}
        </div>

        {!isListening && (
          <div className="text-center mb-8">
            <p className="text-5xl font-medium tracking-tight leading-tight text-zinc-100 mb-4">
              {audioError
                ? <>Let us <em className="text-primary font-normal italic">listen</em>.</>
                : <>Pluck a <em className="text-primary font-normal italic">string</em>.</>}
            </p>
            <p className="text-sm leading-[1.65] text-zinc-500 max-w-[440px] mx-auto">
              Make sure your bass is plugged in, or your microphone isn&apos;t muted. The tuner will pick up the closest note automatically.
            </p>
          </div>
        )}

        {/* Tuner — always rendered so layout doesn't jump */}
        <Tuner currentPitch={currentPitch} />

        {/* Microphone action — only when not yet listening */}
        {!isListening && (
          <div className="flex flex-col items-center gap-3 mt-8">
            <button
              onClick={audioStart}
              disabled={autoStartAttempted && !isListening && !audioError}
              className="inline-flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground rounded-full font-medium transition-colors"
            >
              <Mic size={20} />
              {autoStartAttempted ? 'Enable Microphone' : 'Start Listening'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
