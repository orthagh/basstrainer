import type { Exercise } from './types';

export const speedBuilders: Exercise[] = [
  {
    id: 'a05-speed-burst-e',
    title: 'Speed Burst – E',
    subtitle: 'Short 16th bursts with rest recovery',
    difficulty: 'advanced',
    category: 'Speed Builders',
    defaultTempo: 100,
    tex: `
      \\title "Speed Burst – E"
      \\subtitle "Burst and rest"
      \\tempo 100
      \\instrument 34
      \\tuning e1 a1 d2 g2
      \\ts 4 4
      .
      :16 0.1 0.1 0.1 0.1 r r r r 0.1 0.1 0.1 0.1 r r r r |
      0.1 0.1 0.1 0.1 r r r r 0.1 0.1 0.1 0.1 r r r r |
      0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 r r r r r r r r |
      0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1
    `,
  },
  {
    id: 'a06-spider-walk',
    title: 'Spider Walk',
    subtitle: '1-2-3-4 across all strings',
    difficulty: 'advanced',
    category: 'Speed Builders',
    defaultTempo: 70,
    tex: `
      \\title "Spider Walk"
      \\subtitle "1-2-3-4 each string"
      \\tempo 70
      \\instrument 34
      \\tuning e1 a1 d2 g2
      \\ts 4 4
      .
      :16 1.1 2.1 3.1 4.1 1.2 2.2 3.2 4.2 1.3 2.3 3.3 4.3 1.4 2.4 3.4 4.4 |
      4.4 3.4 2.4 1.4 4.3 3.3 2.3 1.3 4.2 3.2 2.2 1.2 4.1 3.1 2.1 1.1 |
      1.1 2.1 3.1 4.1 1.2 2.2 3.2 4.2 1.3 2.3 3.3 4.3 1.4 2.4 3.4 4.4 |
      4.4 3.4 2.4 1.4 4.3 3.3 2.3 1.3 4.2 3.2 2.2 1.2 4.1 3.1 2.1 1.1
    `,
  },
  {
    id: 'a07-endurance-16ths',
    title: 'Endurance 16ths',
    subtitle: '8 bars of non-stop 16ths with movement',
    difficulty: 'advanced',
    category: 'Speed Builders',
    defaultTempo: 95,
    tex: `
      \\title "Endurance 16ths"
      \\subtitle "8 bars non-stop"
      \\tempo 95
      \\instrument 34
      \\tuning e1 a1 d2 g2
      \\ts 4 4
      .
      :16 0.1 0.1 0.1 0.1 2.1 2.1 2.1 2.1 3.1 3.1 3.1 3.1 5.1 5.1 5.1 5.1 |
      0.2 0.2 0.2 0.2 2.2 2.2 2.2 2.2 3.2 3.2 3.2 3.2 5.2 5.2 5.2 5.2 |
      5.2 5.2 5.2 5.2 3.2 3.2 3.2 3.2 2.2 2.2 2.2 2.2 0.2 0.2 0.2 0.2 |
      5.1 5.1 5.1 5.1 3.1 3.1 3.1 3.1 2.1 2.1 2.1 2.1 0.1 0.1 0.1 0.1 |
      0.1 2.1 3.1 5.1 0.2 2.2 3.2 5.2 5.2 3.2 2.2 0.2 5.1 3.1 2.1 0.1 |
      0.1 2.1 3.1 5.1 0.2 2.2 3.2 5.2 5.2 3.2 2.2 0.2 5.1 3.1 2.1 0.1 |
      0.1 0.1 3.1 3.1 0.2 0.2 3.2 3.2 5.2 5.2 3.2 3.2 0.2 0.2 3.1 3.1 |
      0.1 0.1 3.1 3.1 0.2 0.2 3.2 3.2 5.2 5.2 3.2 3.2 0.2 0.2 :8 0.1
    `,
  },
];
