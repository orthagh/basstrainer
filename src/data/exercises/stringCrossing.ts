import type { Exercise } from './types';

export const stringCrossing: Exercise[] = [
  {
    id: 'b07-three-string-walk',
    title: 'Three-String Walk',
    subtitle: 'Walk across E, A, D using frets 5-7',
    difficulty: 'beginner',
    category: 'String Crossing',
    defaultTempo: 60,
    tex: `
      \\title "Three-String Walk"
      \\subtitle "E - A - D"
      \\tempo 60
      \\instrument 34
      \\tuning g2 d2 a1 e1
      \\ts 4 4
      .
      \\clef F4
      :16 5.4 7.4 5.4 7.4 5.3 7.3 5.3 7.3 5.2 7.2 5.2 7.2 5.3 7.3 5.3 7.3 |
      5.4 7.4 5.4 7.4 5.3 7.3 5.3 7.3 5.2 7.2 5.2 7.2 5.3 7.3 5.3 7.3 |
      7.2 5.2 7.2 5.2 7.3 5.3 7.3 5.3 7.4 5.4 7.4 5.4 7.3 5.3 7.3 5.3 |
      7.2 5.2 7.2 5.2 7.3 5.3 7.3 5.3 7.4 5.4 7.4 5.4 7.3 5.3 7.3 5.3
    `,
  },
  {
    id: 'b08-four-string-sweep',
    title: 'Four-String Sweep',
    subtitle: 'Sweep all four strings at frets 5-7',
    difficulty: 'beginner',
    category: 'String Crossing',
    defaultTempo: 55,
    tex: `
      \\title "Four-String Sweep"
      \\subtitle "All four strings"
      \\tempo 55
      \\instrument 34
      \\tuning g2 d2 a1 e1
      \\ts 4 4
      .
      \\clef F4
      :16 5.4 7.4 5.4 7.4 5.3 7.3 5.3 7.3 5.2 7.2 5.2 7.2 5.1 7.1 5.1 7.1 |
      7.1 5.1 7.1 5.1 7.2 5.2 7.2 5.2 7.3 5.3 7.3 5.3 7.4 5.4 7.4 5.4 |
      5.4 5.3 5.2 5.1 7.1 7.2 7.3 7.4 5.4 5.3 5.2 5.1 7.1 7.2 7.3 7.4 |
      7.4 7.3 7.2 7.1 5.1 5.2 5.3 5.4 7.4 7.3 7.2 7.1 5.1 5.2 5.3 5.4
    `,
  },
];
