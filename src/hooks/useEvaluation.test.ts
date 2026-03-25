import { renderHook, act } from '@testing-library/react';
import { useEvaluation } from './useEvaluation';
import type { TimedNote } from '../audio/noteExtractor';
import { vi } from 'vitest';

describe('useEvaluation', () => {
  const mockNotes: TimedNote[] = [
    { startMs: 1000, durationMs: 500, midi: 40, beatIndex: 1 },
    { startMs: 2000, durationMs: 500, midi: 42, beatIndex: 2 },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes correctly with defaults', () => {
    const { result } = renderHook(() =>
      useEvaluation({
        expectedNotes: mockNotes,
        isPlaying: false,
        isListening: true,
        evaluationEnabled: true,
        lastDetectedNote: null,
        scorePositionRef: { current: 0 },
      })
    );

    expect(result.current.isActive).toBe(false);
    expect(result.current.evaluations).toEqual([]);
    expect(result.current.summary).toBeNull();
  });

  it('starts evaluation when isPlaying becomes true', () => {
    let isPlaying = false;
    const { result, rerender } = renderHook(() =>
      useEvaluation({
        expectedNotes: mockNotes,
        isPlaying,
        isListening: true,
        evaluationEnabled: true,
        lastDetectedNote: null,
        scorePositionRef: { current: 0 },
      })
    );

    isPlaying = true;
    rerender();

    expect(result.current.isActive).toBe(true);
    expect(result.current.liveResults.total).toBe(2);
  });

  it('processes detected notes and updates live results', () => {
    let isPlaying = false;
    let lastDetectedNote: any = null;
    const scorePositionRef = { current: 0 };
    
    const { result, rerender } = renderHook(() =>
      useEvaluation({
        expectedNotes: mockNotes,
        isPlaying,
        isListening: true,
        evaluationEnabled: true,
        lastDetectedNote,
        scorePositionRef,
      })
    );

    act(() => {
      isPlaying = true;
      rerender();
    });

    // Simulate play position moving to 1000ms and a note being detected
    act(() => {
      scorePositionRef.current = 1000;
      lastDetectedNote = {
        frequency: 82.41, // E2, approx midi 40
        clarity: 0.9,
        timestamp: 1000,
        volume: -10,
      };
      rerender();
    });

    // Advance timers so the interval fires
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current.evaluations).toHaveLength(1);
    expect(result.current.evaluations[0].isHit).toBe(true);
    expect(result.current.liveResults.hits).toBe(1);
  });
  
  it('computes summary when playback stops', () => {
    let isPlaying = false;
    const { result, rerender } = renderHook(() =>
      useEvaluation({
        expectedNotes: mockNotes,
        isPlaying,
        isListening: true,
        evaluationEnabled: true,
        lastDetectedNote: null,
        scorePositionRef: { current: 0 },
      })
    );

    act(() => {
      isPlaying = true;
      rerender();
    });

    act(() => {
      // Stop playback
      isPlaying = false;
      rerender();
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.summary).not.toBeNull();
    // Since no notes were hit, accuracy should be 0
    expect(result.current.summary?.accuracy).toBe(0);
  });

  it('allows dismissing summary', () => {
    let isPlaying = false;
    const { result, rerender } = renderHook(() =>
      useEvaluation({
        expectedNotes: mockNotes,
        isPlaying,
        isListening: true,
        evaluationEnabled: true,
        lastDetectedNote: null,
        scorePositionRef: { current: 0 },
      })
    );

    act(() => {
      isPlaying = true;
      rerender();
    });

    act(() => {
      isPlaying = false;
      rerender();
    });

    expect(result.current.summary).not.toBeNull();

    act(() => {
      result.current.dismissSummary();
    });

    expect(result.current.summary).toBeNull();
  });
});
