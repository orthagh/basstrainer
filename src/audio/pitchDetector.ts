/**
 * PitchDetector – Wraps pitchfinder's YIN algorithm for bass frequency detection.
 *
 * Produces: frequency (Hz), MIDI note number, note name, and RMS level.
 */

import { YIN } from 'pitchfinder';

export interface PitchResult {
  /** Detected fundamental frequency in Hz, or null if no pitch found. */
  frequency: number | null;
  /** MIDI note number (e.g. 28 = E1, 40 = E2). Null if no pitch. */
  midi: number | null;
  /** Human-readable note name (e.g. "E2", "A1"). Null if no pitch. */
  noteName: string | null;
  /** RMS level of the buffer (0..1 range). Useful for silence gating. */
  rms: number;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Convert frequency (Hz) to the nearest MIDI note number.
 * A4 = 440 Hz = MIDI 69.
 */
export function frequencyToMidi(freq: number): number {
  return Math.round(12 * Math.log2(freq / 440) + 69);
}

/**
 * Convert MIDI note number to human-readable name.
 */
export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

/**
 * Calculate RMS (root mean square) level of a buffer.
 */
function calcRms(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

export class PitchDetector {
  private detect: (buf: Float32Array) => number | null;
  private silenceThreshold: number;

  /**
   * @param sampleRate – The audio context sample rate.
   * @param silenceThreshold – RMS below this is considered silence (default 0.01).
   */
  constructor(sampleRate: number, silenceThreshold = 0.01) {
    this.silenceThreshold = silenceThreshold;

    // YIN is excellent for monophonic bass — robust with low frequencies.
    // Threshold: lower = more selective (fewer false positives).
    this.detect = YIN({
      sampleRate,
      threshold: 0.15,
      probabilityThreshold: 0.1,
    });
  }

  /**
   * Analyse a time-domain audio buffer and return pitch information.
   */
  analyse(buffer: Float32Array): PitchResult {
    const rms = calcRms(buffer);

    // Gate: if the signal is too quiet, skip detection
    if (rms < this.silenceThreshold) {
      return { frequency: null, midi: null, noteName: null, rms };
    }

    const frequency = this.detect(buffer);

    if (frequency == null || frequency < 20 || frequency > 1200) {
      // Out of bass range or no pitch found
      return { frequency: null, midi: null, noteName: null, rms };
    }

    const midi = frequencyToMidi(frequency);
    const noteName = midiToNoteName(midi);

    return { frequency, midi, noteName, rms };
  }
}
