/**
 * AudioAnalyser – Orchestrates microphone capture and pitch detection.
 *
 * Runs a continuous analysis loop and emits pitch data every frame.
 */

import { AudioCapture } from './audioCapture';
import { PitchDetector, type PitchResult } from './pitchDetector';

export interface AudioAnalyserCallbacks {
  /** Fired every analysis frame with the current pitch. */
  onPitch?: (pitch: PitchResult) => void;
}

export class AudioAnalyser {
  private capture: AudioCapture;
  private pitchDetector: PitchDetector | null = null;
  private callbacks: AudioAnalyserCallbacks;

  private rafId: number | null = null;
  private _isRunning = false;

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
    this.callbacks = callbacks;
  }

  /**
   * Request mic access and start the analysis loop.
   */
  async start(): Promise<void> {
    if (this._isRunning) return;

    // Use a larger FFT size (8192) to reliably capture low bass frequencies down to ~30Hz
    await this.capture.start({ fftSize: 8192 });

    // Pass a lower silence threshold (0.003) so quieter sounds still get pitch tracked
    this.pitchDetector = new PitchDetector(this.capture.sampleRate, 0.003);
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

    if (buffer && this.pitchDetector) {
      const pitch = this.pitchDetector.analyse(buffer);
      this.currentPitch = pitch;
      this.callbacks.onPitch?.(pitch);
    }

    this.rafId = requestAnimationFrame(this.loop);
  };
}
