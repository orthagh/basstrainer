/**
 * DisplaySettings — advanced display options dropdown.
 *
 * Single button with a sliders icon that opens a popover.
 * Preference is persisted to localStorage.
 */

import { useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { AlignLeft, Moon, Music, SlidersHorizontal } from 'lucide-react';
import { staveProfileToToggles, togglesToStaveProfile, STAVE_PROFILE_LS_KEY, type StaveProfile } from '@/lib/displaySettings';

// ── Component ─────────────────────────────────────────────────────────────────

interface DisplaySettingsProps {
  staveProfile: StaveProfile;
  onChange: (profile: StaveProfile) => void;
  scoreDark: boolean;
  onScoreDarkChange: (v: boolean) => void;
  disabled?: boolean;
}

export default function DisplaySettings({
  staveProfile,
  onChange,
  scoreDark,
  onScoreDarkChange,
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
      localStorage.setItem(STAVE_PROFILE_LS_KEY, profile);
      onChange(profile);
    },
    [showStandard, showTab, onChange],
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-40 text-muted-foreground hover:bg-muted"
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
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Notation
            </p>
            <NotationRow
              icon={<Music size={13} />}
              label="Standard"
              description="Sheet music"
              checked={showStandard}
              onChange={(v) => toggle('showStandard', v)}
            />
            <NotationRow
              icon={<AlignLeft size={13} />}
              label="Tab"
              description="Guitar tablature"
              checked={showTab}
              onChange={(v) => toggle('showTab', v)}
            />
          </div>

          <Separator />

          {/* Appearance toggles */}
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Appearance
            </p>
            <NotationRow
              icon={<Moon size={13} />}
              label="Dark score"
              description="Invert notation colours"
              checked={scoreDark}
              onChange={onScoreDarkChange}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── NotationRow ───────────────────────────────────────────────────────────────

interface NotationRowProps {
  icon: ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}

function NotationRow({ icon, label, description, checked, onChange }: NotationRowProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
        checked ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'
      }`}
    >
      <div className="flex items-center gap-2.5 text-left">
        <span className="shrink-0 opacity-70">{icon}</span>
        <div>
          <div className="text-xs font-medium">{label}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{description}</div>
        </div>
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
