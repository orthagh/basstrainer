export type StaveProfile = 'Default' | 'Score' | 'Tab';

export const STAVE_PROFILE_LS_KEY = 'groovetrainer:staveProfile';

export function loadStaveProfile(): StaveProfile {
  const LS_KEY = STAVE_PROFILE_LS_KEY;
  const v = localStorage.getItem(LS_KEY);
  if (v === 'Default' || v === 'Score' || v === 'Tab') return v;
  return 'Default';
}

export function staveProfileToToggles(p: StaveProfile): { showStandard: boolean; showTab: boolean } {
  return {
    showStandard: p === 'Default' || p === 'Score',
    showTab: p === 'Default' || p === 'Tab',
  };
}

export function togglesToStaveProfile(showStandard: boolean, showTab: boolean): StaveProfile {
  if (showStandard && showTab) return 'Default';
  if (showStandard) return 'Score';
  return 'Tab';
}
