import { FolderOpen, Music, Play } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-lg rounded-xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 sm:p-8">

          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-border bg-muted text-[10px] font-mono tracking-[0.2em] text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/70" />
              WELCOME
            </div>

            <h2 className="text-4xl font-medium tracking-tight leading-[1.1] text-foreground mb-4">
              Time to <span className="italic font-normal text-primary">groove</span>.
            </h2>

            <p className="text-sm leading-relaxed text-muted-foreground">
              A personal practice tool for bass — browse your Guitar Pro files, play along with tablature, and use the built-in tuner and metronome.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-4 mb-8">
            <div className="flex gap-4 items-start">
              <div className="bg-muted p-2 rounded-lg text-foreground shrink-0">
                <FolderOpen size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Your GP files</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Drop Guitar Pro files into{' '}
                  <code className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-xs text-foreground">repository-exercises/</code>
                  {' '}and they appear in the directory browser automatically.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="bg-muted p-2 rounded-lg text-foreground shrink-0">
                <Play size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Playback controls</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Loop any section, adjust tempo, metronome with count-in and accent, toggle notation and tab.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="bg-muted p-2 rounded-lg text-foreground shrink-0">
                <Music size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Tuner &amp; metronome</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Chromatic tuner with visual needle and glow feedback, standalone metronome with configurable subdivisions.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            Let&apos;s get started
          </button>
        </div>
      </div>
    </div>
  );
}
