/**
 * Tests for PostExerciseSummary component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PostExerciseSummary from './PostExerciseSummary';
import type { EvaluationSummary } from '../evaluation/types';

// ── Helpers ─────────────────────────────────────────────────

function makeSummary(overrides: Partial<EvaluationSummary> = {}): EvaluationSummary {
  return {
    totalNotes: 16,
    hitCount: 12,
    missCount: 4,
    accuracy: 0.75,
    averageTimingOffsetMs: -5,
    timingDistribution: { early: 3, onTime: 8, late: 1 },
    pitchAccuracy: 0.9,
    timingStdDevMs: 18,
    grooveLock: 0.82,
    noteEvaluations: [],
    ...overrides,
  };
}

const defaultProps = {
  summary: makeSummary(),
  exerciseTitle: 'Root Notes – Straight 8ths',
  personalBest: null as number | null,
  onDismiss: vi.fn(),
  onRetry: vi.fn(),
  onNextExercise: vi.fn(),
};

// ── Tests ───────────────────────────────────────────────────

describe('PostExerciseSummary', () => {
  it('renders the exercise title and accuracy percentage', () => {
    render(<PostExerciseSummary {...defaultProps} />);

    expect(screen.getByText('Session Complete')).toBeInTheDocument();
    expect(screen.getByText('Root Notes – Straight 8ths')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument(); // accuracy number
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
  });

  it('shows hit and miss counts', () => {
    render(<PostExerciseSummary {...defaultProps} />);

    expect(screen.getByText('12 / 16')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument(); // missed count
  });

  it('shows pitch accuracy and groove lock', () => {
    render(<PostExerciseSummary {...defaultProps} />);

    expect(screen.getByText('90%')).toBeInTheDocument(); // pitch accuracy
    expect(screen.getByText('82%')).toBeInTheDocument(); // groove lock
  });

  it('calls onRetry when Retry button is clicked', () => {
    const onRetry = vi.fn();
    render(<PostExerciseSummary {...defaultProps} onRetry={onRetry} />);

    fireEvent.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('calls onNextExercise when Next exercise button is clicked', () => {
    const onNext = vi.fn();
    render(<PostExerciseSummary {...defaultProps} onNextExercise={onNext} />);

    fireEvent.click(screen.getByText('Next exercise'));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('hides Next exercise button when onNextExercise is null', () => {
    render(<PostExerciseSummary {...defaultProps} onNextExercise={null} />);

    expect(screen.queryByText('Next exercise')).not.toBeInTheDocument();
  });

  it('calls onDismiss when close button is clicked', () => {
    const onDismiss = vi.fn();
    render(<PostExerciseSummary {...defaultProps} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByLabelText('Dismiss summary'));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('shows new personal best badge', () => {
    render(
      <PostExerciseSummary
        {...defaultProps}
        summary={makeSummary({ accuracy: 0.85 })}
        personalBest={0.8}
      />,
    );

    expect(screen.getByText(/New personal best/)).toBeInTheDocument();
  });

  it('shows negative delta vs personal best', () => {
    render(
      <PostExerciseSummary
        {...defaultProps}
        summary={makeSummary({ accuracy: 0.7 })}
        personalBest={0.8}
      />,
    );

    expect(screen.getByText(/↓ -10%/)).toBeInTheDocument();
  });

  it('shows no delta when personalBest is null', () => {
    render(
      <PostExerciseSummary {...defaultProps} personalBest={null} />,
    );

    expect(screen.queryByText(/vs\. best/)).not.toBeInTheDocument();
    expect(screen.queryByText(/personal best/)).not.toBeInTheDocument();
  });

  it('renders groove lock descriptive label', () => {
    render(
      <PostExerciseSummary
        {...defaultProps}
        summary={makeSummary({ grooveLock: 0.95 })}
      />,
    );

    expect(screen.getByText('Rock solid')).toBeInTheDocument();
  });

  it('handles zero-hit summary gracefully', () => {
    render(
      <PostExerciseSummary
        {...defaultProps}
        summary={makeSummary({
          totalNotes: 8,
          hitCount: 0,
          missCount: 8,
          accuracy: 0,
          pitchAccuracy: 0,
          grooveLock: 0,
          timingDistribution: { early: 0, onTime: 0, late: 0 },
        })}
      />,
    );

    // Accuracy ring shows "0" (multiple 0s exist — use getAllByText)
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('0 / 8')).toBeInTheDocument();
  });
});
