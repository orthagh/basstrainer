import type { Exercise } from './types';

export const speedBuilders: Exercise[] = [
  {
    id: 'a05-speed-burst-e',
    title: 'Speed Burst',
    subtitle: 'Short fast runs at 5th position',
    difficulty: 'advanced',
    category: 'Speed Builders',
    defaultTempo: 100,
    tex: `
      \\title "Speed Burst"
      \\subtitle "Short fast runs"
      \\tempo 100
      \\instrument 34
      \\tuning g2 d2 a1 e1
      \\ts 4 4
      .
      \\clef F4
      :16 5.4 7.4 5.4 7.4 :4 5.3 :16 7.3 5.3 7.3 5.3 :4 7.4 |
      :16 5.4 7.4 5.4 7.4 :4 5.3 :16 7.3 5.3 7.3 5.3 :4 7.4 |
      :16 7.4 9.4 7.4 9.4 :4 7.3 :16 9.3 7.3 9.3 7.3 :4 5.4 |
      :16 5.4 7.4 9.4 7.4 :4 5.3 :16 7.3 9.3 7.3 5.3 :4 5.4
    `,
  },
  {
    id: 'a06-spider-walk',
    title: 'Spider Walk',
    subtitle: 'One-finger-per-fret at 5th position',
    difficulty: 'advanced',
    category: 'Speed Builders',
    defaultTempo: 70,
    tex: `
      \\title "Spider Walk"
      \\subtitle "Chromatic dexterity"
      \\tempo 70
      \\instrument 34
      \\tuning g2 d2 a1 e1
      \\ts 4 4
      .
      \\clef F4
      :16 5.4 6.4 7.4 8.4 5.3 6.3 7.3 8.3 5.2 6.2 7.2 8.2 5.1 6.1 7.1 8.1 |
      8.1 7.1 6.1 5.1 8.2 7.2 6.2 5.2 8.3 7.3 6.3 5.3 8.4 7.4 6.4 5.4 |
      5.4 6.4 7.4 8.4 5.3 6.3 7.3 8.3 5.2 6.2 7.2 8.2 5.1 6.1 7.1 8.1 |
      8.1 7.1 6.1 5.1 8.2 7.2 6.2 5.2 8.3 7.3 6.3 5.3 8.4 7.4 6.4 5.4
    `,
  },
  {
    id: 'a07-endurance-16ths',
    title: 'Endurance 16ths',
    subtitle: 'Sustained melodic 16ths across strings',
    difficulty: 'advanced',
    category: 'Speed Builders',
    defaultTempo: 95,
    tex: `
      \\title "Endurance 16ths"
      \\subtitle "Sustained 16ths"
      \\tempo 95
      \\instrument 34
      \\tuning g2 d2 a1 e1
      \\ts 4 4
      .
      \\clef F4
      :16 5.4 7.4 5.3 7.3 5.4 7.4 5.3 7.3 5.4 7.4 5.3 7.3 5.4 7.4 5.3 7.3 |
      7.3 5.3 7.4 5.4 7.3 5.3 7.4 5.4 7.3 5.3 7.4 5.4 7.3 5.3 7.4 5.4 |
      5.4 7.4 9.4 7.4 5.3 7.3 9.3 7.3 5.4 7.4 9.4 7.4 5.3 7.3 9.3 7.3 |
      9.3 7.3 5.3 7.3 9.4 7.4 5.4 7.4 9.3 7.3 5.3 7.3 9.4 7.4 5.4 5.4
    `,
  },
];
