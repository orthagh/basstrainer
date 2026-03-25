/**
 * Tests for EvaluationPanel component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EvaluationPanel from './EvaluationPanel';
import type { EvaluationSummary, NoteEvaluation } from '../evaluation/types';
import type { LiveResults } from '../hooks/useEvaluation';

// ── Helpers ─────────────────────────────────────────────────

const emptyLive: LiveResults = { hits: 0, misses: 0, total: 0, accuracy: 0 };

function makeDefaultProps(overrides: Record<string, unknown> = {}) {
  return {
    evaluationEnabled: true,
    setEvaluationEnabled: vi.fn(),
    isActive: false,
    isListening: false,
    toleranceLevel: 'medium' as const,
    changeTolerance: vi.fn(),
    latencyMs: 0,
    changeLatency: vi.fn(),
    liveResults: emptyLive,
    lastEvaluation: null as NoteEvaluation | null,
    summary: null as EvaluationSummary | null,
    dismissSummary: vi.fn(),
    ...overrides,
  };
}

function makeSummary(overrides: Partial<EvaluationSummary> = {}): EvaluationSummary {
  return {
    totalNotes: 10,
    hitCount: 8,
    missCount: 2,
    accuracy: 0.8,
    averageTimingOffsetMs: 5,
    timingDistribution: { early: 1, onTime: 6, late: 1 },
    pitchAccuracy: 0.9,
    timingStdDevMs: 15,
    grooveLock: 0.85,
    noteEvaluations: [],
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────

describe('EvaluationPanel', () => {
  it('shows "Enable to get scored" when evaluation is off', () => {
    render(
      <EvaluationPanel {...makeDefaultProps({ evaluationEnabled: false })} />,
    );
    expect(screen.getByText(/Enable to get scored/)).toBeInTheDocument();
  });

  it('toggles evaluation on/off when header button is clicked', () => {
    const setEnabled = vi.fn();
    render(
      <EvaluationPanel
        {...makeDefaultProps({
          evaluationEnabled: true,
          setEvaluationEnabled: setEnabled,
        })}
      />,
    );

    fireEvent.click(screen.getByText('ON'));
    expect(setEnabled).toHaveBeenCalledWith(false);
  });

  it('shows tolerance selector buttons when enabled', () => {
    render(<EvaluationPanel {...makeDefaultProps()} />);

    expect(screen.getByText('easy')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();
    expect(screen.getByText('hard')).toBeInTheDocument();
  });

  it('highlights the active tolerance level', () => {
    render(
      <EvaluationPanel {...makeDefaultProps({ toleranceLevel: 'hard' })} />,
    );

    const hardBtn = screen.getByText('hard');
    expect(hardBtn.className).toContain('text-primary');
  });

  it('calls changeTolerance when a tolerance button is clicked', () => {
    const changeTol = vi.fn();
    render(
      <EvaluationPanel
        {...makeDefaultProps({ changeTolerance: changeTol })}
      />,
    );

    fireEvent.click(screen.getByText('easy'));
    expect(changeTol).toHaveBeenCalledWith('easy');
  });

  it('disables tolerance buttons when evaluation is active', () => {
    render(
      <EvaluationPanel {...makeDefaultProps({ isActive: true })} />,
    );

    expect(screen.getByText('easy')).toBeDisabled();
    expect(screen.getByText('medium')).toBeDisabled();
    expect(screen.getByText('hard')).toBeDisabled();
  });

  it('shows latency slider', () => {
    render(
      <EvaluationPanel {...makeDefaultProps({ latencyMs: 25 })} />,
    );
    expect(screen.getByText('25ms')).toBeInTheDocument();
  });

  it('shows inactive message when not active and not listening', () => {
    render(<EvaluationPanel {...makeDefaultProps()} />);
    expect(screen.getByText(/Enable mic/)).toBeInTheDocument();
  });

  it('shows "Press play" when listening but not active', () => {
    render(
      <EvaluationPanel {...makeDefaultProps({ isListening: true })} />,
    );
    expect(screen.getByText(/Press play/)).toBeInTheDocument();
  });

  it('shows live results when active', () => {
    render(
      <EvaluationPanel
        {...makeDefaultProps({
          isActive: true,
          liveResults: { hits: 5, misses: 2, total: 7, accuracy: 0.71 },
        })}
      />,
    );

    expect(screen.getByText('71%')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows summary display after session', () => {
    render(
      <EvaluationPanel
        {...makeDefaultProps({
          summary: makeSummary(),
        })}
      />,
    );

    expect(screen.getByText('Session Summary')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('calls dismissSummary when Dismiss button is clicked', () => {
    const dismiss = vi.fn();
    render(
      <EvaluationPanel
        {...makeDefaultProps({
          summary: makeSummary(),
          dismissSummary: dismiss,
        })}
      />,
    );

    fireEvent.click(screen.getByText('Dismiss'));
    expect(dismiss).toHaveBeenCalledOnce();
  });

  it('shows timing tendency "Locked in" for small offset', () => {
    render(
      <EvaluationPanel
        {...makeDefaultProps({
          summary: makeSummary({ averageTimingOffsetMs: 3 }),
        })}
      />,
    );
    expect(screen.getByText(/Locked in/)).toBeInTheDocument();
  });

  it('shows timing tendency "Rushing" for negative offset', () => {
    render(
      <EvaluationPanel
        {...makeDefaultProps({
          summary: makeSummary({ averageTimingOffsetMs: -25 }),
        })}
      />,
    );
    expect(screen.getByText(/Rushing/)).toBeInTheDocument();
  });

  it('shows timing tendency "Dragging" for positive offset', () => {
    render(
      <EvaluationPanel
        {...makeDefaultProps({
          summary: makeSummary({ averageTimingOffsetMs: 30 }),
        })}
      />,
    );
    expect(screen.getByText(/Dragging/)).toBeInTheDocument();
  });
});
