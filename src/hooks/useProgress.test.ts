import { renderHook, act } from '@testing-library/react';
import { useProgress } from './useProgress';

describe('useProgress', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes with empty progress data', () => {
    const { result } = renderHook(() => useProgress());
    expect(result.current.progressData).toEqual({});
  });

  it('saves new progress', () => {
    const { result } = renderHook(() => useProgress());

    act(() => {
      result.current.saveProgress({
        exerciseId: 'ex-1',
        bestScore: 95,
        bestTimingScore: 90,
        bestPitchScore: 100,
        bestScoreBpm: 120,
        highestBpm: 120,
        lastPlayedAt: '2026-03-25T10:00:00.000Z',
      });
    });

    expect(result.current.progressData['ex-1']).toMatchObject({
      bestScore: 95,
      attempts: 1,
    });
  });

  it('updates best score only if new score is higher', () => {
    const { result } = renderHook(() => useProgress());

    act(() => {
      result.current.saveProgress({
        exerciseId: 'ex-1',
        bestScore: 80,
        bestTimingScore: 80,
        bestPitchScore: 80,
        bestScoreBpm: 120,
        highestBpm: 120,
        lastPlayedAt: '2026-03-25T10:00:00.000Z',
      });
    });

    act(() => {
      // Lower score, should not update bestScore but should increment attempts
      result.current.saveProgress({
        exerciseId: 'ex-1',
        bestScore: 70,
        bestTimingScore: 70,
        bestPitchScore: 70,
        bestScoreBpm: 120,
        highestBpm: 120,
        lastPlayedAt: '2026-03-25T10:05:00.000Z',
      });
    });

    expect(result.current.progressData['ex-1'].bestScore).toBe(80);
    expect(result.current.progressData['ex-1'].attempts).toBe(2);

    act(() => {
      // Higher score, should update bestScore
      result.current.saveProgress({
        exerciseId: 'ex-1',
        bestScore: 95,
        bestTimingScore: 90,
        bestPitchScore: 100,
        bestScoreBpm: 125,
        highestBpm: 125,
        lastPlayedAt: '2026-03-25T10:10:00.000Z',
      });
    });

    expect(result.current.progressData['ex-1'].bestScore).toBe(95);
    expect(result.current.progressData['ex-1'].attempts).toBe(3);
    expect(result.current.progressData['ex-1'].bestScoreBpm).toBe(125);
  });

  it('clears progress', () => {
    const { result } = renderHook(() => useProgress());

    act(() => {
      result.current.saveProgress({
        exerciseId: 'ex-1',
        bestScore: 95,
        bestTimingScore: 90,
        bestPitchScore: 100,
        bestScoreBpm: 120,
        highestBpm: 120,
        lastPlayedAt: '2026-03-25T10:00:00.000Z',
      });
    });

    expect(Object.keys(result.current.progressData).length).toBe(1);

    act(() => {
      result.current.clearProgress();
    });

    expect(result.current.progressData).toEqual({});
  });
});
