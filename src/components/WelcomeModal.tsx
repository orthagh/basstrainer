import { Activity, Crosshair, Mic, Play } from 'lucide-react';

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
            Welcome to Bass Groove Trainer
          </h2>
          <p className="text-center text-muted-foreground mb-8 text-sm">
            An interactive practice tool designed to help you lock in your rhythm and improve your timing on the bass.
          </p>

          <div className="space-y-5 mb-8">
            <div className="flex gap-4 items-start">
              <div className="bg-muted p-2 rounded-lg text-foreground shrink-0"><Mic size={20}/></div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Real-time Feedback</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Play along using your microphone. The app analyzes your timing and pitch as you play, right in the browser.</p>
              </div>
            </div>
            
            <div className="flex gap-4 items-start">
              <div className="bg-muted p-2 rounded-lg text-foreground shrink-0"><Crosshair size={20}/></div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Groove Lock</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Get detailed post-exercise summaries showing whether you tend to rush or drag the beat.</p>
              </div>
            </div>
            
            <div className="flex gap-4 items-start">
              <div className="bg-muted p-2 rounded-lg text-foreground shrink-0"><Play size={20}/></div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Interactive Tablature</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Loop sections, control the tempo, and use the built-in metronome to perfect difficult passages.</p>
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
