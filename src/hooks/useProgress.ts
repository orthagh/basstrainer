import { useState, useCallback } from 'react';

export interface ProgressRecord {
  exerciseId: string;
  /** Number of completed attempts */
  attempts: number;
  /** Best overall accuracy (0–1) */
  bestScore: number;
  /** Best timing score (0–1) */
  bestTimingScore: number;
  /** Best pitch score (0–1) */
  bestPitchScore: number;
  /** BPM at which the best score was achieved */
  bestScoreBpm: number;
  /** Highest BPM the user has practised at */
  highestBpm: number;
  /** ISO-8601 date of the last attempt */
  lastPlayedAt: string;
}

const STORAGE_KEY = 'groovetrainer:progress';

export function useProgress() {
  const [progressData, setProgressData] = useState<Record<string, ProgressRecord>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored) as Record<string, ProgressRecord>;
    } catch (err) {
      console.error('Failed to parse progress from localStorage', err);
    }
    return {};
  });

  const saveProgress = useCallback((newRecord: Omit<ProgressRecord, 'attempts' | 'bestScore' | 'bestTimingScore' | 'bestPitchScore' | 'bestScoreBpm' | 'highestBpm'> & Partial<ProgressRecord>) => {
    setProgressData((prev) => {
      const current = prev[newRecord.exerciseId];
      const attempts = (current?.attempts || 0) + 1;
      
      const bestScore = Math.max(current?.bestScore || 0, newRecord.bestScore || 0);
      const isNewBestScore = (newRecord.bestScore || 0) > (current?.bestScore || 0);

      const updatedRecord: ProgressRecord = {
        exerciseId: newRecord.exerciseId,
        attempts,
        bestScore,
        bestTimingScore: isNewBestScore ? (newRecord.bestTimingScore || 0) : (current?.bestTimingScore || 0),
        bestPitchScore: isNewBestScore ? (newRecord.bestPitchScore || 0) : (current?.bestPitchScore || 0),
        bestScoreBpm: isNewBestScore ? (newRecord.bestScoreBpm || 0) : (current?.bestScoreBpm || 0),
        highestBpm: Math.max(current?.highestBpm || 0, newRecord.highestBpm || 0),
        lastPlayedAt: newRecord.lastPlayedAt || new Date().toISOString()
      };

      const newData = { ...prev, [newRecord.exerciseId]: updatedRecord };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      return newData;
    });
  }, []);

  const clearProgress = useCallback((exerciseId?: string) => {
    if (exerciseId) {
      setProgressData((prev) => {
        const newData = { ...prev };
        delete newData[exerciseId];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
        return newData;
      });
    } else {
      setProgressData({});
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return { progressData, saveProgress, clearProgress };
}
