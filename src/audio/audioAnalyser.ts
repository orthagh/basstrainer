/**
 * AudioAnalyser – Orchestrates microphone capture, pitch detection, and onset detection.
 *
 * Runs a continuous analysis loop and emits detected notes
 * (combining onset timing + pitch information).
 */

import { AudioCapture } from './audioCapture';
import { PitchDetector, type PitchResult } from './pitchDetector';
import { OnsetDetector, type OnsetEvent } from './onsetDetector';

export interface DetectedNote {
  /** MIDI note number (e.g. 40 = E2). */
  midi: number;
  /** Detected frequency in Hz. */
  frequency: number;
  /** Human-readable note name (e.g. "E2"). */
  noteName: string;
  /** Timestamp in seconds (relative to analysis start). */
  time: number;
  /** RMS level at detection time. */
  rms: number;
}

export interface AudioAnalyserCallbacks {
  /** Fired whenever a new note onset is detected with a valid pitch. */
  onNote?: (note: DetectedNote) => void;
  /** Fired every analysis frame with the current pitch (even if no onset). */
  onPitch?: (pitch: PitchResult) => void;
  /** Fired on onset detection (even before pitch is confirmed). */
  onOnset?: (onset: OnsetEvent) => void;
}

export class AudioAnalyser {
  private capture: AudioCapture;
  private pitchDetector: PitchDetector | null = null;
  private onsetDetector: OnsetDetector;
  private callbacks: AudioAnalyserCallbacks;

  private rafId: number | null = null;
  private _isRunning = false;
  private startTime = 0;

  /** All detected notes since start(). */
  readonly detectedNotes: DetectedNote[] = [];

  /** Most recent pitch result (updated every frame). */
  currentPitch: PitchResult = {
    frequency: null,
    midi: null,
    noteName: null,
    rms: 0,
  };

  get isRunning(): boolean {
    return this._isRunning;
  }

  constructor(callbacks: AudioAnalyserCallbacks = {}) {
    this.capture = new AudioCapture();
    this.onsetDetector = new OnsetDetector();
    this.callbacks = callbacks;
  }

  /**
   * Request mic access and start the analysis loop.
   */
  async start(): Promise<void> {
    if (this._isRunning) return;

    await this.capture.start({ fftSize: 2048 });

    this.pitchDetector = new PitchDetector(this.capture.sampleRate);
    this.onsetDetector.reset();
    this.detectedNotes.length = 0;
    this.startTime = this.capture.currentTime();
    this._isRunning = true;

    this.loop();
  }

  /**
   * Stop analysis and release microphone.
   */
  stop(): void {
    this._isRunning = false;
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.capture.stop();
    this.pitchDetector = null;
  }

  /**
   * Main analysis loop — runs at display refresh rate (~60fps).
   */
  private loop = (): void => {
    if (!this._isRunning) return;

    const buffer = this.capture.getTimeDomainData();
    const time = this.capture.currentTime() - this.startTime;

    if (buffer && this.pitchDetector) {
      // 1. Pitch detection (every frame)
      const pitch = this.pitchDetector.analyse(buffer);
      this.currentPitch = pitch;
      this.callbacks.onPitch?.(pitch);

      // 2. Onset detection
      const onset = this.onsetDetector.process(buffer, time);
      if (onset) {
        this.callbacks.onOnset?.(onset);

        // 3. Combine onset + pitch → detected note
        if (pitch.frequency != null && pitch.midi != null && pitch.noteName != null) {
          const note: DetectedNote = {
            midi: pitch.midi,
            frequency: pitch.frequency,
            noteName: pitch.noteName,
            time: onset.time,
            rms: pitch.rms,
          };
          this.detectedNotes.push(note);
          this.callbacks.onNote?.(note);
        }
      }
    }

    this.rafId = requestAnimationFrame(this.loop);
  };
}
