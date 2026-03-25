/**
 * useAudioInput – React hook for microphone-based pitch & onset detection.
 *
 * Wraps AudioAnalyser in React lifecycle with clean start/stop semantics.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { AudioAnalyser, type DetectedNote } from '../audio/audioAnalyser';
import type { PitchResult } from '../audio/pitchDetector';

export interface AudioInputState {
  /** Whether the microphone is active. */
  isListening: boolean;
  /** Most recent pitch detection result (updated ~60fps). */
  currentPitch: PitchResult;
  /** All notes detected since listening started. */
  detectedNotes: DetectedNote[];
  /** The last detected note (handy for UI display). */
  lastNote: DetectedNote | null;
  /** Start microphone capture and analysis. */
  start: () => Promise<void>;
  /** Stop capture and analysis. */
  stop: () => void;
  /** Toggle start/stop. */
  toggle: () => Promise<void>;
  /** Error message if mic access failed. */
  error: string | null;
}

export function useAudioInput(): AudioInputState {
  const analyserRef = useRef<AudioAnalyser | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [currentPitch, setCurrentPitch] = useState<PitchResult>({
    frequency: null,
    midi: null,
    noteName: null,
    rms: 0,
  });
  const [detectedNotes, setDetectedNotes] = useState<DetectedNote[]>([]);
  const [lastNote, setLastNote] = useState<DetectedNote | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    try {
      setError(null);

      const analyser = new AudioAnalyser({
        onPitch: (pitch) => {
          setCurrentPitch(pitch);
        },
        onNote: (note) => {
          setLastNote(note);
          setDetectedNotes((prev) => [...prev, note]);
        },
      });

      analyserRef.current = analyser;
      await analyser.start();
      setIsListening(true);
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone access denied. Please allow microphone permissions.'
          : `Microphone error: ${err instanceof Error ? err.message : String(err)}`;
      setError(msg);
      setIsListening(false);
    }
  }, []);

  const stop = useCallback(() => {
    analyserRef.current?.stop();
    analyserRef.current = null;
    setIsListening(false);
  }, []);

  const toggle = useCallback(async () => {
    if (isListening) {
      stop();
    } else {
      await start();
    }
  }, [isListening, start, stop]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      analyserRef.current?.stop();
      analyserRef.current = null;
    };
  }, []);

  return {
    isListening,
    currentPitch,
    detectedNotes,
    lastNote,
    start,
    stop,
    toggle,
    error,
  };
}
