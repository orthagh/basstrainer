import type { Exercise } from '../data/exercises';
import type { ProgressRecord } from '../hooks/useProgress';
import { formatTimeAgo } from '../lib/timeHelper';

interface ExercisePickerProps {
  exercises: Exercise[];
  currentId?: string;
  progressData: Record<string, ProgressRecord>;
  onSelect: (exercise: Exercise) => void;
}

const difficultyDot = {
  beginner: 'bg-emerald-400',
  intermediate: 'bg-amber-400',
  advanced: 'bg-rose-400',
};

export default function ExercisePicker({
  exercises,
  currentId,
  progressData,
  onSelect,
}: ExercisePickerProps) {
  // Group by category
  const grouped = exercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    (acc[ex.category] ??= []).push(ex);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-3">
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-1">
            {category}
          </h4>
          <div className="flex flex-col">
            {items.map((ex) => {
              const progress = progressData[ex.id];
              const bestScoreStr = progress ? `${Math.round(progress.bestScore * 100)}%` : null;
              
              return (
                <button
                  key={ex.id}
                  onClick={() => onSelect(ex)}
                  className={`text-left w-full px-2 py-2 rounded-lg transition-all flex flex-col gap-1 ${
                    currentId === ex.id
                      ? 'bg-primary/5 border border-primary/20'
                      : 'hover:bg-muted border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${difficultyDot[ex.difficulty]}`}
                      title={ex.difficulty}
                    />
                    <span className="text-[13px] font-medium text-foreground truncate flex-1 leading-none">
                      {ex.title}
                    </span>
                    {!progress && (
                      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                        {ex.defaultTempo} BPM
                      </span>
                    )}
                  </div>
                  
                  {progress && (
                    <div className="flex items-center justify-between w-full pl-4 text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-emerald-400 bg-emerald-400/10 px-1 py-0.5 rounded-sm">
                          {bestScoreStr}
                        </span>
                        <span className="tabular-nums">{progress.bestScoreBpm} BPM</span>
                      </div>
                      <span>
                        {formatTimeAgo(progress.lastPlayedAt)}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
