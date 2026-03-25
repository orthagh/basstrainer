/**
 * AudioCapture – Manages microphone access and Web Audio graph.
 *
 * Creates: MediaStream → GainNode → AnalyserNode
 * The AnalyserNode provides raw PCM data for pitch & onset detection.
 */

export interface AudioCaptureOptions {
  /** FFT size for the AnalyserNode (power of 2). Default 2048. */
  fftSize?: number;
  /** Target sample rate. Default: browser default (~44100 or 48000). */
  sampleRate?: number;
}

export class AudioCapture {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private gain: GainNode | null = null;

  private _isCapturing = false;

  get isCapturing(): boolean {
    return this._isCapturing;
  }

  get sampleRate(): number {
    return this.ctx?.sampleRate ?? 44100;
  }

  get analyserNode(): AnalyserNode | null {
    return this.analyser;
  }

  /**
   * Request microphone permission and start capturing.
   */
  async start(opts: AudioCaptureOptions = {}): Promise<void> {
    if (this._isCapturing) return;

    const { fftSize = 2048, sampleRate } = opts;

    // Request mic
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        ...(sampleRate ? { sampleRate } : {}),
      },
    });

    // Build audio graph
    this.ctx = new AudioContext(sampleRate ? { sampleRate } : undefined);
    this.source = this.ctx.createMediaStreamSource(this.stream);

    this.gain = this.ctx.createGain();
    this.gain.gain.value = 1.0;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = fftSize;
    this.analyser.smoothingTimeConstant = 0;

    this.source.connect(this.gain);
    this.gain.connect(this.analyser);
    // Don't connect to destination — no feedback loop!

    this._isCapturing = true;
  }

  /**
   * Get a Float32Array with the current time-domain audio data.
   * Returns null if not capturing.
   */
  getTimeDomainData(): Float32Array | null {
    if (!this.analyser) return null;
    const buffer = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buffer);
    return buffer;
  }

  /**
   * Get a Float32Array with the current frequency-domain data.
   */
  getFrequencyData(): Float32Array | null {
    if (!this.analyser) return null;
    const buffer = new Float32Array(this.analyser.frequencyBinCount);
    this.analyser.getFloatFrequencyData(buffer);
    return buffer;
  }

  /**
   * Current audio context time in seconds (high-resolution).
   */
  currentTime(): number {
    return this.ctx?.currentTime ?? 0;
  }

  /**
   * Stop capture and release all resources.
   */
  stop(): void {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.gain) {
      this.gain.disconnect();
      this.gain = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this._isCapturing = false;
  }
}
