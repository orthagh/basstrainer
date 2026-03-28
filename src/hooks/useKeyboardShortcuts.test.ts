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
    toggleCountIn: vi.fn(),
    toggleTracks: vi.fn(),
    toggleFullscreen: vi.fn(),
    moveToPreviousBar: vi.fn(),
    moveToNextBar: vi.fn(),
    moveToPreviousLine: vi.fn(),
    moveToNextLine: vi.fn(),
    enabled: true,
    ...overrides,
  };
}

function fireKey(code: string, key?: string, target?: HTMLElement) {
  const event = new KeyboardEvent('keydown', {
    code,
    key: key ?? code,
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
    fireKey('Space', ' ');
    expect(actions.playPause).toHaveBeenCalledOnce();
  });

  it('Escape triggers stop', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('Escape', 'Escape');
    expect(actions.stop).toHaveBeenCalledOnce();
  });

  it('KeyL triggers toggleLoop', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('KeyL', 'l');
    expect(actions.toggleLoop).toHaveBeenCalledOnce();
  });

  it('KeyM triggers toggleMetronome', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('KeyM', 'm');
    expect(actions.toggleMetronome).toHaveBeenCalledOnce();
  });

  it('KeyF triggers toggleFullscreen', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('KeyF', 'f');
    expect(actions.toggleFullscreen).toHaveBeenCalledOnce();
  });

  it('ArrowLeft triggers moveToPreviousBar', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('ArrowLeft', 'ArrowLeft');
    expect(actions.moveToPreviousBar).toHaveBeenCalledOnce();
  });

  it('ArrowRight triggers moveToNextBar', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('ArrowRight', 'ArrowRight');
    expect(actions.moveToNextBar).toHaveBeenCalledOnce();
  });

  it('ArrowUp triggers moveToPreviousLine', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('ArrowUp', 'ArrowUp');
    expect(actions.moveToPreviousLine).toHaveBeenCalledOnce();
  });

  it('ArrowDown triggers moveToNextLine', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('ArrowDown', 'ArrowDown');
    expect(actions.moveToNextLine).toHaveBeenCalledOnce();
  });

  it('does nothing when disabled', () => {
    actions.enabled = false;
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('Space', ' ');
    fireKey('Escape', 'Escape');
    fireKey('KeyL', 'l');
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
      key: ' ',
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
      key: 'Escape',
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
