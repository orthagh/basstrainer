import { useState, useRef, useCallback, useEffect } from 'react';
import { Activity, Maximize, Minimize, PanelLeftClose, PanelLeftOpen, Keyboard, RotateCcw, Info } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import AlphaTabView from './components/AlphaTabView';
import type { AlphaTabHandle } from './components/AlphaTabView';
import ExercisePicker from './components/ExercisePicker';
import PostExerciseSummary from './components/PostExerciseSummary';
import WelcomeModal from './components/WelcomeModal';
import { exercises } from './data/exercises';
import { useAudioInput } from './hooks/useAudioInput';
import { useDemoMode } from './hooks/useDemoMode';
import { useProgress } from './hooks/useProgress';
import { useEvaluation } from './hooks/useEvaluation';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import type { TimedNote } from './audio/noteExtractor';
import type { MetronomeConfig } from './components/MetronomeSettings';
import './components/alphatab.css';

function App() {
  const [currentExercise, setCurrentExercise] = useState(exercises[0]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [noteData, setNoteData] = useState<TimedNote[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const scorePositionRef = useRef(0);

  // Metronome config — lifted here so evaluation can read count-in state
  const [metronomeConfig, setMetronomeConfig] = useState<MetronomeConfig>({
    enabled: true,
    countInBars: 1,
    clickSound: 'default',
    accentFirstBeat: true,
  });

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      mainRef.current?.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  }, []);

  // Listen for external fullscreen changes (e.g. Esc key exits fullscreen)
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // AlphaTab imperative ref (for keyboard shortcuts)
  const alphaTabRef = useRef<AlphaTabHandle>(null);
  const progress = useProgress();

  const audio = useAudioInput();

  // Demo mode — simulate mic input for testing visual feedback without a bass
  const [demoMode, setDemoMode] = useState(false);
  const demo = useDemoMode({
    expectedNotes: noteData,
    isPlaying,
    enabled: demoMode,
    scorePositionRef,
  });

  // Effective audio signals: demo overrides real mic when active
  const effectiveListening = demoMode || audio.isListening;
  const effectiveLastNote = demoMode ? demo.lastNote : audio.lastNote;
  const effectivePitch = demoMode ? demo.currentPitch : audio.currentPitch;

  // Callbacks for AlphaTabView (stable refs — no re-renders)
  const handlePlayStateChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  const handlePositionChange = useCallback((ms: number) => {
    scorePositionRef.current = ms;
  }, []);

  // Evaluation hook — only active when enabled + mic/demo on + playing
  const [previousBest, setPreviousBest] = useState<number | null>(null);

  const evaluation = useEvaluation({
    expectedNotes: noteData,
    isPlaying,
    isListening: effectiveListening,
    evaluationEnabled: true,
    lastDetectedNote: effectiveLastNote,
    scorePositionRef,
  });

  // Save progress when an evaluation finishes
  useEffect(() => {
    if (evaluation.summary) {
      setPreviousBest(prev => {
        if (prev === null) {
          return progress.progressData[currentExercise.id]?.bestScore ?? null;
        }
        return prev;
      });
      const bestScoreBpm = alphaTabRef.current?.getTempo() ?? 0;
      progress.saveProgress({
        exerciseId: currentExercise.id,
        bestScore: evaluation.summary.accuracy,
        bestTimingScore: evaluation.summary.grooveLock,
        bestPitchScore: evaluation.summary.pitchAccuracy,
        bestScoreBpm,
        highestBpm: bestScoreBpm,
        lastPlayedAt: new Date().toISOString(),
      });
    } else {
      setPreviousBest(null);
    }
  }, [evaluation.summary, currentExercise.id, progress.saveProgress, progress.progressData]);

  // ── Next exercise (if available) ───────────────────
  const currentIndex = exercises.findIndex((e) => e.id === currentExercise.id);
  const nextExercise = currentIndex < exercises.length - 1 ? exercises[currentIndex + 1] : null;

  const handleRetry = useCallback(() => {
    evaluation.dismissSummary();
    // Stop then play again after a tick so AlphaTab resets position
    alphaTabRef.current?.stop();
    setTimeout(() => alphaTabRef.current?.playPause(), 50);
  }, [evaluation]);

  const handleNextExercise = useCallback(() => {
    if (nextExercise) {
      evaluation.dismissSummary();
      setCurrentExercise(nextExercise);
    }
  }, [nextExercise, evaluation]);

  // ── Keyboard shortcuts ────────────────────────────
  useKeyboardShortcuts({
    enabled: true,
    playPause: () => alphaTabRef.current?.playPause(),
    stop: () => alphaTabRef.current?.stop(),
    toggleLoop: () => alphaTabRef.current?.toggleLoop(),
    toggleMetronome: () =>
      setMetronomeConfig((c) => ({ ...c, enabled: !c.enabled })),
    toggleFullscreen,
    tempoChange: (delta) => alphaTabRef.current?.changeTempo(delta),
  });

  // ── Welcome Modal ────────────────────────────
  const [showWelcome, setShowWelcome] = useState(() => {
    return localStorage.getItem('groovetrainer_welcomed') !== 'true';
  });

  const handleCloseWelcome = useCallback(() => {
    localStorage.setItem('groovetrainer_welcomed', 'true');
    setShowWelcome(false);
  }, []);

  return (
    <TooltipProvider>
      <div ref={mainRef} className="h-screen bg-background flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border py-4 px-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg">
              <Activity size={24} />
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Bass Groove Trainer
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowWelcome(true)}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors hidden sm:block"
              title="About Bass Groove Trainer"
            >
              <Info size={20} />
            </button>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
                  title="Keyboard shortcuts"
                >
                  <Keyboard size={20} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-4" align="end" sideOffset={8}>
                <h4 className="text-sm font-semibold text-foreground mb-3">Keyboard Shortcuts</h4>
                <div className="space-y-2 text-xs">
                  {[
                    ['Space', 'Play / Pause'],
                    ['Escape', 'Stop'],
                    ['L', 'Toggle loop'],
                    ['M', 'Toggle metronome'],
                    ['F', 'Fullscreen'],
                    ['← / →', 'Tempo ±5 BPM'],
                    ['↑ / ↓', 'Tempo ±1 BPM'],
                  ].map(([key, desc]) => (
                    <div key={key} className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">{desc}</span>
                      <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono text-foreground">
                        {key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <button
              onClick={toggleFullscreen}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
              title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </header>

        {/* Main Content Layout */}
        <div className="flex-1 flex min-h-0 overflow-hidden relative">

          {/* Exercise Picker Sidebar — flush left */}
          {sidebarOpen ? (
            <>
              {/* Overlay for mobile (hidden on desktop) */}
              <div 
                className="sm:hidden fixed inset-0 bg-black/50 z-30 animate-in fade-in"
                onClick={() => setSidebarOpen(false)}
                aria-hidden="true"
              />
              <aside className="w-full sm:w-64 shrink-0 bg-card border-r border-border flex flex-col overflow-hidden absolute inset-0 z-40 sm:relative sm:inset-auto shadow-2xl sm:shadow-none animate-in slide-in-from-left duration-200">
                <div className="flex items-center justify-between px-3 pt-3 pb-2 shrink-0 border-b border-border/50 sm:border-none">
                  <h3 className="font-semibold text-foreground text-sm">Exercises</h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to reset all progress?')) {
                          progress.clearProgress();
                        }
                      }}
                      className="p-1 text-muted-foreground hover:text-rose-400 hover:bg-muted rounded transition-colors"
                      title="Reset all progress"
                    >
                      <RotateCcw size={16} />
                    </button>
                    <button
                      onClick={() => setSidebarOpen(false)}
                      className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                      title="Collapse sidebar"
                    >
                      <PanelLeftClose size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-autohide">
                  <ExercisePicker
                    exercises={exercises}
                    currentId={currentExercise.id}
                    progressData={progress.progressData}
                    onSelect={(ex) => setCurrentExercise(ex)}
                  />
                </div>
              </aside>
            </>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="shrink-0 self-start m-2 p-2 bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-lg"
              title="Show exercises"
            >
              <PanelLeftOpen size={20} />
            </button>
          )}

          {/* Center: Practice Area */}
          <section className="flex-1 flex flex-col bg-card overflow-hidden min-h-0 min-w-0">
            <AlphaTabView
              ref={alphaTabRef}
              key={currentExercise.id}
              exercise={currentExercise}
              metronomeConfig={metronomeConfig}
              onMetronomeConfigChange={setMetronomeConfig}
              onNoteDataExtracted={(notes) => setNoteData(notes)}
              onPlayStateChange={handlePlayStateChange}
              onPositionChange={handlePositionChange}
              isListening={effectiveListening}
              currentPitch={effectivePitch}
              onToggleMic={audio.toggle}
              latencyMs={evaluation.latencyMs}
              onLatencyChange={evaluation.changeLatency}
              noteEvaluations={evaluation.evaluations}
              demoMode={demoMode}
              onToggleDemo={() => setDemoMode(d => !d)}
            />
          </section>
        </div>

        {/* Post-exercise summary overlay */}
        {evaluation.summary && (
          <PostExerciseSummary
            summary={evaluation.summary}
            exerciseTitle={currentExercise.title}
            personalBest={previousBest}
            onDismiss={evaluation.dismissSummary}
            onRetry={handleRetry}
            onNextExercise={nextExercise ? handleNextExercise : null}
          />
        )}

        {/* Welcome Modal Splash Screen */}
        <WelcomeModal isOpen={showWelcome} onClose={handleCloseWelcome} />
      </div>
    </TooltipProvider>
  );
}

export default App;
