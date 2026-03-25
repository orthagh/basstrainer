/**
 * useDemoMode – Simulates mic input by generating fake DetectedNote events
 * that follow the expected score, with randomised timing/pitch offsets.
 *
 * When demo mode is active, it polls the current score position and, for each
 * expected note whose time has passed, generates a DetectedNote with:
 *   • ~70 % perfect hits (small timing jitter, exact pitch)
 *   • ~15 % timing-off hits (larger offset, exact pitch)
 *   • ~10 % pitch-off hits (small timing, wrong pitch by 1–2 semitones)
 *   •  ~5 % misses (note skipped entirely)
 *
 * This lets the user preview the visual feedback overlay without a bass plugged in.
 */

import { useRef, useState, useEffect } from 'react';
import { midiToNoteName } from '../audio/pitchDetector';
import type { TimedNote } from '../audio/noteExtractor';
import type { DetectedNote } from '../audio/audioAnalyser';
import type { PitchResult } from '../audio/pitchDetector';

export interface UseDemoModeOptions {
  expectedNotes: TimedNote[];
  isPlaying: boolean;
  enabled: boolean;
  scorePositionRef: React.RefObject<number>;
}

export interface UseDemoModeReturn {
  /** Simulated last detected note (same shape as real mic). */
  lastNote: DetectedNote | null;
  /** Simulated current pitch result. */
  currentPitch: PitchResult;
  /** Whether demo is actively producing notes. */
  isActive: boolean;
}

/** Convert MIDI note number → frequency. */
function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

function randomGaussian(): number {
  // Box-Muller transform for a roughly normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1 || 0.0001)) * Math.cos(2 * Math.PI * u2);
}

export function useDemoMode(options: UseDemoModeOptions): UseDemoModeReturn {
  const { expectedNotes, isPlaying, enabled, scorePositionRef } = options;

  const [lastNote, setLastNote] = useState<DetectedNote | null>(null);
  const [currentPitch, setCurrentPitch] = useState<PitchResult>({
    frequency: null,
    midi: null,
    noteName: null,
    rms: 0,
  });

  // Track which notes we've already "played"
  const playedIndicesRef = useRef<Set<number>>(new Set());
  const startTimeRef = useRef(0);

  // Reset when playback starts or exercise changes
  useEffect(() => {
    if (isPlaying && enabled) {
      playedIndicesRef.current = new Set();
      startTimeRef.current = performance.now();
      setLastNote(null);
      setCurrentPitch({ frequency: null, midi: null, noteName: null, rms: 0 });
    }
  }, [isPlaying, enabled, expectedNotes]);

  // Polling loop — check score position and emit simulated notes
  useEffect(() => {
    if (!isPlaying || !enabled || expectedNotes.length === 0) return;

    const interval = setInterval(() => {
      const posMs = scorePositionRef.current;

      for (let i = 0; i < expectedNotes.length; i++) {
        if (playedIndicesRef.current.has(i)) continue;

        const note = expectedNotes[i];
        // Only trigger notes whose start time has passed (with a small look-ahead)
        if (posMs < note.startMs - 10) continue;
        // Don't trigger notes too far in the past
        if (posMs > note.startMs + 150) {
          playedIndicesRef.current.add(i); // mark as skipped/missed
          continue;
        }

        playedIndicesRef.current.add(i);

        const roll = Math.random();

        if (roll < 0.05) {
          // ~5 % miss — don't emit anything
          continue;
        }

        // Determine timing offset
        let timingJitterMs: number;
        let midiOffset = 0;

        if (roll < 0.20) {
          // ~15 % timing-off hit: larger jitter (30–80 ms early or late)
          timingJitterMs = (30 + Math.random() * 50) * (Math.random() < 0.5 ? -1 : 1);
        } else if (roll < 0.30) {
          // ~10 % pitch-off hit: small timing but wrong pitch
          timingJitterMs = randomGaussian() * 10;
          midiOffset = Math.random() < 0.5 ? 1 : -1;
          if (Math.random() < 0.3) midiOffset *= 2; // occasionally 2 semitones
        } else {
          // ~70 % perfect hit: small timing jitter
          timingJitterMs = randomGaussian() * 8;
        }

        const detectedMidi = note.midi + midiOffset;
        const detectedFreq = midiToFreq(detectedMidi);
        const noteName = midiToNoteName(detectedMidi);
        const rms = 0.3 + Math.random() * 0.4; // plausible RMS

        const detected: DetectedNote = {
          midi: detectedMidi,
          frequency: detectedFreq,
          noteName,
          time: (performance.now() - startTimeRef.current) / 1000,
          rms,
        };

        // Update pitch display (simulates the live meter)
        setCurrentPitch({
          frequency: detectedFreq,
          midi: detectedMidi,
          noteName,
          rms,
        });

        // Emit with a small delay matching the timing jitter
        const delay = Math.max(0, timingJitterMs);
        if (delay < 5) {
          setLastNote(detected);
        } else {
          setTimeout(() => setLastNote(detected), delay);
        }
      }
    }, 30); // poll every 30 ms for responsive detection

    return () => clearInterval(interval);
  }, [isPlaying, enabled, expectedNotes, scorePositionRef]);

  return {
    lastNote: enabled && isPlaying ? lastNote : null,
    currentPitch,
    isActive: enabled && isPlaying,
  };
}
