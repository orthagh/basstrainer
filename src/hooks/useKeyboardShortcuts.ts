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

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

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
  const handlerRef = useRef<((e: KeyboardEvent) => void) | null>(null);

  const handler = useCallback((e: KeyboardEvent) => {
    if (!actions.enabled) return;

    if (
      e.code === 'Space' ||
      e.code === 'ArrowLeft' ||
      e.code === 'ArrowRight' ||
      e.code === 'ArrowUp' ||
      e.code === 'ArrowDown'
    ) {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const editable = (e.target as HTMLElement)?.isContentEditable;
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || editable) return;
      e.preventDefault();
    }

    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    const editable = (e.target as HTMLElement)?.isContentEditable;
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || editable) return;

    switch (e.code) {
      case 'Space':
        actions.playPause();
        break;
      case 'Escape':
        actions.stop();
        break;
      case 'KeyL':
        actions.toggleLoop();
        break;
      case 'KeyM':
        actions.toggleMetronome();
        break;
      case 'KeyF':
        actions.toggleFullscreen();
        break;
      case 'ArrowLeft':
        actions.tempoChange(-5);
        break;
      case 'ArrowRight':
        actions.tempoChange(5);
        break;
      case 'ArrowDown':
        actions.tempoChange(-1);
        break;
      case 'ArrowUp':
        actions.tempoChange(1);
        break;
    }
  }, [actions]);

  // Store latest handler in a ref so the effect below can always re-register the current one.
  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => handlerRef.current?.(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
