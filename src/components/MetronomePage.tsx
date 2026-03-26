/**
 * MetronomePage — standalone metronome view.
 *
 * Self-contained: uses `useMetronome` internally and exposes a
 * `MetronomeHandle` imperative ref so App.tsx can route keyboard
 * shortcuts (Space / Escape / arrow keys) to the active page.
 */

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { SlidersHorizontal, Volume2 } from 'lucide-react';
import { useMetronome, type MetronomeHandle } from '../hooks/useMetronome';
import RhythmPicker from './RhythmPicker';
import BpmDisplay from './BpmDisplay';
import {
  playClickPreview,
  type ClickSound,
} from '../audio/clickSynth';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const SOUND_LABELS: Record<ClickSound, string> = {
  default: 'Default',
  woodblock: 'Woodblock',
  rimshot: 'Rimshot',
  cowbell: 'Cowbell',
  mechanical: 'Mechanical',
};

export type { MetronomeHandle };

const MetronomePage = forwardRef<MetronomeHandle>((_props, ref) => {
  const m = useMetronome();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [tapWave, setTapWave] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (m.isRunning) {
      startTimeRef.current = Date.now() - elapsed * 1000;
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current!) / 1000));
      }, 500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
      startTimeRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [m.isRunning]);

  const handleTap = useCallback(() => {
    m.tap();
    setTapWave((n) => n + 1);
  }, [m.tap]);

  // Expose imperative controls for App.tsx keyboard shortcuts
  useImperativeHandle(
    ref,
    () => ({
      toggle: m.toggle,
      stop: m.stop,
      changeTempo: m.changeTempo,
    }),
    [m.toggle, m.stop, m.changeTempo],
  );

  return (
    <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto p-6 md:p-10 bg-gradient-to-br from-background to-muted/50 scrollbar-autohide">
      <div className="w-full max-w-md space-y-4">

        {/* ── Rhythm ────────────────────────────────────── */}
        <section
          className="bg-card border border-border rounded-xl p-5"
          aria-label="Rhythm pattern"
        >
          {/* Tempo row */}
          <div className="flex items-center justify-center pb-4">
            <div key={tapWave} className="tap-glow rounded-lg">
              <BpmDisplay
                value={m.tempo}
                onChange={m.setTempo}
                min={20}
                max={300}
              />
            </div>
          </div>
          <RhythmPicker
            beatsPerBar={m.beatsPerBar}
            subdivision={m.subdivision}
            accentPattern={m.accentPattern}
            currentBeat={m.currentBeat}
            isPlaying={m.isRunning}
            onBeatsChange={m.setBeatsPerBar}
            onSubdivisionChange={m.setSubdivision}
            onAccentToggle={m.toggleAccent}
          />
        </section>

        {/* ── Transport ─────────────────────────────────── */}
        <div aria-label="Transport">
          <div className="relative flex items-center justify-center gap-3">

            {/* Tap tempo — left */}
            <button
              onClick={handleTap}
              className="p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors select-none"
              aria-label="Tap tempo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <path d="M8 13v-8.5a1.5 1.5 0 0 1 3 0v7.5" />
                <path d="M11 11.5v-2a1.5 1.5 0 0 1 3 0v2.5" />
                <path d="M14 10.5a1.5 1.5 0 0 1 3 0v1.5" />
                <path d="M17 11.5a1.5 1.5 0 0 1 3 0v4.5a6 6 0 0 1 -6 6h-2h.208a6 6 0 0 1 -5.012 -2.7l-.196 -.3c-.312 -.479 -1.407 -2.388 -3.286 -5.728a1.5 1.5 0 0 1 .536 -2.022a1.867 1.867 0 0 1 2.28 .28l1.47 1.47" />
                <path d="M5 3l-1 -1" /><path d="M4 7h-1" /><path d="M14 3l1 -1" /><path d="M15 6h1" />
              </svg>
            </button>

            {/* Start / Stop — center */}
            <button
              onClick={m.toggle}
              className={`flex-1 rounded-xl font-bold tracking-wide transition-colors ${
                m.isRunning
                  ? 'py-3 bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/30'
                  : 'py-4 text-lg bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
              aria-label={m.isRunning ? 'Stop metronome' : 'Start metronome'}
              aria-pressed={m.isRunning}
              aria-live="polite"
            >
              {m.isRunning ? (
                <span className="flex flex-col items-center gap-0.5">
                  <span className="flex items-center justify-center gap-3 text-lg">
                    <span aria-hidden="true" className="text-base leading-none relative -top-0.5">■</span>
                    <span className="tabular-nums font-mono leading-none">
                      {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
                    </span>
                  </span>
                  <span className="text-xs font-semibold opacity-70 tabular-nums">Bar {m.currentBar}</span>
                </span>
              ) : '▶ Start'}
            </button>

            {/* Advanced — right */}
            <button
              onClick={() => setAdvancedOpen((o) => !o)}
              className="p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-expanded={advancedOpen}
              aria-label="Advanced options"
            >
              <SlidersHorizontal size={20} aria-hidden="true" />
            </button>

          </div>
        </div>

        {/* ── Advanced (collapsible) ─────────────────────── */}
        <section className="overflow-hidden" aria-label="Advanced options">
          {advancedOpen && (
            <div className="px-1 pb-3 space-y-5 pt-3">

              {/* Click sound */}
              <div className="space-y-2 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Click sound
                </p>
                <div className="flex items-center gap-2">
                  <Select
                    value={m.clickSound}
                    onValueChange={(v) => m.setClickSound(v as ClickSound)}
                  >
                    <SelectTrigger className="h-9 text-sm flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SOUND_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key} className="text-sm">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    onClick={() => playClickPreview(m.clickSound)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Preview click sound"
                    aria-label="Preview click sound"
                  >
                    <Volume2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Volume */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Volume2 size={12} aria-hidden="true" />
                    Volume
                  </p>
                  <span className="text-xs font-mono text-muted-foreground tabular-nums">
                    {Math.round(m.volume * 100)}%
                  </span>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.05}
                  value={[m.volume]}
                  onValueChange={([v]) => m.setVolume(v)}
                />
              </div>

              {/* Silent bars */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Silent bars
                  </p>
                  <button
                    onClick={() =>
                      m.setSilentBarsEnabled(!m.silentBarsEnabled)
                    }
                    role="switch"
                    aria-checked={m.silentBarsEnabled}
                    className={`relative w-10 h-[22px] rounded-full transition-colors ${
                      m.silentBarsEnabled ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        m.silentBarsEnabled ? 'translate-x-[18px]' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {m.silentBarsEnabled && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                    <span>Play</span>
                    <CountInput
                      value={m.playBarsCount}
                      onChange={m.setPlayBarsCount}
                      min={1}
                      max={8}
                    />
                    <span>
                      bar{m.playBarsCount !== 1 ? 's' : ''}, mute
                    </span>
                    <CountInput
                      value={m.silentBarsCount}
                      onChange={m.setSilentBarsCount}
                      min={1}
                      max={8}
                    />
                    <span>bar{m.silentBarsCount !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
});

MetronomePage.displayName = 'MetronomePage';

export default MetronomePage;

// ── CountInput ────────────────────────────────────────────────────────────────

interface CountInputProps {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
}

function CountInput({ value, onChange, min, max }: CountInputProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-6 h-6 rounded bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 text-sm font-bold flex items-center justify-center transition-colors"
        aria-label="Decrease"
      >
        −
      </button>
      <span className="w-6 text-center font-bold text-foreground tabular-nums">
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-6 h-6 rounded bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 text-sm font-bold flex items-center justify-center transition-colors"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}
