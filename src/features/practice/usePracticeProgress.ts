import { useState, useCallback } from 'react';
import type { PracticeProgress, ModeProgress } from './types';

type ScoredMode = 'notes' | 'intervals' | 'scales';

const PROGRESS_KEY = 'basstrainer:practice:progress';
const NUM_LEVELS = 6;

function defaultModeProgress(): ModeProgress {
  const levels: ModeProgress['levels'] = {};
  for (let l = 1; l <= NUM_LEVELS; l++) {
    levels[l] = { unlocked: l === 1, bestAccuracy: 0, sessions: 0 };
  }
  return { levels };
}

function defaultProgress(): PracticeProgress {
  return {
    notes: defaultModeProgress(),
    intervals: defaultModeProgress(),
    scales: defaultModeProgress(),
    totalSessions: 0,
    streak: 0,
    lastPracticeDate: '',
  };
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadProgress(): PracticeProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as PracticeProgress;
    // Merge with defaults to handle new fields after updates
    const def = defaultProgress();
    return {
      ...def,
      ...parsed,
      notes:     { levels: { ...def.notes.levels,     ...parsed.notes?.levels     } },
      intervals: { levels: { ...def.intervals.levels, ...parsed.intervals?.levels } },
      scales:    { levels: { ...def.scales.levels,    ...parsed.scales?.levels    } },
    };
  } catch {
    return defaultProgress();
  }
}

function saveProgress(p: PracticeProgress): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    // localStorage unavailable — ignore
  }
}

export function usePracticeProgress() {
  const [progress, setProgress] = useState<PracticeProgress>(loadProgress);

  const updateAfterSession = useCallback((
    mode: ScoredMode,
    level: number,
    accuracy: number, // 0-100
  ) => {
    setProgress(prev => {
      const next = structuredClone(prev);
      const modeData = next[mode];
      const levelData = modeData.levels[level];

      levelData.sessions += 1;
      levelData.bestAccuracy = Math.max(levelData.bestAccuracy, accuracy);

      // Unlock next level if accuracy threshold met
      if (accuracy >= 80 && level < NUM_LEVELS) {
        modeData.levels[level + 1].unlocked = true;
      }

      next.totalSessions += 1;

      // Streak tracking
      const today = todayISO();
      if (prev.lastPracticeDate === today) {
        // same day, no streak change
      } else if (prev.lastPracticeDate === new Date(Date.now() - 86400000).toISOString().slice(0, 10)) {
        // consecutive day
        next.streak += 1;
      } else {
        // streak broken
        next.streak = 1;
      }
      next.lastPracticeDate = today;

      saveProgress(next);
      return next;
    });
  }, []);

  const resetMode = useCallback((mode: ScoredMode) => {
    setProgress(prev => {
      const next = { ...prev, [mode]: defaultModeProgress() };
      saveProgress(next);
      return next;
    });
  }, []);

  return { progress, updateAfterSession, resetMode };
}
