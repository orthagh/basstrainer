import { describe, it, expect } from 'vitest';
import { exercises } from './index';
import type { Exercise } from './types';

describe('exercises data integrity', () => {
  it('exports a non-empty array', () => {
    expect(exercises.length).toBeGreaterThan(0);
  });

  it('every exercise has all required fields', () => {
    for (const ex of exercises) {
      expect(ex.id, `${ex.id} missing id`).toBeTruthy();
      expect(ex.title, `${ex.id} missing title`).toBeTruthy();
      expect(ex.subtitle, `${ex.id} missing subtitle`).toBeTruthy();
      expect(ex.difficulty, `${ex.id} missing difficulty`).toBeTruthy();
      expect(ex.category, `${ex.id} missing category`).toBeTruthy();
      expect(ex.defaultTempo, `${ex.id} missing defaultTempo`).toBeGreaterThan(0);
      expect(ex.tex, `${ex.id} missing tex`).toBeTruthy();
    }
  });

  it('all exercise IDs are unique', () => {
    const ids = exercises.map((ex) => ex.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('difficulty values are valid', () => {
    const validDifficulties: Exercise['difficulty'][] = ['beginner', 'intermediate', 'advanced'];
    for (const ex of exercises) {
      expect(validDifficulties, `${ex.id} has invalid difficulty: ${ex.difficulty}`)
        .toContain(ex.difficulty);
    }
  });

  it('every exercise has a valid AlphaTex header', () => {
    for (const ex of exercises) {
      expect(ex.tex, `${ex.id} missing \\instrument`).toContain('\\instrument 34');
      expect(ex.tex, `${ex.id} missing \\tuning`).toContain('\\tuning g2 d2 a1 e1');
      expect(ex.tex, `${ex.id} missing \\clef`).toContain('\\clef F4');
      expect(ex.tex, `${ex.id} missing \\ts`).toContain('\\ts 4 4');
      expect(ex.tex, `${ex.id} missing \\tempo`).toContain('\\tempo');
    }
  });

  it('defaultTempo matches the \\tempo in the AlphaTex', () => {
    for (const ex of exercises) {
      const match = ex.tex!.match(/\\tempo\s+(\d+)/);
      expect(match, `${ex.id}: could not parse \\tempo from tex`).not.toBeNull();
      if (match) {
        expect(Number(match[1]), `${ex.id}: defaultTempo (${ex.defaultTempo}) ≠ \\tempo (${match[1]})`).toBe(
          ex.defaultTempo,
        );
      }
    }
  });

  it('categories are from the known set', () => {
    const knownCategories = new Set([
      '16th Notes Foundation',
      'String Crossing',
      'Groove Patterns',
      'Melodic Movement',
      'Advanced Grooves',
      'Speed Builders',
    ]);
    for (const ex of exercises) {
      expect(knownCategories.has(ex.category), `${ex.id} has unknown category: "${ex.category}"`).toBe(true);
    }
  });

  it('exercise count matches expected total (24)', () => {
    expect(exercises).toHaveLength(24);
  });

  it('exercises are in progression order (beginner → intermediate → advanced)', () => {
    const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 };
    let maxSeen = 0;
    for (const ex of exercises) {
      const level = difficultyOrder[ex.difficulty];
      expect(level, `${ex.id}: difficulty goes backwards`).toBeGreaterThanOrEqual(maxSeen);
      maxSeen = level;
    }
  });
});
