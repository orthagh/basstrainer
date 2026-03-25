/**
 * useKeyboardShortcuts — global keyboard shortcuts for the practice app.
 *
 * Shortcuts:
 *   Space      → Play / Pause
 *   Escape     → Stop
 *   L          → Toggle loop
 *   M          → Toggle metronome
 *   F          → Toggle fullscreen
 *   ← / →     → Decrease / Increase tempo by 5
 *   ↑ / ↓     → Decrease / Increase tempo by 1
 *   ?          → Show shortcut help (future)
 */

import { useEffect, useRef } from 'react';

export interface KeyboardShortcutActions {
  playPause: () => void;
  stop: () => void;
  toggleLoop: () => void;
  toggleMetronome: () => void;
  toggleFullscreen: () => void;
  tempoChange: (delta: number) => void;
  /** When true, shortcuts are active (player is ready). */
  enabled: boolean;
}

export function useKeyboardShortcuts(actions: KeyboardShortcutActions) {
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const a = actionsRef.current;
      if (!a.enabled) return;

      // Always swallow Space & arrows to prevent page / element scrolling,
      // even before we check the target element.
      if (
        e.code === 'Space' ||
        e.code === 'ArrowLeft' ||
        e.code === 'ArrowRight' ||
        e.code === 'ArrowUp' ||
        e.code === 'ArrowDown'
      ) {
        // …but let the user type in text inputs normally.
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        const editable = (e.target as HTMLElement)?.isContentEditable;
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || editable) return;
        e.preventDefault();
      }

      // Don't fire shortcuts when typing in inputs / textareas / selects
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const editable = (e.target as HTMLElement)?.isContentEditable;
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || editable) return;

      switch (e.code) {
        case 'Space':
          a.playPause();
          break;
        case 'Escape':
          a.stop();
          break;
        case 'KeyL':
          a.toggleLoop();
          break;
        case 'KeyM':
          a.toggleMetronome();
          break;
        case 'KeyF':
          a.toggleFullscreen();
          break;
        case 'ArrowLeft':
          a.tempoChange(-5);
          break;
        case 'ArrowRight':
          a.tempoChange(5);
          break;
        case 'ArrowDown':
          a.tempoChange(-1);
          break;
        case 'ArrowUp':
          a.tempoChange(1);
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
