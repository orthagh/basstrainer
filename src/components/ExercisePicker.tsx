import type { Exercise } from '../data/exercises';

interface ExercisePickerProps {
  exercises: Exercise[];
  currentId: string;
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
          <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 px-1">
            {category}
          </h4>
          <div className="flex flex-col">
            {items.map((ex) => (
              <button
                key={ex.id}
                onClick={() => onSelect(ex)}
                className={`text-left w-full px-2 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
                  currentId === ex.id
                    ? 'bg-sky-50 border border-sky-200'
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${difficultyDot[ex.difficulty]}`}
                  title={ex.difficulty}
                />
                <span className="text-xs font-medium text-slate-700 truncate flex-1">
                  {ex.title}
                </span>
                <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                  {ex.defaultTempo}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
