/**
 * Tests for NoteEvaluationOverlay component.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import NoteEvaluationOverlay from './NoteEvaluationOverlay';
import type { BeatRect } from './NoteEvaluationOverlay';
import type { NoteEvaluation } from '../evaluation/types';

// ── Helpers ─────────────────────────────────────────────────

function makeEval(overrides: Partial<NoteEvaluation> = {}): NoteEvaluation {
  return {
    expectedIndex: 0,
    expected: { midi: 40, startMs: 1000, durationMs: 250, beatIndex: 0 },
    detected: {
      midi: 40,
      frequency: 82.41,
      noteName: 'E2',
      time: 1.0,
      rms: 0.3,
    },
    timingOffsetMs: 0,
    pitchOffsetSemitones: 0,
    isHit: true,
    ...overrides,
  };
}

function makeBoundsMap(entries: [number, BeatRect][]): Map<number, BeatRect> {
  return new Map(entries);
}

const defaultBounds = makeBoundsMap([
  [0, { x: 10, y: 20, w: 50, h: 40 }],
  [1, { x: 70, y: 20, w: 50, h: 40 }],
  [2, { x: 130, y: 20, w: 50, h: 40 }],
]);

// ── Tests ───────────────────────────────────────────────────

describe('NoteEvaluationOverlay', () => {
  it('renders nothing when evaluations are empty', () => {
    const { container } = render(
      <NoteEvaluationOverlay evaluations={[]} beatBoundsMap={defaultBounds} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when beatBoundsMap is empty', () => {
    const { container } = render(
      <NoteEvaluationOverlay
        evaluations={[makeEval()]}
        beatBoundsMap={new Map()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a green indicator for a hit note', () => {
    const { container } = render(
      <NoteEvaluationOverlay
        evaluations={[makeEval({ isHit: true, timingOffsetMs: 5 })]}
        beatBoundsMap={defaultBounds}
      />,
    );

    const indicators = container.querySelectorAll('.note-eval-indicator');
    // Should have 2 indicators per beat: background tint + bottom strip
    expect(indicators.length).toBe(2);
    // Check green color (#22c55e)
    const tint = indicators[0] as HTMLElement;
    expect(tint.style.backgroundColor).toBe('rgb(34, 197, 94)');
  });

  it('renders an orange indicator with arrow for timing-off note', () => {
    const { container } = render(
      <NoteEvaluationOverlay
        evaluations={[makeEval({ isHit: true, timingOffsetMs: -30 })]}
        beatBoundsMap={defaultBounds}
      />,
    );

    const indicators = container.querySelectorAll('.note-eval-indicator');
    // 3 indicators: tint + strip + arrow
    expect(indicators.length).toBe(3);

    // Check amber color (#f59e0b)
    const tint = indicators[0] as HTMLElement;
    expect(tint.style.backgroundColor).toBe('rgb(245, 158, 11)');

    // Arrow should be ↑ (rush — early)
    const arrow = indicators[2] as HTMLElement;
    expect(arrow.textContent).toBe('↑');
  });

  it('shows ↓ arrow for late timing-off note', () => {
    const { container } = render(
      <NoteEvaluationOverlay
        evaluations={[makeEval({ isHit: true, timingOffsetMs: 40 })]}
        beatBoundsMap={defaultBounds}
      />,
    );

    const arrows = Array.from(
      container.querySelectorAll('.note-eval-indicator'),
    ).filter((el) => el.textContent === '↓');
    expect(arrows.length).toBe(1);
  });

  it('renders a red indicator for a missed note', () => {
    const { container } = render(
      <NoteEvaluationOverlay
        evaluations={[
          makeEval({
            isHit: false,
            detected: null,
            timingOffsetMs: 0,
          }),
        ]}
        beatBoundsMap={defaultBounds}
      />,
    );

    const indicators = container.querySelectorAll('.note-eval-indicator');
    expect(indicators.length).toBe(2); // tint + strip, no arrow
    const tint = indicators[0] as HTMLElement;
    expect(tint.style.backgroundColor).toBe('rgb(239, 68, 68)');
  });

  it('uses worst status when multiple evaluations share a beat', () => {
    const { container } = render(
      <NoteEvaluationOverlay
        evaluations={[
          makeEval({ isHit: true, timingOffsetMs: 5, expected: { midi: 40, startMs: 1000, durationMs: 250, beatIndex: 0 } }),
          makeEval({ isHit: false, detected: null, expected: { midi: 43, startMs: 1000, durationMs: 250, beatIndex: 0 } }),
        ]}
        beatBoundsMap={defaultBounds}
      />,
    );

    // Only 1 beat rendered (beatIndex 0), and it should be red (miss > hit)
    const indicators = container.querySelectorAll('.note-eval-indicator');
    const tint = indicators[0] as HTMLElement;
    expect(tint.style.backgroundColor).toBe('rgb(239, 68, 68)');
  });

  it('renders indicators for multiple beats', () => {
    const { container } = render(
      <NoteEvaluationOverlay
        evaluations={[
          makeEval({ expected: { midi: 40, startMs: 1000, durationMs: 250, beatIndex: 0 } }),
          makeEval({ expected: { midi: 43, startMs: 1500, durationMs: 250, beatIndex: 1 } }),
        ]}
        beatBoundsMap={defaultBounds}
      />,
    );

    // 2 beats × 2 indicators each = 4
    const indicators = container.querySelectorAll('.note-eval-indicator');
    expect(indicators.length).toBe(4);
  });

  it('skips beat indices not present in boundsMap', () => {
    const { container } = render(
      <NoteEvaluationOverlay
        evaluations={[
          makeEval({ expected: { midi: 40, startMs: 1000, durationMs: 250, beatIndex: 99 } }),
        ]}
        beatBoundsMap={defaultBounds}
      />,
    );

    // beatIndex 99 is not in the map — nothing rendered (overlay div exists but empty)
    const indicators = container.querySelectorAll('.note-eval-indicator');
    expect(indicators.length).toBe(0);
  });
});
