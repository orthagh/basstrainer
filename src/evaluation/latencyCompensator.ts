/**
 * LatencyCompensator — manages audio input latency offset.
 *
 * Audio hardware introduces a delay between the physical bass string vibration
 * and the moment the note is detected in software.  This class stores the
 * offset (in ms) used to compensate for that delay.
 *
 * The offset is persisted in localStorage so the user doesn't have to
 * re-calibrate every session.
 *
 * Future improvement: automatic calibration by having the user tap along
 * with a click track and measuring the average offset.
 */

const STORAGE_KEY = 'groovetrainer:latencyOffsetMs';

export class LatencyCompensator {
  private _offsetMs: number;

  constructor(initialOffsetMs?: number) {
    // Try to restore from localStorage, fallback to explicit initial or 0.
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // Ignore — private browsing or SSR.
    }
    this._offsetMs = initialOffsetMs ?? (stored ? Number(stored) : 0);
  }

  /** Current latency offset in ms. */
  get offsetMs(): number {
    return this._offsetMs;
  }

  /** Set the latency offset and persist it. */
  set offsetMs(ms: number) {
    this._offsetMs = ms;
    try {
      localStorage.setItem(STORAGE_KEY, String(ms));
    } catch {
      // Ignore storage errors.
    }
  }

  /** Apply the offset to a score position. */
  compensate(scorePositionMs: number): number {
    return scorePositionMs - this._offsetMs;
  }
}
