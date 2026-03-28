/**
 * useKeyboardShortcuts — global keyboard shortcuts for the practice app.
 *
 * Non-printable keys use e.code (layout-independent physical position).
 * Letter shortcuts use e.key (layout-aware character), so they work on
 * AZERTY, QWERTZ, Dvorak, etc.
 *
 * Shortcuts:
 *   Space      → Play / Pause
 *   Escape     → Stop
 *   Home       → Return to start
 *   ←  / →    → Previous / Next bar
 *   ↑  / ↓    → Previous / Next line
 *   L          → Toggle loop
 *   M          → Toggle metronome
 *   C          → Toggle count-in
 *   T          → Toggle tracks/mixer
 *   F          → Toggle fullscreen
 */

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

export interface KeyboardShortcutActions {
  playPause: () => void;
  stop: () => void;
  toggleLoop: () => void;
  toggleMetronome: () => void;
  toggleCountIn: () => void;
  toggleTracks: () => void;
  toggleFullscreen: () => void;
  moveToPreviousBar: () => void;
  moveToNextBar: () => void;
  moveToPreviousLine: () => void;
  moveToNextLine: () => void;
  /** When true, shortcuts are active (player is ready). */
  enabled: boolean;
}

export function useKeyboardShortcuts(actions: KeyboardShortcutActions) {
  const handlerRef = useRef<((e: KeyboardEvent) => void) | null>(null);

  const handler = useCallback((e: KeyboardEvent) => {
    if (!actions.enabled) return;

    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    const editable = (e.target as HTMLElement)?.isContentEditable;
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || editable) return;

    // Arrow keys and special keys: use e.code (layout-independent physical position)
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        actions.playPause();
        return;
      case 'Escape':
        actions.stop();
        return;
      case 'Home':
        e.preventDefault();
        actions.stop();
        return;
      case 'ArrowLeft':
        e.preventDefault();
        actions.moveToPreviousBar();
        return;
      case 'ArrowRight':
        e.preventDefault();
        actions.moveToNextBar();
        return;
      case 'ArrowUp':
        e.preventDefault();
        actions.moveToPreviousLine();
        return;
      case 'ArrowDown':
        e.preventDefault();
        actions.moveToNextLine();
        return;
    }

    // Letter shortcuts: use e.key (layout-aware, works on AZERTY/QWERTZ/etc.)
    switch (e.key.toLowerCase()) {
      case 'l':
        actions.toggleLoop();
        break;
      case 'm':
        actions.toggleMetronome();
        break;
      case 'c':
        actions.toggleCountIn();
        break;
      case 't':
        actions.toggleTracks();
        break;
      case 'f':
        actions.toggleFullscreen();
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
