/**
 * DisplaySettings — advanced display options dropdown.
 *
 * Single button with a sliders icon that opens a popover.
 * Preference is persisted to localStorage.
 */

import { useCallback } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { SlidersHorizontal } from 'lucide-react';

// ── Stave profile ────────────────────────────────────────────────────────────

export type StaveProfile = 'Default' | 'Score' | 'Tab';

const LS_KEY = 'groovetrainer:staveProfile';

export function loadStaveProfile(): StaveProfile {
  const v = localStorage.getItem(LS_KEY);
  if (v === 'Default' || v === 'Score' || v === 'Tab') return v;
  return 'Default';
}

/** Derive two independent booleans from the AlphaTab stave profile. */
export function staveProfileToToggles(p: StaveProfile): { showStandard: boolean; showTab: boolean } {
  return {
    showStandard: p === 'Default' || p === 'Score',
    showTab:      p === 'Default' || p === 'Tab',
  };
}

/** Convert two booleans back to a stave profile, ensuring at least one is on. */
function togglesToStaveProfile(showStandard: boolean, showTab: boolean): StaveProfile {
  if (showStandard && showTab) return 'Default';
  if (showStandard) return 'Score';
  return 'Tab';
}

// ── Component ─────────────────────────────────────────────────────────────────

interface DisplaySettingsProps {
  staveProfile: StaveProfile;
  onChange: (profile: StaveProfile) => void;
  disabled?: boolean;
}

export default function DisplaySettings({
  staveProfile,
  onChange,
  disabled = false,
}: DisplaySettingsProps) {
  const { showStandard, showTab } = staveProfileToToggles(staveProfile);

  const toggle = useCallback(
    (field: 'showStandard' | 'showTab', next: boolean) => {
      let s = field === 'showStandard' ? next : showStandard;
      let t = field === 'showTab'      ? next : showTab;
      // Prevent both from being off — force the other on.
      if (!s && !t) {
        if (field === 'showStandard') t = true; else s = true;
      }
      const profile = togglesToStaveProfile(s, t);
      localStorage.setItem(LS_KEY, profile);
      onChange(profile);
    },
    [showStandard, showTab, onChange],
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className="flex items-center p-2 rounded-lg transition-colors disabled:opacity-40 text-muted-foreground hover:bg-muted"
          title="Display settings"
        >
          <SlidersHorizontal size={16} />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-52 p-4" align="end" sideOffset={8}>
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Display</h4>
          <Separator />

          {/* Notation toggles */}
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Notation
            </p>
            <NotationRow
              label="Standard"
              description="Sheet music"
              checked={showStandard}
              onChange={(v) => toggle('showStandard', v)}
            />
            <NotationRow
              label="Tab"
              description="Guitar tablature"
              checked={showTab}
              onChange={(v) => toggle('showTab', v)}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── NotationRow ───────────────────────────────────────────────────────────────

interface NotationRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}

function NotationRow({ label, description, checked, onChange }: NotationRowProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
        checked ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'
      }`}
    >
      <div className="text-left">
        <div className="text-xs font-medium">{label}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{description}</div>
      </div>
      {/* Simple pill indicator */}
      <div
        className={`w-7 h-4 rounded-full transition-colors flex-shrink-0 ${
          checked ? 'bg-primary' : 'bg-muted-foreground/30'
        }`}
      >
        <div
          className={`w-3 h-3 rounded-full bg-white mt-0.5 transition-transform ${
            checked ? 'translate-x-3.5' : 'translate-x-0.5'
          }`}
        />
      </div>
    </button>
  );
}
