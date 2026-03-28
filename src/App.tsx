import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Activity, Maximize, Minimize, PanelLeftClose, PanelLeftOpen, Keyboard, RotateCcw, Info, AudioLines, FolderTree } from 'lucide-react';
import MetronomeIcon from './components/MetronomeIcon';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PortalContainerContext } from '@/components/ui/portal-container';
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
import TunerPage from './components/TunerPage';
import MetronomePage, { type MetronomeHandle } from './components/MetronomePage';
import ExerciseDirectoryTree from './components/ExerciseDirectoryTree';
import { exercises, type Exercise } from './data/exercises';
import { useAudioInput } from './hooks/useAudioInput';
import { useDemoMode } from './hooks/useDemoMode';
import { useProgress } from './hooks/useProgress';
import { useEvaluation } from './hooks/useEvaluation';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import type { TimedNote } from './audio/noteExtractor';
import type { MetronomeConfig } from './components/MetronomeSettings';
import { useExerciseDirectory } from './features/exerciseDirectory/useExerciseDirectory.ts';
import './components/alphatab.css';

type AppView = 'directory' | 'trainer' | 'tuner' | 'metronome';

const VIEWS: AppView[] = ['directory', 'trainer', 'tuner', 'metronome'];
const LAST_TRAINER_EXERCISE_KEY = 'groovetrainer:lastOpenedTrainerExerciseId';
const METRONOME_CONFIG_LS_KEY = 'groovetrainer:metronomeConfig';

function viewFromHash(): AppView {
  const hash = window.location.hash.replace(/^#\/?/, '');
  return (VIEWS as string[]).includes(hash) ? (hash as AppView) : 'directory';
}

function App() {
  const [currentView, setCurrentView] = useState<AppView>(viewFromHash);

  const navigateTo = useCallback((view: AppView) => {
    window.location.hash = view;
    setCurrentView(view);
  }, []);

  useEffect(() => {
    const onHashChange = () => setCurrentView(viewFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(() => {
    const id = localStorage.getItem(LAST_TRAINER_EXERCISE_KEY);
    return exercises.find((exercise) => exercise.id === id) ?? null;
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [noteData, setNoteData] = useState<TimedNote[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const scorePositionRef = useRef(0);
  const directory = useExerciseDirectory();

  const directoryExercise = directory.selectedFile
    ? {
        id: `directory:${directory.selectedFile.id}`,
        title: directory.selectedFile.name,
        subtitle: `GP (${directory.selectedFile.sourceFormat.toUpperCase()})`,
        difficulty: 'intermediate' as const,
        category: 'Directory',
        defaultTempo: 120, // placeholder — overwritten from score.tempo on playerReady
        filePath: directory.selectedFile.filePath,
      }
    : null;

  useEffect(() => {
    if (currentExercise) {
      localStorage.setItem(LAST_TRAINER_EXERCISE_KEY, currentExercise.id);
    }
  }, [currentExercise]);

  // Metronome config — lifted here so evaluation can read count-in state
  const [metronomeConfig, setMetronomeConfig] = useState<MetronomeConfig>(() => {
    try {
      const saved = localStorage.getItem(METRONOME_CONFIG_LS_KEY);
      if (saved) return { ...JSON.parse(saved) };
    } catch { /* ignore */ }
    return { enabled: false, countInBars: 0, clickSound: 'default', accentFirstBeat: true, volume: 1 };
  });

  useEffect(() => {
    localStorage.setItem(METRONOME_CONFIG_LS_KEY, JSON.stringify(metronomeConfig));
  }, [metronomeConfig]);

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
  // Metronome page imperative ref (for keyboard shortcuts)
  const metronomeRef = useRef<MetronomeHandle>(null);
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

  const evaluation = useEvaluation({
    expectedNotes: noteData,
    isPlaying,
    isListening: effectiveListening,
    evaluationEnabled: currentView === 'trainer',
    lastDetectedNote: effectiveLastNote,
    scorePositionRef,
  });

  // Snapshot the best score before this run so PostExerciseSummary can compare against it.
  // Intentionally not depending on progressData — we want the value at the moment summary first
  // appears, before saveProgress updates the store.
  const previousBest = useMemo(
    () => (evaluation.summary && currentExercise
      ? (progress.progressData[currentExercise.id]?.bestScore ?? null)
      : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [evaluation.summary, currentExercise?.id],
  );

  // Save progress when an evaluation finishes
  useEffect(() => {
    if (currentView === 'trainer' && evaluation.summary && currentExercise) {
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
    }
  }, [currentView, evaluation.summary, currentExercise, progress]);

  // ── Next exercise (if available) ───────────────────
  const currentIndex = currentExercise ? exercises.findIndex((e) => e.id === currentExercise.id) : -1;
  const nextExercise = currentIndex >= 0 && currentIndex < exercises.length - 1 ? exercises[currentIndex + 1] : null;

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
    playPause: () =>
      currentView === 'metronome'
        ? metronomeRef.current?.toggle()
        : alphaTabRef.current?.playPause(),
    stop: () =>
      currentView === 'metronome'
        ? metronomeRef.current?.stop()
        : alphaTabRef.current?.stop(),
    toggleLoop: () => alphaTabRef.current?.toggleLoop(),
    toggleMetronome: () =>
      setMetronomeConfig((c) => ({ ...c, enabled: !c.enabled })),
    toggleCountIn: () =>
      setMetronomeConfig((c) => ({ ...c, countInBars: c.countInBars > 0 ? 0 : 1 })),
    toggleTracks: () => alphaTabRef.current?.toggleTracks(),
    toggleFullscreen,
    moveToPreviousBar: () => alphaTabRef.current?.moveToPreviousBar(),
    moveToNextBar: () => alphaTabRef.current?.moveToNextBar(),
    moveToPreviousLine: () => alphaTabRef.current?.moveToPreviousLine(),
    moveToNextLine: () => alphaTabRef.current?.moveToNextLine(),
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
    <PortalContainerContext.Provider value={isFullscreen ? mainRef.current : null}>
    <TooltipProvider>
      <div ref={mainRef} className="h-screen bg-background flex flex-col overflow-hidden">
        {/* Header with Navigation */}
        <header className="bg-zinc-700 border-b border-border py-4 px-6 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3 flex-1">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg">
              <Activity size={24} />
            </div>
            <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
              Bass Trainer
            </h1>
          </div>

          {/* Center Navigation Menu */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateTo('directory')}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                currentView === 'directory'
                  ? 'bg-white/15 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/10'
              }`}
              title="Exercise Directory"
            >
              <FolderTree size={24} />
              <span className="text-xs font-medium">Directory</span>
            </button>
            <button
              onClick={() => navigateTo('trainer')}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                currentView === 'trainer'
                  ? 'bg-white/15 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/10'
              }`}
              title="Groove Trainer"
            >
              <Activity size={24} />
              <span className="text-xs font-medium">Trainer</span>
            </button>
            <button
              onClick={() => navigateTo('tuner')}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                currentView === 'tuner'
                  ? 'bg-white/15 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/10'
              }`}
              title="Bass Tuner"
            >
              <AudioLines size={24} />
              <span className="text-xs font-medium">Tuner</span>
            </button>
            <button
              onClick={() => navigateTo('metronome')}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                currentView === 'metronome'
                  ? 'bg-white/15 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/10'
              }`}
              title="Metronome"
            >
              <MetronomeIcon size={24} />
              <span className="text-xs font-medium">Metronome</span>
            </button>
          </div>

          <div className="flex items-center gap-1 flex-1 justify-end">
            <button
              onClick={() => setShowWelcome(true)}
              className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-white/10 rounded-full transition-colors hidden sm:block"
              title="About Bass Trainer"
            >
              <Info size={20} />
            </button>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-white/10 rounded-full transition-colors"
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
                    ['Escape / Home', 'Return to start'],
                    ['← / →', 'Previous / Next bar'],
                    ['↑ / ↓', 'Previous / Next line'],
                    ['L', 'Toggle loop'],
                    ['M', 'Toggle metronome'],
                    ['C', 'Toggle count-in'],
                    ['T', 'Tracks / Mixer'],
                    ['F', 'Fullscreen'],
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
              className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-white/10 rounded-full transition-colors"
              title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </header>

        {/* Main Content Layout */}
        <div className="flex-1 flex min-h-0 relative z-10">
          {/* Directory View */}
          {currentView === 'directory' && (
            <>
              {sidebarOpen ? (
                <>
                  <div
                    className="sm:hidden fixed inset-0 bg-black/50 z-30 animate-in fade-in"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                  />
                  <aside className="w-full sm:w-72 shrink-0 bg-zinc-700 border-r border-border flex flex-col overflow-hidden absolute inset-0 z-40 sm:relative sm:inset-auto shadow-2xl sm:shadow-none animate-in slide-in-from-left duration-200">
                    <div className="flex items-center justify-between px-3 pt-3 pb-2 shrink-0 border-b border-white/10 sm:border-none">
                      <h3 className="font-semibold text-zinc-200 text-sm">Directory</h3>
                      <button
                        onClick={() => setSidebarOpen(false)}
                        className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-white/10 rounded transition-colors"
                        title="Collapse sidebar"
                      >
                        <PanelLeftClose size={16} />
                      </button>
                    </div>
                    <div className="flex-1 min-h-0">
                      <ExerciseDirectoryTree
                        root={directory.root}
                        selectedNodeId={directory.selectedNodeId}
                        selectedFolderId={directory.selectedFolderId}
                        onSelectNode={directory.selectNode}
                        onToggleFolder={directory.toggleFolder}
                      />
                    </div>
                  </aside>
                </>
              ) : (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="shrink-0 self-start m-2 p-2 bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-lg"
                  title="Show directory"
                >
                  <PanelLeftOpen size={20} />
                </button>
              )}

              <section className="flex-1 flex flex-col bg-card min-h-0 min-w-0">
                {directoryExercise ? (
                  <AlphaTabView
                    ref={alphaTabRef}
                    key={directoryExercise.id}
                    exercise={directoryExercise}
                    sidebarWidth={sidebarOpen ? 288 : 52}
                    metronomeConfig={metronomeConfig}
                    onMetronomeConfigChange={setMetronomeConfig}
                    onNoteDataExtracted={(notes) => setNoteData(notes)}
                    onPlayStateChange={handlePlayStateChange}
                    onPositionChange={handlePositionChange}
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground animate-in fade-in zoom-in-95 duration-300">
                    <div className="bg-muted p-6 rounded-full mb-6">
                      <FolderTree size={48} className="text-primary/50" />
                    </div>
                    <h2 className="text-2xl font-semibold text-foreground mb-3">Exercise Directory</h2>
                    <p className="max-w-md text-sm leading-relaxed">
                      Put your files in repository-exercises/, run npm run exercises:convert, then reload this page.
                    </p>
                    {!sidebarOpen && (
                      <button
                        onClick={() => setSidebarOpen(true)}
                        className="mt-8 px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors font-medium"
                      >
                        Open Directory
                      </button>
                    )}
                  </div>
                )}
              </section>
            </>
          )}

          {/* Trainer View */}
          {currentView === 'trainer' && (
            <>
              {/* Exercise Picker Sidebar — flush left */}
              {sidebarOpen ? (
                <>
                  {/* Overlay for mobile (hidden on desktop) */}
                  <div 
                    className="sm:hidden fixed inset-0 bg-black/50 z-30 animate-in fade-in"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                  />
                  <aside className="w-full sm:w-64 shrink-0 bg-zinc-700 border-r border-border flex flex-col overflow-hidden absolute inset-0 z-40 sm:relative sm:inset-auto shadow-2xl sm:shadow-none animate-in slide-in-from-left duration-200">
                    <div className="flex items-center justify-between px-3 pt-3 pb-2 shrink-0 border-b border-white/10 sm:border-none">
                      <h3 className="font-semibold text-zinc-200 text-sm">Exercises</h3>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to reset all progress?')) {
                              progress.clearProgress();
                            }
                          }}
                          className="p-1 text-zinc-400 hover:text-rose-400 hover:bg-white/10 rounded transition-colors"
                          title="Reset all progress"
                        >
                          <RotateCcw size={16} />
                        </button>
                        <button
                          onClick={() => setSidebarOpen(false)}
                          className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-white/10 rounded transition-colors"
                          title="Collapse sidebar"
                        >
                          <PanelLeftClose size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-autohide">
                      <ExercisePicker
                        exercises={exercises}
                        currentId={currentExercise?.id}
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
              <section className="flex-1 flex flex-col bg-card min-h-0 min-w-0">
                {currentExercise ? (
                  <AlphaTabView
                    ref={alphaTabRef}
                    key={currentExercise.id}
                    exercise={currentExercise}
                    sidebarWidth={sidebarOpen ? 256 : 52}
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
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground animate-in fade-in zoom-in-95 duration-300">
                    <div className="bg-muted p-6 rounded-full mb-6">
                      <Activity size={48} className="text-primary/50" />
                    </div>
                    <h2 className="text-2xl font-semibold text-foreground mb-3">Welcome to Bass Trainer</h2>
                    <p className="max-w-md text-sm leading-relaxed">
                      Select an exercise from the sidebar to start practicing your bass skills.
                    </p>
                    {!sidebarOpen && (
                      <button
                        onClick={() => setSidebarOpen(true)}
                        className="mt-8 px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors font-medium"
                      >
                        Open Exercises
                      </button>
                    )}
                  </div>
                )}
              </section>
            </>
          )}

          {/* Tuner View */}
          {currentView === 'tuner' && (
            <TunerPage
              isListening={audio.isListening}
              currentPitch={audio.currentPitch}
              audioStart={audio.start}
              audioError={audio.error}
            />
          )}

          {/* Metronome View */}
          {currentView === 'metronome' && (
            <MetronomePage ref={metronomeRef} />
          )}
        </div>

        {/* Post-exercise summary overlay */}
        {currentView === 'trainer' && evaluation.summary && currentExercise && (
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
    </PortalContainerContext.Provider>
  );
}

export default App;
