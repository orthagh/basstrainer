import type { Exercise } from './types';

export const melodicMovement: Exercise[] = [
  {
    id: 'i06-walking-16ths',
    title: 'Walking 16ths',
    subtitle: 'Chromatic walk around 5th position',
    difficulty: 'intermediate',
    category: 'Melodic Movement',
    defaultTempo: 75,
    tex: `
      \\title "Walking 16ths"
      \\subtitle "Chromatic walk"
      \\tempo 75
      \\instrument 34
      \\tuning g2 d2 a1 e1
      \\ts 4 4
      .
      \\clef F4
      :16 5.4 6.4 7.4 8.4 5.3 6.3 7.3 8.3 5.4 6.4 7.4 8.4 5.3 6.3 7.3 8.3 |
      8.3 7.3 6.3 5.3 8.4 7.4 6.4 5.4 8.3 7.3 6.3 5.3 8.4 7.4 6.4 5.4 |
      5.4 6.4 7.4 8.4 9.4 8.4 7.4 6.4 5.4 6.4 7.4 8.4 9.4 8.4 7.4 6.4 |
      5.3 6.3 7.3 8.3 9.3 8.3 7.3 6.3 5.4 6.4 7.4 8.4 7.4 6.4 5.4 5.4
    `,
  },
  {
    id: 'i07-pentatonic-run',
    title: 'Pentatonic Run',
    subtitle: 'A minor pentatonic in 16ths at 5th position',
    difficulty: 'intermediate',
    category: 'Melodic Movement',
    defaultTempo: 70,
    tex: `
      \\title "Pentatonic Run"
      \\subtitle "Am pentatonic"
      \\tempo 70
      \\instrument 34
      \\tuning g2 d2 a1 e1
      \\ts 4 4
      .
      \\clef F4
      :16 5.4 8.4 5.3 7.3 5.2 7.2 5.1 7.1 7.1 5.1 7.2 5.2 7.3 5.3 8.4 5.4 |
      5.4 8.4 5.3 7.3 5.2 7.2 5.1 7.1 7.1 5.1 7.2 5.2 7.3 5.3 8.4 5.4 |
      5.4 8.4 5.3 7.3 5.2 7.2 5.1 7.1 7.1 5.1 7.2 5.2 7.3 5.3 8.4 5.4 |
      5.4 8.4 5.3 7.3 5.2 7.2 5.1 7.1 7.1 5.1 7.2 5.2 7.3 5.3 8.4 5.4
    `,
  },
  {
    id: 'i08-major-scale-16ths',
    title: 'Major Scale 16ths',
    subtitle: 'A major scale up and down at 4th position',
    difficulty: 'intermediate',
    category: 'Melodic Movement',
    defaultTempo: 65,
    tex: `
      \\title "Major Scale 16ths"
      \\subtitle "A major"
      \\tempo 65
      \\instrument 34
      \\tuning g2 d2 a1 e1
      \\ts 4 4
      .
      \\clef F4
      :16 5.4 7.4 4.3 5.3 7.3 4.2 6.2 7.2 7.2 6.2 4.2 7.3 5.3 4.3 7.4 5.4 |
      5.4 7.4 4.3 5.3 7.3 4.2 6.2 7.2 7.2 6.2 4.2 7.3 5.3 4.3 7.4 5.4 |
      5.4 7.4 4.3 5.3 7.3 4.2 6.2 7.2 7.2 6.2 4.2 7.3 5.3 4.3 7.4 5.4 |
      5.4 7.4 4.3 5.3 7.3 4.2 6.2 7.2 7.2 6.2 4.2 7.3 5.3 4.3 7.4 5.4
    `,
  },
  {
    id: 'i09-box-shape-shift',
    title: 'Box Shape Shift',
    subtitle: 'Shift between 5th and 7th position boxes',
    difficulty: 'intermediate',
    category: 'Melodic Movement',
    defaultTempo: 70,
    tex: `
      \\title "Box Shape Shift"
      \\subtitle "Position shifting"
      \\tempo 70
      \\instrument 34
      \\tuning g2 d2 a1 e1
      \\ts 4 4
      .
      \\clef F4
      :16 5.4 7.4 5.3 7.3 5.2 7.2 5.1 7.1 7.4 9.4 7.3 9.3 7.2 9.2 7.1 9.1 |
      9.1 7.1 9.2 7.2 9.3 7.3 9.4 7.4 7.1 5.1 7.2 5.2 7.3 5.3 7.4 5.4 |
      5.4 7.4 8.4 5.3 7.3 8.3 5.2 7.2 7.4 9.4 10.4 7.3 9.3 10.3 7.2 9.2 |
      9.2 7.2 10.3 9.3 7.3 10.4 9.4 7.4 7.2 5.2 8.3 7.3 5.3 8.4 7.4 5.4
    `,
  },
];
