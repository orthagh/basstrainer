import { describe, it, expect } from 'vitest';
import {
  frequencyToMidi,
  midiToNoteName,
  PitchDetector,
} from './pitchDetector';

// ── Pure utility functions ──────────────────────────────────

describe('frequencyToMidi', () => {
  it('converts A4 (440 Hz) to MIDI 69', () => {
    expect(frequencyToMidi(440)).toBe(69);
  });

  it('converts E2 (~82.41 Hz) to MIDI 40', () => {
    expect(frequencyToMidi(82.41)).toBe(40);
  });

  it('converts A1 (~55 Hz) to MIDI 33', () => {
    expect(frequencyToMidi(55)).toBe(33);
  });

  it('converts E1 (~41.2 Hz) to MIDI 28', () => {
    expect(frequencyToMidi(41.2)).toBe(28);
  });

  it('converts G2 (~98 Hz) to MIDI 43', () => {
    expect(frequencyToMidi(98)).toBe(43);
  });

  it('converts C4 (middle C, ~261.63 Hz) to MIDI 60', () => {
    expect(frequencyToMidi(261.63)).toBe(60);
  });
});

describe('midiToNoteName', () => {
  it('converts MIDI 69 to A4', () => {
    expect(midiToNoteName(69)).toBe('A4');
  });

  it('converts MIDI 40 to E2', () => {
    expect(midiToNoteName(40)).toBe('E2');
  });

  it('converts MIDI 33 to A1', () => {
    expect(midiToNoteName(33)).toBe('A1');
  });

  it('converts MIDI 28 to E1', () => {
    expect(midiToNoteName(28)).toBe('E1');
  });

  it('converts MIDI 60 to C4', () => {
    expect(midiToNoteName(60)).toBe('C4');
  });

  it('converts MIDI 43 to G2', () => {
    expect(midiToNoteName(43)).toBe('G2');
  });

  it('handles sharps correctly (MIDI 61 = C#4)', () => {
    expect(midiToNoteName(61)).toBe('C#4');
  });
});

// ── PitchDetector class ─────────────────────────────────────

describe('PitchDetector', () => {
  const sampleRate = 44100;

  /**
   * Helper: generate a sine wave buffer.
   */
  function makeSine(freq: number, length: number, amplitude = 0.5): Float32Array {
    const buf = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      buf[i] = amplitude * Math.sin(2 * Math.PI * freq * i / sampleRate);
    }
    return buf;
  }

  /**
   * Helper: generate a silent buffer.
   */
  function makeSilence(length: number): Float32Array {
    return new Float32Array(length);
  }

  it('returns null pitch for silence', () => {
    const detector = new PitchDetector(sampleRate);
    const result = detector.analyse(makeSilence(2048));

    expect(result.frequency).toBeNull();
    expect(result.midi).toBeNull();
    expect(result.noteName).toBeNull();
    expect(result.rms).toBeCloseTo(0, 3);
  });

  it('returns null pitch for very quiet signals', () => {
    const detector = new PitchDetector(sampleRate, 0.01);
    const result = detector.analyse(makeSine(100, 2048, 0.001));

    expect(result.frequency).toBeNull();
    expect(result.midi).toBeNull();
  });

  it('detects A2 (110 Hz) correctly', () => {
    const detector = new PitchDetector(sampleRate);
    // YIN needs several full cycles — 110 Hz at 44100 SR = ~401 samples/cycle
    // 8192 samples ≈ 20 cycles, enough for robust detection
    const result = detector.analyse(makeSine(110, 8192, 0.5));

    expect(result.frequency).not.toBeNull();
    expect(result.frequency!).toBeCloseTo(110, -1);
    expect(result.midi).toBe(45); // A2
    expect(result.noteName).toBe('A2');
  });

  it('detects E2 (~82.41 Hz) correctly', () => {
    const detector = new PitchDetector(sampleRate);
    // 82.41 Hz → ~535 samples/cycle, need 16384 for enough cycles
    const result = detector.analyse(makeSine(82.41, 16384, 0.5));

    expect(result.frequency).not.toBeNull();
    expect(result.midi).toBe(40); // E2
    expect(result.noteName).toBe('E2');
  });

  it('detects A4 (440 Hz) correctly', () => {
    const detector = new PitchDetector(sampleRate);
    const result = detector.analyse(makeSine(440, 2048, 0.5));

    expect(result.frequency).not.toBeNull();
    expect(result.frequency!).toBeCloseTo(440, -1);
    expect(result.midi).toBe(69);
    expect(result.noteName).toBe('A4');
  });

  it('always returns an rms value', () => {
    const detector = new PitchDetector(sampleRate);

    const silentResult = detector.analyse(makeSilence(2048));
    expect(silentResult.rms).toBe(0);

    const loudResult = detector.analyse(makeSine(220, 2048, 0.8));
    expect(loudResult.rms).toBeGreaterThan(0.1);
  });
});
