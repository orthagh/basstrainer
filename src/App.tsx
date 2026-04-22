import { useState, useRef, useCallback, useEffect } from 'react';
import { Maximize, Minimize, PanelLeftClose, PanelLeftOpen, Keyboard, Info, AudioLines, FolderTree, Search, X } from 'lucide-react';
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
import WelcomeModal from './components/WelcomeModal';
import TunerPage from './components/TunerPage';
import MetronomePage, { type MetronomeHandle } from './components/MetronomePage';
import ExerciseDirectoryTree from './components/ExerciseDirectoryTree';
import type { Exercise } from './types';
import { useAudioInput } from './hooks/useAudioInput';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import type { MetronomeConfig } from './components/MetronomeSettings';
import { useExerciseDirectory } from './features/exerciseDirectory/useExerciseDirectory.ts';
import './components/alphatab.css';

type AppView = 'directory' | 'tuner' | 'metronome';

const VIEWS: AppView[] = ['directory', 'tuner', 'metronome'];
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

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dirSearchOpen, setDirSearchOpen] = useState(false);
  const [dirSearchQuery, setDirSearchQuery] = useState('');
  const directory = useExerciseDirectory();

  const directoryExercise: Exercise | null = directory.selectedFile
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

  // Metronome config — lifted here so it persists across view changes
  const [metronomeConfig, setMetronomeConfig] = useState<MetronomeConfig>(() => {
    try {
      const saved = localStorage.getItem(METRONOME_CONFIG_LS_KEY);
      if (saved) return { ...JSON.parse(saved) };
    } catch { /* ignore */ }
    return { enabled: false, countInBars: 0, volume: 1 };
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

  const audio = useAudioInput();

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
              <FolderTree size={24} />
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
            <a
              href="https://github.com/orthagh/basstrainer"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-white/10 rounded-full transition-colors hidden sm:block"
              title="View on GitHub"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
            </a>
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
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setDirSearchOpen((s) => {
                              if (s) setDirSearchQuery('');
                              return !s;
                            });
                          }}
                          className={`p-1 rounded transition-colors ${dirSearchOpen ? 'text-primary bg-white/10' : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/10'}`}
                          title="Search files"
                        >
                          <Search size={16} />
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
                    {dirSearchOpen && (
                      <div className="px-2 pb-2 shrink-0">
                        <div className="relative">
                          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                          <input
                            autoFocus
                            type="text"
                            value={dirSearchQuery}
                            onChange={(e) => setDirSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') { setDirSearchOpen(false); setDirSearchQuery(''); }
                            }}
                            placeholder="Filter files…"
                            className="w-full bg-zinc-800 text-zinc-200 text-xs rounded pl-6 pr-6 py-1.5 outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-zinc-500"
                          />
                          {dirSearchQuery && (
                            <button
                              onClick={() => setDirSearchQuery('')}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="flex-1 min-h-0">
                      <ExerciseDirectoryTree
                        root={directory.root}
                        selectedNodeId={directory.selectedNodeId}
                        selectedFolderId={directory.selectedFolderId}
                        onSelectNode={directory.selectNode}
                        onToggleFolder={directory.toggleFolder}
                        searchQuery={dirSearchQuery}
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

        {/* Welcome Modal Splash Screen */}
        <WelcomeModal isOpen={showWelcome} onClose={handleCloseWelcome} />
      </div>
    </TooltipProvider>
    </PortalContainerContext.Provider>
  );
}

export default App;
