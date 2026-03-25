/**
 * Tests for useKeyboardShortcuts hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import type { KeyboardShortcutActions } from './useKeyboardShortcuts';

function makeActions(overrides: Partial<KeyboardShortcutActions> = {}): KeyboardShortcutActions {
  return {
    playPause: vi.fn(),
    stop: vi.fn(),
    toggleLoop: vi.fn(),
    toggleMetronome: vi.fn(),
    toggleFullscreen: vi.fn(),
    tempoChange: vi.fn(),
    enabled: true,
    ...overrides,
  };
}

function fireKey(code: string, target?: HTMLElement) {
  const event = new KeyboardEvent('keydown', {
    code,
    bubbles: true,
    cancelable: true,
  });
  (target ?? window).dispatchEvent(event);
}

describe('useKeyboardShortcuts', () => {
  let actions: KeyboardShortcutActions;

  beforeEach(() => {
    actions = makeActions();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Space triggers playPause', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('Space');
    expect(actions.playPause).toHaveBeenCalledOnce();
  });

  it('Escape triggers stop', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('Escape');
    expect(actions.stop).toHaveBeenCalledOnce();
  });

  it('KeyL triggers toggleLoop', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('KeyL');
    expect(actions.toggleLoop).toHaveBeenCalledOnce();
  });

  it('KeyM triggers toggleMetronome', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('KeyM');
    expect(actions.toggleMetronome).toHaveBeenCalledOnce();
  });

  it('KeyF triggers toggleFullscreen', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('KeyF');
    expect(actions.toggleFullscreen).toHaveBeenCalledOnce();
  });

  it('ArrowLeft triggers tempoChange(-5)', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('ArrowLeft');
    expect(actions.tempoChange).toHaveBeenCalledWith(-5);
  });

  it('ArrowRight triggers tempoChange(+5)', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('ArrowRight');
    expect(actions.tempoChange).toHaveBeenCalledWith(5);
  });

  it('ArrowUp triggers tempoChange(+1)', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('ArrowUp');
    expect(actions.tempoChange).toHaveBeenCalledWith(1);
  });

  it('ArrowDown triggers tempoChange(-1)', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('ArrowDown');
    expect(actions.tempoChange).toHaveBeenCalledWith(-1);
  });

  it('does nothing when disabled', () => {
    actions.enabled = false;
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('Space');
    fireKey('Escape');
    fireKey('KeyL');
    expect(actions.playPause).not.toHaveBeenCalled();
    expect(actions.stop).not.toHaveBeenCalled();
    expect(actions.toggleLoop).not.toHaveBeenCalled();
  });

  it('ignores events when target is an input element', () => {
    renderHook(() => useKeyboardShortcuts(actions));

    const input = document.createElement('input');
    document.body.appendChild(input);

    const event = new KeyboardEvent('keydown', {
      code: 'Space',
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(event);

    expect(actions.playPause).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('ignores events when target is a textarea', () => {
    renderHook(() => useKeyboardShortcuts(actions));

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const event = new KeyboardEvent('keydown', {
      code: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    textarea.dispatchEvent(event);

    expect(actions.stop).not.toHaveBeenCalled();
    document.body.removeChild(textarea);
  });

  it('cleans up event listener on unmount', () => {
    const spy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useKeyboardShortcuts(actions));
    unmount();
    expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});
