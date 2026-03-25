/**
 * OnsetDetector – Detects note attack transients using energy-based onset detection.
 *
 * Uses a simple but effective approach:
 *   1. Compute RMS energy of the current frame.
 *   2. Compare to a running average energy.
 *   3. If the ratio exceeds a threshold AND we're past a minimum re-trigger time,
 *      fire an onset event.
 *
 * This avoids pulling in meyda for a single feature — keeps the bundle small.
 */

export interface OnsetEvent {
  /** High-resolution timestamp of the onset (seconds, from AudioContext.currentTime). */
  time: number;
}

export interface OnsetDetectorOptions {
  /** Minimum ratio of current RMS to average RMS to trigger onset. Default: 1.8 */
  threshold?: number;
  /** Minimum time between onsets in seconds. Default: 0.05 (50ms) */
  minInterOnsetInterval?: number;
  /** Smoothing factor for running average (0–1). Default: 0.15 */
  smoothing?: number;
  /** Minimum absolute RMS level to consider as non-silence. Default: 0.015 */
  minLevel?: number;
}

function calcRms(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

export class OnsetDetector {
  private threshold: number;
  private minInterval: number;
  private smoothing: number;
  private minLevel: number;

  private avgEnergy = 0;
  private lastOnsetTime = -1;
  private primed = true; // must drop below average before re-triggering

  constructor(opts: OnsetDetectorOptions = {}) {
    this.threshold = opts.threshold ?? 1.8;
    this.minInterval = opts.minInterOnsetInterval ?? 0.05;
    this.smoothing = opts.smoothing ?? 0.15;
    this.minLevel = opts.minLevel ?? 0.015;
  }

  /**
   * Process a frame of audio data. Returns an onset event if a note attack
   * is detected, otherwise null.
   *
   * @param buffer – Time-domain Float32Array from AnalyserNode.
   * @param time   – Current time in seconds (AudioContext.currentTime).
   */
  process(buffer: Float32Array, time: number): OnsetEvent | null {
    const rms = calcRms(buffer);

    // Update running average
    this.avgEnergy = this.smoothing * rms + (1 - this.smoothing) * this.avgEnergy;

    // Below noise floor — no onset, but re-prime the detector
    if (rms < this.minLevel) {
      this.primed = true;
      return null;
    }

    const ratio = this.avgEnergy > 0.0001 ? rms / this.avgEnergy : 0;

    // Check if energy is falling (re-prime for next onset)
    if (ratio < 1.0) {
      this.primed = true;
    }

    // Onset condition: ratio exceeds threshold, detector is primed,
    // and enough time has passed since the last onset
    if (
      this.primed &&
      ratio >= this.threshold &&
      (this.lastOnsetTime < 0 || time - this.lastOnsetTime >= this.minInterval)
    ) {
      this.primed = false;
      this.lastOnsetTime = time;
      return { time };
    }

    return null;
  }

  /**
   * Reset internal state (call when starting a new exercise).
   */
  reset(): void {
    this.avgEnergy = 0;
    this.lastOnsetTime = -1;
    this.primed = true;
  }
}
