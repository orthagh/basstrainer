/**
 * Tests for ExercisePicker component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ExercisePicker from './ExercisePicker';
import type { Exercise } from '../data/exercises';

const mockExercises: Exercise[] = [
  {
    id: 'ex-1',
    title: 'Root Notes',
    subtitle: 'Quarter notes',
    difficulty: 'beginner',
    category: 'Fundamentals',
    defaultTempo: 80,
    tex: '\\tempo 80 1.1.4',
  },
  {
    id: 'ex-2',
    title: 'Octave Jump',
    subtitle: 'Eighth notes',
    difficulty: 'intermediate',
    category: 'Fundamentals',
    defaultTempo: 90,
    tex: '\\tempo 90 1.1.8',
  },
  {
    id: 'ex-3',
    title: 'Funky Groove',
    subtitle: 'Syncopation',
    difficulty: 'advanced',
    category: 'Grooves',
    defaultTempo: 100,
    tex: '\\tempo 100 1.1.16',
  },
];

describe('ExercisePicker', () => {
  it('renders exercises grouped by category', () => {
    render(
      <ExercisePicker
        exercises={mockExercises}
        currentId="ex-1"
        progressData={{}}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('Grooves')).toBeInTheDocument();
  });

  it('renders all exercise titles', () => {
    render(
      <ExercisePicker
        exercises={mockExercises}
        currentId="ex-1"
        progressData={{}}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('Root Notes')).toBeInTheDocument();
    expect(screen.getByText('Octave Jump')).toBeInTheDocument();
    expect(screen.getByText('Funky Groove')).toBeInTheDocument();
  });

  it('displays default tempo for each exercise', () => {
    render(
      <ExercisePicker
        exercises={mockExercises}
        currentId="ex-1"
        progressData={{}}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('80 BPM')).toBeInTheDocument();
    expect(screen.getByText('90 BPM')).toBeInTheDocument();
    expect(screen.getByText('100 BPM')).toBeInTheDocument();
  });

  it('highlights the current exercise', () => {
    render(
      <ExercisePicker
        exercises={mockExercises}
        currentId="ex-1"
        progressData={{}}
        onSelect={vi.fn()}
      />,
    );

    const currentButton = screen.getByText('Root Notes').closest('button')!;
    expect(currentButton.className).toContain('bg-primary');
  });

  it('non-current exercises are not highlighted', () => {
    render(
      <ExercisePicker
        exercises={mockExercises}
        currentId="ex-1"
        progressData={{}}
        onSelect={vi.fn()}
      />,
    );

    const otherButton = screen.getByText('Octave Jump').closest('button')!;
    expect(otherButton.className).not.toContain('bg-primary');
  });

  it('calls onSelect when an exercise is clicked', () => {
    const onSelect = vi.fn();
    render(
      <ExercisePicker
        exercises={mockExercises}
        currentId="ex-1"
        progressData={{}}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByText('Funky Groove'));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(mockExercises[2]);
  });

  it('renders difficulty dots with correct color titles', () => {
    render(
      <ExercisePicker
        exercises={mockExercises}
        currentId="ex-1"
        progressData={{}}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByTitle('beginner')).toBeInTheDocument();
    expect(screen.getByTitle('intermediate')).toBeInTheDocument();
    expect(screen.getByTitle('advanced')).toBeInTheDocument();
  });

  it('handles empty exercises array', () => {
    const { container } = render(
      <ExercisePicker
        exercises={[]}
        currentId="none"
        progressData={{}}
        onSelect={vi.fn()}
      />,
    );

    // No buttons rendered
    expect(container.querySelectorAll('button').length).toBe(0);
  });
});
