/**
 * Tests for LatencyCompensator.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LatencyCompensator } from './latencyCompensator';

// ── localStorage mock ───────────────────────────────────────
const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => store.set(key, val),
    removeItem: (key: string) => store.delete(key),
  });
});

const STORAGE_KEY = 'groovetrainer:latencyOffsetMs';

// ── Tests ───────────────────────────────────────────────────

describe('LatencyCompensator', () => {
  it('defaults to 0 when no stored value and no initial', () => {
    const lc = new LatencyCompensator();
    expect(lc.offsetMs).toBe(0);
  });

  it('uses the explicit initial value when provided', () => {
    const lc = new LatencyCompensator(25);
    expect(lc.offsetMs).toBe(25);
  });

  it('reads from localStorage when no initial value is provided', () => {
    store.set(STORAGE_KEY, '42');
    const lc = new LatencyCompensator();
    expect(lc.offsetMs).toBe(42);
  });

  it('explicit initial value takes precedence over localStorage', () => {
    store.set(STORAGE_KEY, '42');
    const lc = new LatencyCompensator(10);
    expect(lc.offsetMs).toBe(10);
  });

  it('persists to localStorage when offsetMs is set', () => {
    const lc = new LatencyCompensator();
    lc.offsetMs = 55;
    expect(lc.offsetMs).toBe(55);
    expect(store.get(STORAGE_KEY)).toBe('55');
  });

  it('compensate() subtracts the offset from the score position', () => {
    const lc = new LatencyCompensator(20);
    expect(lc.compensate(1000)).toBe(980);
  });

  it('compensate() returns score position unchanged when offset is 0', () => {
    const lc = new LatencyCompensator(0);
    expect(lc.compensate(500)).toBe(500);
  });

  it('handles localStorage getItem throwing', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('private browsing'); },
      setItem: () => {},
    });
    // Should not throw, defaults to 0
    const lc = new LatencyCompensator();
    expect(lc.offsetMs).toBe(0);
  });

  it('handles localStorage setItem throwing', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => { throw new Error('quota exceeded'); },
    });
    const lc = new LatencyCompensator();
    // Should not throw
    lc.offsetMs = 30;
    expect(lc.offsetMs).toBe(30);
  });
});
