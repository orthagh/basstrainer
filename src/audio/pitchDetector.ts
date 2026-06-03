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

/**
 * Decimation factor applied before pitch detection. YIN's cost grows with the
 * square of the buffer length, so running it on a full 8192-sample frame is
 * ~250 ms — far too slow for a smooth ~60 fps readout. Bass fundamentals live
 * below ~400 Hz, so we can safely downsample 4× (e.g. 48 kHz → 12 kHz, Nyquist
 * 6 kHz) and run YIN on a quarter of the samples — ~16× cheaper — while keeping
 * the same time window (so 30 Hz is still resolvable).
 */
const DECIMATION = 4;

export class PitchDetector {
  private detect: (buf: Float32Array) => number | null;
  private silenceThreshold: number;

  /** Recent valid frequencies, used to median-smooth out transient octave jumps. */
  private history: number[] = [];
  private static readonly SMOOTH_WINDOW = 5;

  /** Exponentially-smoothed frequency, for a steady needle on a noisy DI signal. */
  private smoothed: number | null = null;
  /** EMA weight — higher = snappier but jumpier, lower = smoother but laggier. */
  private static readonly SMOOTH_ALPHA = 0.25;
  /** Beyond this cents distance we treat it as a new note and snap instead of glide. */
  private static readonly RELOCK_CENTS = 120;

  /**
   * @param sampleRate – The audio context sample rate.
   * @param silenceThreshold – RMS below this is considered silence (default 0.01).
   */
  constructor(sampleRate: number, silenceThreshold = 0.01) {
    this.silenceThreshold = silenceThreshold;

    // YIN is excellent for monophonic bass — robust with low frequencies.
    // Threshold tuning matters a LOT for weak bass DI signals: a *lower*
    // threshold only accepts deep correlation dips, which locks onto the true
    // fundamental and avoids latching onto harmonics/partials (octave errors).
    // A higher value latches onto shallow sub-period dips → e.g. a low E read
    // as D, especially as the note decays.
    // Note: YIN runs on the decimated signal, so it gets the reduced rate.
    this.detect = YIN({
      sampleRate: sampleRate / DECIMATION,
      threshold: 0.1,
      probabilityThreshold: 0.1,
    });
  }

  /**
   * Downsample by averaging groups of DECIMATION samples. The boxcar average
   * doubles as a cheap anti-alias low-pass (first null at sampleRate/DECIMATION,
   * well above the bass range).
   */
  private decimate(buffer: Float32Array): Float32Array {
    const out = new Float32Array(Math.floor(buffer.length / DECIMATION));
    for (let i = 0; i < out.length; i++) {
      let sum = 0;
      for (let j = 0; j < DECIMATION; j++) sum += buffer[i * DECIMATION + j];
      out[i] = sum / DECIMATION;
    }
    return out;
  }

  /**
   * Analyse a time-domain audio buffer and return pitch information.
   */
  analyse(buffer: Float32Array): PitchResult {
    const rms = calcRms(buffer);

    // Gate: if the signal is too quiet, skip detection
    if (rms < this.silenceThreshold) {
      this.history = [];
      this.smoothed = null;
      return { frequency: null, midi: null, noteName: null, rms };
    }

    const raw = this.detect(this.decimate(buffer));

    // Note: B0 string is ~30.87 Hz, Standard E1 is ~41.20 Hz.
    if (raw == null || raw < 20 || raw > 1200) {
      // Out of bass range or no pitch found
      return { frequency: null, midi: null, noteName: null, rms };
    }

    // Median-smooth across the last few frames. A single bad frame (octave
    // jump) can't drag the reported pitch — the median rejects it as an outlier.
    this.history.push(raw);
    if (this.history.length > PitchDetector.SMOOTH_WINDOW) this.history.shift();
    const sorted = [...this.history].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    // Exponential smoothing glides the needle through the remaining fine jitter.
    // A large move (e.g. switching strings) snaps directly so it stays responsive.
    if (
      this.smoothed == null ||
      Math.abs(1200 * Math.log2(median / this.smoothed)) > PitchDetector.RELOCK_CENTS
    ) {
      this.smoothed = median;
    } else {
      this.smoothed += PitchDetector.SMOOTH_ALPHA * (median - this.smoothed);
    }
    const frequency = this.smoothed;

    const midi = frequencyToMidi(frequency);
    const noteName = midiToNoteName(midi);

    return { frequency, midi, noteName, rms };
  }
}
