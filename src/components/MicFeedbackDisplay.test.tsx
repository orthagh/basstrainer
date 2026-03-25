/**
 * Tests for MicFeedbackDisplay component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MicFeedbackDisplay from './MicFeedbackDisplay';
import type { PitchResult } from '../audio/pitchDetector';

function makePitch(overrides: Partial<PitchResult> = {}): PitchResult {
  return {
    frequency: null,
    midi: null,
    noteName: null,
    rms: 0,
    ...overrides,
  };
}

describe('MicFeedbackDisplay', () => {
  it('shows "—" when no pitch is detected', () => {
    render(<MicFeedbackDisplay currentPitch={makePitch()} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows "MIC" sublabel when no frequency', () => {
    render(<MicFeedbackDisplay currentPitch={makePitch()} />);
    expect(screen.getByText('MIC')).toBeInTheDocument();
  });

  it('shows the detected note name', () => {
    render(
      <MicFeedbackDisplay
        currentPitch={makePitch({ noteName: 'E2', frequency: 82.41, midi: 40, rms: 0.3 })}
      />,
    );
    expect(screen.getByText('E2')).toBeInTheDocument();
  });

  it('shows the frequency in Hz', () => {
    render(
      <MicFeedbackDisplay
        currentPitch={makePitch({ noteName: 'A4', frequency: 440.0, midi: 69, rms: 0.5 })}
      />,
    );
    expect(screen.getByText('440 Hz')).toBeInTheDocument();
  });

  it('renders a level bar', () => {
    const { container } = render(
      <MicFeedbackDisplay
        currentPitch={makePitch({ rms: 0.1 })}
      />,
    );
    // Level bar should have a non-zero width
    const innerBar = container.querySelector('.bg-emerald-400');
    expect(innerBar).toBeInTheDocument();
    expect((innerBar as HTMLElement).style.width).toBe('50%');
  });

  it('clamps level bar at 100%', () => {
    const { container } = render(
      <MicFeedbackDisplay
        currentPitch={makePitch({ rms: 1.0 })}
      />,
    );
    const innerBar = container.querySelector('.bg-emerald-400');
    expect((innerBar as HTMLElement).style.width).toBe('100%');
  });
});
