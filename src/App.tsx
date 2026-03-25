import { useState, useRef, useCallback } from 'react';
import { Settings, Activity, Mic, MicOff } from 'lucide-react';
import AlphaTabView from './components/AlphaTabView';
import ExercisePicker from './components/ExercisePicker';
import EvaluationPanel from './components/EvaluationPanel';
import { exercises } from './data/exercises';
import { useAudioInput } from './hooks/useAudioInput';
import { useEvaluation } from './hooks/useEvaluation';
import { midiToNoteName } from './audio/pitchDetector';
import type { TimedNote } from './audio/noteExtractor';
import './components/alphatab.css';

function App() {
  const [currentExercise, setCurrentExercise] = useState(exercises[0]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [noteData, setNoteData] = useState<TimedNote[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [evaluationEnabled, setEvaluationEnabled] = useState(true);
  const scorePositionRef = useRef(0);

  const audio = useAudioInput();

  // Callbacks for AlphaTabView (stable refs — no re-renders)
  const handlePlayStateChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  const handlePositionChange = useCallback((ms: number) => {
    scorePositionRef.current = ms;
  }, []);

  // Evaluation hook — only active when enabled + mic on + playing
  const evaluation = useEvaluation({
    expectedNotes: noteData,
    isPlaying,
    isListening: audio.isListening,
    evaluationEnabled,
    lastDetectedNote: audio.lastNote,
    scorePositionRef,
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-sky-500 text-white p-2 rounded-lg">
            <Activity size={24} />
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">
            Bass Groove Trainer
          </h1>
        </div>
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
        >
          <Settings size={20} />
        </button>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 flex w-full max-w-[1600px] mx-auto p-4 md:p-6 gap-6 min-h-0">

        {/* Exercise Picker Sidebar */}
        {sidebarOpen && (
          <aside className="w-72 shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 overflow-y-auto">
            <h3 className="font-semibold text-slate-800 mb-3 text-sm">Exercises</h3>
            <ExercisePicker
              exercises={exercises}
              currentId={currentExercise.id}
              onSelect={(ex) => setCurrentExercise(ex)}
            />
          </aside>
        )}

        {/* Center: Practice Area */}
        <section className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-0">
          <AlphaTabView
            key={currentExercise.id}
            exercise={currentExercise}
            onNoteDataExtracted={(notes) => setNoteData(notes)}
            onPlayStateChange={handlePlayStateChange}
            onPositionChange={handlePositionChange}
          />
        </section>

        {/* Right Side: Feedback / Stats Sidebar */}
        <aside className="w-72 flex flex-col gap-6 shrink-0">

          {/* Realtime Feedback */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Live Feedback</h3>
              <button
                onClick={audio.toggle}
                className={`p-2 rounded-lg transition-colors ${
                  audio.isListening
                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                    : 'bg-sky-100 text-sky-600 hover:bg-sky-200'
                }`}
                title={audio.isListening ? 'Stop listening' : 'Start listening'}
              >
                {audio.isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            </div>

            {/* Error message */}
            {audio.error && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                {audio.error}
              </div>
            )}

            {/* Pitch display */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              {audio.isListening ? (
                <>
                  {/* Level meter */}
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-100 rounded-full"
                      style={{ width: `${Math.min(audio.currentPitch.rms * 500, 100)}%` }}
                    />
                  </div>

                  {/* Detected note */}
                  <div className="text-3xl font-bold text-slate-800 mb-1 tabular-nums">
                    {audio.currentPitch.noteName ?? '—'}
                  </div>
                  <div className="text-xs text-slate-400 font-mono tabular-nums mb-3">
                    {audio.currentPitch.frequency
                      ? `${audio.currentPitch.frequency.toFixed(1)} Hz`
                      : '…'}
                  </div>

                  {/* Last detected notes */}
                  {audio.detectedNotes.length > 0 && (
                    <div className="w-full">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">
                        Recent notes
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {audio.detectedNotes.slice(-12).map((n, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 bg-sky-100 text-sky-700 rounded text-xs font-mono"
                          >
                            {midiToNoteName(n.midi)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mb-3">
                    <Mic size={20} className="text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500 text-center">
                    Click the mic to start listening
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Evaluation Panel */}
          <EvaluationPanel
            evaluationEnabled={evaluationEnabled}
            setEvaluationEnabled={setEvaluationEnabled}
            isActive={evaluation.isActive}
            isListening={audio.isListening}
            toleranceLevel={evaluation.toleranceLevel}
            changeTolerance={evaluation.changeTolerance}
            latencyMs={evaluation.latencyMs}
            changeLatency={evaluation.changeLatency}
            liveResults={evaluation.liveResults}
            lastEvaluation={evaluation.lastEvaluation}
            summary={evaluation.summary}
            dismissSummary={evaluation.dismissSummary}
          />
        </aside>
      </main>
    </div>
  );
}

export default App;
