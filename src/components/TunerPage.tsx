import { useEffect, useState } from 'react';
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
  const [autoStartAttempted, setAutoStartAttempted] = useState(false);

  /**
   * On mount, attempt to auto-start the microphone.
   * If the browser denies autoplay or permissions, we'll show a fallback button.
   */
  useEffect(() => {
    if (!autoStartAttempted && audioStart && !globalListening) {
      setAutoStartAttempted(true);
      audioStart().catch(() => {
        // Silently catch errors — we'll show the button instead
      });
    }
  }, [audioStart, globalListening, autoStartAttempted]);

  const isListening = globalListening ?? false;
  const currentPitch = globalPitch ?? null;

  return (
    <div className="flex-1 flex flex-col items-center justify-start pt-12 p-8 bg-gradient-to-br from-background to-muted/50">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="space-y-2 text-center">
          <p className="text-sm text-muted-foreground">
            {isListening ? 'listening to your instrument...' : 'Enable microphone to start tuning'}
          </p>
        </div>

        {/* Tuner Component */}
        <div>
          <Tuner currentPitch={currentPitch} />
        </div>

        {/* Microphone Status & Fallback */}
        {!isListening && (
          <div className="space-y-3 text-center">
            {audioError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                {audioError}
              </div>
            )}

            <button
              onClick={audioStart}
              disabled={autoStartAttempted && !isListening && !audioError}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground rounded-lg font-medium transition-colors"
            >
              <Mic size={20} />
              {autoStartAttempted ? 'Enable Microphone' : 'Start Listening'}
            </button>

            {!audioError && (
              <p className="text-xs text-muted-foreground">
                Click the button above or check your browser's microphone permissions
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
