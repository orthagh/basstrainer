import { Activity, Crosshair, FolderOpen, Mic, Music, Play } from 'lucide-react';

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
          <div className="flex justify-center mb-6">
            <div className="bg-primary text-primary-foreground p-4 rounded-full shadow-lg">
              <Activity size={40} />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center text-foreground mb-3">
            Bass Groove Trainer
          </h2>
          <p className="text-center text-muted-foreground mb-8 text-sm">
            A personal practice tool for bass — play along with tablature, get timing feedback, and track your progress.
          </p>

          <div className="space-y-4 mb-8">
            <div className="flex gap-4 items-start">
              <div className="bg-muted p-2 rounded-lg text-foreground shrink-0"><FolderOpen size={20} /></div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Your GP files</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Drop Guitar Pro files into <code className="text-xs bg-muted px-1 rounded">repository-exercises/</code> and they appear in the directory browser, loaded directly — no conversion step.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="bg-muted p-2 rounded-lg text-foreground shrink-0"><Mic size={20} /></div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Real-time feedback</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Play along with your microphone. The app analyses your timing and pitch in the browser as you play.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="bg-muted p-2 rounded-lg text-foreground shrink-0"><Crosshair size={20} /></div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Groove Lock score</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Post-exercise summary showing timing consistency, whether you rush or drag, and your best scores across sessions.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="bg-muted p-2 rounded-lg text-foreground shrink-0"><Play size={20} /></div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Playback controls</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Loop any section, adjust tempo, metronome with count-in and accent, and toggle between standard notation and tab.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="bg-muted p-2 rounded-lg text-foreground shrink-0"><Music size={20} /></div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Tuner & metronome</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Chromatic tuner with visual needle, and a standalone metronome with configurable subdivisions and click sounds.</p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            Let's Groove
          </button>
        </div>
      </div>
    </div>
  );
}
