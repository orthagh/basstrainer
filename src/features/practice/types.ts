export type PracticeMode = 'notes' | 'intervals' | 'scales' | 'chordChanges';

export interface LevelStats {
  unlocked: boolean;
  bestAccuracy: number; // 0-100
  sessions: number;
}

export interface ModeProgress {
  levels: Record<number, LevelStats>;
}

export interface PracticeProgress {
  notes: ModeProgress;
  intervals: ModeProgress;
  scales: ModeProgress;
  totalSessions: number;
  streak: number;
  lastPracticeDate: string; // YYYY-MM-DD
}
