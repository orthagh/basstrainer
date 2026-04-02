/**
 * MetronomeSettings — popover with metronome options.
 *
 * - Toggle metronome on/off
 * - Bar countdown before playback
 * - Volume control
 */

import { useCallback } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Volume2, ChevronDown } from 'lucide-react';
import MetronomeIcon from './MetronomeIcon';

export interface MetronomeConfig {
  enabled: boolean;
  countInBars: number;
  /** 0–1 volume for the built-in AlphaTab metronome, default 1 */
  volume: number;
}

interface MetronomeSettingsProps {
  config: MetronomeConfig;
  onChange: (config: MetronomeConfig) => void;
  disabled?: boolean;
}

export default function MetronomeSettings({
  config,
  onChange,
  disabled = false,
}: MetronomeSettingsProps) {
  const update = useCallback(
    (patch: Partial<MetronomeConfig>) => {
      onChange({ ...config, ...patch });
    },
    [config, onChange],
  );

  const active = config.enabled;

  return (
    <Popover>
      <div className={`h-8 flex items-center rounded-lg overflow-hidden transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
        {/* Toggle button — left part */}
        <button
          disabled={disabled}
          onClick={() => update({ enabled: !active })}
          className="h-full flex items-center gap-1 px-2 transition-colors disabled:opacity-40 hover:bg-black/5 dark:hover:bg-white/10 rounded-l-lg"
          title={active ? 'Disable metronome (M)' : 'Enable metronome (M)'}
        >
          <MetronomeIcon size={18} />
          {/* Count-in badge — always visible when count-in is active */}
          {config.countInBars > 0 && (
            <span className="text-[10px] font-bold leading-none tabular-nums">
              +{config.countInBars}
            </span>
          )}
        </button>

        {/* Separator — only visible when active */}
        {active && <div className="w-px h-4 bg-primary/30" />}

        {/* Popover trigger — right part (chevron) */}
        <PopoverTrigger asChild>
          <button
            disabled={disabled}
            className="h-full flex items-center px-1.5 transition-colors disabled:opacity-40 hover:bg-black/5 dark:hover:bg-white/10 rounded-r-lg"
            title="Metronome settings (C to toggle count-in)"
          >
            <ChevronDown size={12} className="opacity-60" />
          </button>
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-64 p-4" align="end" sideOffset={8}>
        <div className="space-y-4">
          {/* Header */}
          <h4 className="text-sm font-semibold text-foreground">Metronome settings</h4>

          <Separator />

          {/* Count-in bars */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs" htmlFor="count-in">
                Count-in bars
              </Label>
              <span className="text-xs font-mono text-muted-foreground tabular-nums w-6 text-right">
                {config.countInBars}
              </span>
            </div>
            <Slider
              id="count-in"
              min={0}
              max={4}
              step={1}
              value={[config.countInBars]}
              onValueChange={([v]) => update({ countInBars: v })}
              disabled={disabled}
            />
            <p className="text-[10px] text-muted-foreground">
              {config.countInBars === 0
                ? 'No count-in'
                : `${config.countInBars} bar${config.countInBars > 1 ? 's' : ''} before playback`}
            </p>
          </div>

          <Separator />

          {/* Volume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1.5" htmlFor="click-volume">
                <Volume2 size={12} />
                Volume
              </Label>
              <span className="text-xs font-mono text-muted-foreground tabular-nums w-8 text-right">
                {Math.round(config.volume * 100)}%
              </span>
            </div>
            <Slider
              id="click-volume"
              min={0}
              max={1}
              step={0.05}
              value={[config.volume]}
              onValueChange={([v]) => update({ volume: v })}
              disabled={!config.enabled}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
