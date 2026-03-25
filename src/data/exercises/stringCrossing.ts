import type { Exercise } from './types';

export const stringCrossing: Exercise[] = [
  {
    id: 'b07-three-string-walk',
    title: 'Three-String Walk',
    subtitle: 'Walk E → A → D and back',
    difficulty: 'beginner',
    category: 'String Crossing',
    defaultTempo: 60,
    tex: `
      \\title "Three-String Walk"
      \\subtitle "E → A → D"
      \\tempo 60
      \\instrument 34
      \\tuning e1 a1 d2 g2
      \\ts 4 4
      .
      :16 0.1 0.1 0.1 0.1 0.2 0.2 0.2 0.2 0.3 0.3 0.3 0.3 0.2 0.2 0.2 0.2 |
      0.1 0.1 0.1 0.1 0.2 0.2 0.2 0.2 0.3 0.3 0.3 0.3 0.2 0.2 0.2 0.2 |
      0.3 0.3 0.3 0.3 0.2 0.2 0.2 0.2 0.1 0.1 0.1 0.1 0.2 0.2 0.2 0.2 |
      0.3 0.3 0.3 0.3 0.2 0.2 0.2 0.2 0.1 0.1 0.1 0.1 0.2 0.2 0.2 0.2
    `,
  },
  {
    id: 'b08-four-string-sweep',
    title: 'Four-String Sweep',
    subtitle: 'Open strings E → A → D → G',
    difficulty: 'beginner',
    category: 'String Crossing',
    defaultTempo: 55,
    tex: `
      \\title "Four-String Sweep"
      \\subtitle "All four strings"
      \\tempo 55
      \\instrument 34
      \\tuning e1 a1 d2 g2
      \\ts 4 4
      .
      :16 0.1 0.1 0.1 0.1 0.2 0.2 0.2 0.2 0.3 0.3 0.3 0.3 0.4 0.4 0.4 0.4 |
      0.4 0.4 0.4 0.4 0.3 0.3 0.3 0.3 0.2 0.2 0.2 0.2 0.1 0.1 0.1 0.1 |
      0.1 0.1 0.1 0.1 0.2 0.2 0.2 0.2 0.3 0.3 0.3 0.3 0.4 0.4 0.4 0.4 |
      0.4 0.4 0.4 0.4 0.3 0.3 0.3 0.3 0.2 0.2 0.2 0.2 0.1 0.1 0.1 0.1
    `,
  },
];
