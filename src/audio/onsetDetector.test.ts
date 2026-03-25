import { describe, it, expect } from 'vitest';
import { OnsetDetector } from './onsetDetector';

/**
 * Helper: create a buffer with a uniform amplitude.
 */
function makeBuffer(amplitude: number, length = 512): Float32Array {
  const buf = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    buf[i] = amplitude * Math.sin(2 * Math.PI * 100 * i / 44100);
  }
  return buf;
}

/**
 * Helper: create a silent buffer.
 */
function makeSilence(length = 512): Float32Array {
  return new Float32Array(length);
}

describe('OnsetDetector', () => {
  it('returns null for silence', () => {
    const detector = new OnsetDetector();
    const result = detector.process(makeSilence(), 0.0);
    expect(result).toBeNull();
  });

  it('returns null for continuous low-level signal (no transient)', () => {
    const detector = new OnsetDetector({ minLevel: 0.01 });

    // Feed several frames of the same level to build up the average
    for (let i = 0; i < 20; i++) {
      detector.process(makeBuffer(0.05), i * 0.01);
    }

    // Same level — no spike, no onset
    const result = detector.process(makeBuffer(0.05), 0.3);
    expect(result).toBeNull();
  });

  it('detects an onset when energy spikes after silence', () => {
    const detector = new OnsetDetector({ minLevel: 0.005, threshold: 1.5 });

    // Feed silence to prime
    for (let i = 0; i < 5; i++) {
      detector.process(makeSilence(), i * 0.01);
    }

    // Sudden loud signal → onset
    const result = detector.process(makeBuffer(0.5), 0.1);
    expect(result).not.toBeNull();
    expect(result!.time).toBe(0.1);
  });

  it('respects minimum inter-onset interval', () => {
    const detector = new OnsetDetector({
      minLevel: 0.005,
      threshold: 1.5,
      minInterOnsetInterval: 0.1,
    });

    // Silence → loud = onset
    detector.process(makeSilence(), 0.0);
    const first = detector.process(makeBuffer(0.5), 0.05);
    expect(first).not.toBeNull();

    // Silence to re-prime, then loud again — but too soon
    detector.process(makeSilence(), 0.06);
    const tooSoon = detector.process(makeBuffer(0.5), 0.08);
    expect(tooSoon).toBeNull();

    // After the interval passes, should trigger
    detector.process(makeSilence(), 0.14);
    const afterInterval = detector.process(makeBuffer(0.5), 0.16);
    expect(afterInterval).not.toBeNull();
  });

  it('re-primes after energy drops', () => {
    const detector = new OnsetDetector({ minLevel: 0.005, threshold: 1.5 });

    // Onset
    detector.process(makeSilence(), 0.0);
    const first = detector.process(makeBuffer(0.5), 0.1);
    expect(first).not.toBeNull();

    // Stay loud for a while — average builds up high
    for (let i = 0; i < 10; i++) {
      detector.process(makeBuffer(0.5), 0.2 + i * 0.01);
    }

    // Drop to silence for many frames → avg decays, detector re-primes
    for (let i = 0; i < 30; i++) {
      detector.process(makeSilence(), 0.4 + i * 0.01);
    }

    // New loud signal → new onset (avg is now low, ratio will be high)
    const second = detector.process(makeBuffer(0.5), 0.8);
    expect(second).not.toBeNull();
  });

  it('reset() clears internal state', () => {
    const detector = new OnsetDetector({ minLevel: 0.005, threshold: 1.5 });

    // Build up some state
    detector.process(makeBuffer(0.3), 0.0);
    detector.process(makeBuffer(0.3), 0.1);

    detector.reset();

    // After reset, silence → loud should trigger onset from clean state
    detector.process(makeSilence(), 0.0);
    const result = detector.process(makeBuffer(0.5), 0.1);
    expect(result).not.toBeNull();
  });
});
