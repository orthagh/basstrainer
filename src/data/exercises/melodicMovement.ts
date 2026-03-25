import type { Exercise } from './types';

export const melodicMovement: Exercise[] = [
  {
    id: 'i06-walking-16ths',
    title: 'Walking 16ths',
    subtitle: 'Chromatic walk',
    difficulty: 'intermediate',
    category: 'Melodic Movement',
    defaultTempo: 75,
    tex: `
      \\title "Walking 16ths"
      \\subtitle "Chromatic walk"
      \\tempo 75
      \\instrument 34
      \\tuning e1 a1 d2 g2
      \\ts 4 4
      .
      :16 0.1 1.1 2.1 3.1 0.2 1.2 2.2 3.2 0.1 1.1 2.1 3.1 0.2 1.2 2.2 3.2 |
      3.2 2.2 1.2 0.2 3.1 2.1 1.1 0.1 3.2 2.2 1.2 0.2 3.1 2.1 1.1 0.1 |
      0.1 1.1 2.1 3.1 4.1 5.1 4.1 3.1 2.1 1.1 0.1 1.1 2.1 3.1 4.1 5.1 |
      5.1 4.1 3.1 2.1 1.1 0.1 1.1 2.1 3.1 4.1 5.1 4.1 3.1 2.1 1.1 0.1
    `,
  },
  {
    id: 'i07-pentatonic-run',
    title: 'Pentatonic Run',
    subtitle: 'E minor pentatonic in 16ths',
    difficulty: 'intermediate',
    category: 'Melodic Movement',
    defaultTempo: 70,
    tex: `
      \\title "Pentatonic Run"
      \\subtitle "Em pentatonic"
      \\tempo 70
      \\instrument 34
      \\tuning e1 a1 d2 g2
      \\ts 4 4
      .
      :16 0.1 3.1 0.2 2.2 0.3 2.3 0.4 2.4 2.4 0.4 2.3 0.3 2.2 0.2 3.1 0.1 |
      0.1 3.1 0.2 2.2 0.3 2.3 0.4 2.4 2.4 0.4 2.3 0.3 2.2 0.2 3.1 0.1 |
      0.1 3.1 0.2 2.2 0.3 2.3 0.4 2.4 2.4 0.4 2.3 0.3 2.2 0.2 3.1 0.1 |
      0.1 3.1 0.2 2.2 0.3 2.3 0.4 2.4 2.4 0.4 2.3 0.3 2.2 0.2 3.1 0.1
    `,
  },
  {
    id: 'i08-major-scale-16ths',
    title: 'Major Scale 16ths',
    subtitle: 'G major scale up and down',
    difficulty: 'intermediate',
    category: 'Melodic Movement',
    defaultTempo: 65,
    tex: `
      \\title "Major Scale 16ths"
      \\subtitle "G major"
      \\tempo 65
      \\instrument 34
      \\tuning e1 a1 d2 g2
      \\ts 4 4
      .
      :16 3.1 5.1 2.2 3.2 5.2 2.3 4.3 5.3 5.3 4.3 2.3 5.2 3.2 2.2 5.1 3.1 |
      3.1 5.1 2.2 3.2 5.2 2.3 4.3 5.3 5.3 4.3 2.3 5.2 3.2 2.2 5.1 3.1 |
      3.1 5.1 2.2 3.2 5.2 2.3 4.3 5.3 5.3 4.3 2.3 5.2 3.2 2.2 5.1 3.1 |
      3.1 5.1 2.2 3.2 5.2 2.3 4.3 5.3 5.3 4.3 2.3 5.2 3.2 2.2 5.1 3.1
    `,
  },
  {
    id: 'i09-box-shape-shift',
    title: 'Box Shape Shift',
    subtitle: 'Move between fret positions',
    difficulty: 'intermediate',
    category: 'Melodic Movement',
    defaultTempo: 70,
    tex: `
      \\title "Box Shape Shift"
      \\subtitle "Position shifting"
      \\tempo 70
      \\instrument 34
      \\tuning e1 a1 d2 g2
      \\ts 4 4
      .
      :16 0.1 2.1 3.1 0.2 2.2 3.2 0.3 2.3 3.1 5.1 7.1 3.2 5.2 7.2 3.3 5.3 |
      5.1 7.1 8.1 5.2 7.2 8.2 5.3 7.3 7.3 5.3 8.2 7.2 5.2 8.1 7.1 5.1 |
      5.3 3.3 7.2 5.2 3.2 7.1 5.1 3.1 2.3 0.3 3.2 2.2 0.2 3.1 2.1 0.1 |
      0.1 2.1 3.1 0.2 2.2 3.2 0.3 2.3 3.1 5.1 7.1 3.2 5.2 7.2 3.3 5.3
    `,
  },
];
