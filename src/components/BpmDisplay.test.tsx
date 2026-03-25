/**
 * Tests for BpmDisplay component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BpmDisplay from './BpmDisplay';

describe('BpmDisplay', () => {
  it('displays the current BPM value', () => {
    render(<BpmDisplay value={120} onChange={vi.fn()} />);
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('BPM')).toBeInTheDocument();
  });

  it('calls onChange with value+1 when + button is clicked', () => {
    const onChange = vi.fn();
    render(<BpmDisplay value={100} onChange={onChange} />);

    fireEvent.click(screen.getByTitle('+1 BPM'));
    expect(onChange).toHaveBeenCalledWith(101);
  });

  it('calls onChange with value-1 when − button is clicked', () => {
    const onChange = vi.fn();
    render(<BpmDisplay value={100} onChange={onChange} />);

    fireEvent.click(screen.getByTitle('−1 BPM'));
    expect(onChange).toHaveBeenCalledWith(99);
  });

  it('clamps at max when nudging up', () => {
    const onChange = vi.fn();
    render(<BpmDisplay value={200} onChange={onChange} max={200} />);

    // + button should be disabled at max
    const plusBtn = screen.getByTitle('+1 BPM');
    expect(plusBtn).toBeDisabled();
  });

  it('clamps at min when nudging down', () => {
    const onChange = vi.fn();
    render(<BpmDisplay value={40} onChange={onChange} min={40} />);

    const minusBtn = screen.getByTitle('−1 BPM');
    expect(minusBtn).toBeDisabled();
  });

  it('enters edit mode on click and commits on Enter', () => {
    const onChange = vi.fn();
    render(<BpmDisplay value={100} onChange={onChange} />);

    // Click the number to enter edit mode
    fireEvent.click(screen.getByText('100'));

    // An input should appear
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();

    // Type a new value
    fireEvent.change(input, { target: { value: '150' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(150);
  });

  it('cancels edit mode on Escape', () => {
    const onChange = vi.fn();
    render(<BpmDisplay value={100} onChange={onChange} />);

    fireEvent.click(screen.getByText('100'));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '999' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    // onChange should not have been called
    expect(onChange).not.toHaveBeenCalled();
    // Should show original value
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('clamps edited value to max on commit', () => {
    const onChange = vi.fn();
    render(<BpmDisplay value={100} onChange={onChange} max={200} />);

    fireEvent.click(screen.getByText('100'));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '999' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(200);
  });

  it('clamps edited value to min on commit', () => {
    const onChange = vi.fn();
    render(<BpmDisplay value={100} onChange={onChange} min={40} />);

    fireEvent.click(screen.getByText('100'));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '10' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(40);
  });

  it('does not enter edit mode when disabled', () => {
    render(<BpmDisplay value={100} onChange={vi.fn()} disabled />);

    const bpmButton = screen.getByText('100');
    fireEvent.click(bpmButton);

    // Should NOT show an input
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('reverts to original value when non-numeric input is committed', () => {
    const onChange = vi.fn();
    render(<BpmDisplay value={120} onChange={onChange} />);

    fireEvent.click(screen.getByText('120'));
    const input = screen.getByRole('textbox');
    // Non-numeric chars are stripped by the onChange handler, but test blur with empty
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    // Should not call onChange with NaN — fallback to original
    // After blur, the display should be back to 120
    expect(screen.getByText('120')).toBeInTheDocument();
  });
});
