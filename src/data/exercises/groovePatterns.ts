import type { Exercise } from './types';

export const groovePatterns: Exercise[] = [
  {
    id: 'i01-octave-groove',
    title: 'Octave Groove',
    subtitle: 'Classic octave pattern',
    difficulty: 'intermediate',
    category: 'Groove Patterns',
    defaultTempo: 80,
    tex: `
      \\title "Octave Groove"
      \\subtitle "Lock in the octave"
      \\tempo 80
      \\instrument 34
      \\tuning e1 a1 d2 g2
      \\ts 4 4
      .
      :16 0.1 0.1 r 0.1 :8 2.3 :16 r 0.1 0.1 0.1 r 0.1 :8 2.3 |
      :16 0.1 0.1 r 0.1 :8 2.3 :16 r 0.1 0.1 0.1 r 0.1 :8 2.3 |
      :16 3.1 3.1 r 3.1 :8 5.3 :16 r 3.1 3.1 3.1 r 3.1 :8 5.3 |
      :16 3.1 3.1 r 3.1 :8 5.3 :16 r 3.1 3.1 3.1 r 3.1 :8 5.3
    `,
  },
  {
    id: 'i02-syncopated-funk',
    title: 'Syncopated Funk',
    subtitle: 'Accents on "e" and "a"',
    difficulty: 'intermediate',
    category: 'Groove Patterns',
    defaultTempo: 85,
    tex: `
      \\title "Syncopated Funk"
      \\subtitle "Hit the off-beats"
      \\tempo 85
      \\instrument 34
      \\tuning e1 a1 d2 g2
      \\ts 4 4
      .
      :16 r 0.1 0.1 r r 0.1 0.1 r r 0.1 0.1 r r 0.1 0.1 r |
      r 0.1 0.1 r r 0.1 0.1 r r 0.1 0.1 r r 0.1 0.1 r |
      r 3.1 3.1 r r 5.1 5.1 r r 3.1 3.1 r r 5.1 5.1 r |
      r 3.1 3.1 r r 5.1 5.1 r r 3.1 3.1 r r 5.1 :8 0.1
    `,
  },
  {
    id: 'i03-root-fifth-pump',
    title: 'Root-Fifth Pump',
    subtitle: '16th note root-fifth pattern',
    difficulty: 'intermediate',
    category: 'Groove Patterns',
    defaultTempo: 80,
    tex: `
      \\title "Root-Fifth Pump"
      \\subtitle "Root and fifth drive"
      \\tempo 80
      \\instrument 34
      \\tuning e1 a1 d2 g2
      \\ts 4 4
      .
      :16 0.1 0.1 r 0.1 0.2 0.2 r 0.2 0.1 0.1 r 0.1 0.2 0.2 r 0.2 |
      0.1 0.1 r 0.1 0.2 0.2 r 0.2 0.1 0.1 r 0.1 0.2 0.2 r 0.2 |
      3.1 3.1 r 3.1 3.2 3.2 r 3.2 3.1 3.1 r 3.1 3.2 3.2 r 3.2 |
      3.1 3.1 r 3.1 3.2 3.2 r 3.2 3.1 3.1 r 3.1 3.2 3.2 :8 0.1
    `,
  },
  {
    id: 'i04-disco-octave',
    title: 'Disco Octave',
    subtitle: 'Driving 8th-note octave pattern',
    difficulty: 'intermediate',
    category: 'Groove Patterns',
    defaultTempo: 110,
    tex: `
      \\title "Disco Octave"
      \\subtitle "Steady 8th octaves"
      \\tempo 110
      \\instrument 34
      \\tuning e1 a1 d2 g2
      \\ts 4 4
      .
      :8 0.1 2.3 0.1 2.3 0.1 2.3 0.1 2.3 |
      0.1 2.3 0.1 2.3 0.1 2.3 0.1 2.3 |
      3.1 5.3 3.1 5.3 3.1 5.3 3.1 5.3 |
      3.1 5.3 3.1 5.3 3.1 5.3 3.1 5.3
    `,
  },
  {
    id: 'i05-gallop-16ths',
    title: 'Gallop 16ths',
    subtitle: '8th + two 16ths gallop feel',
    difficulty: 'intermediate',
    category: 'Groove Patterns',
    defaultTempo: 90,
    tex: `
      \\title "Gallop 16ths"
      \\subtitle "Gallop rhythm"
      \\tempo 90
      \\instrument 34
      \\tuning e1 a1 d2 g2
      \\ts 4 4
      .
      :8 0.1 :16 0.1 0.1 :8 0.1 :16 0.1 0.1 :8 0.1 :16 0.1 0.1 :8 0.1 :16 0.1 0.1 |
      :8 0.1 :16 0.1 0.1 :8 0.1 :16 0.1 0.1 :8 0.1 :16 0.1 0.1 :8 0.1 :16 0.1 0.1 |
      :8 3.1 :16 3.1 3.1 :8 3.1 :16 3.1 3.1 :8 5.1 :16 5.1 5.1 :8 5.1 :16 5.1 5.1 |
      :8 3.1 :16 3.1 3.1 :8 3.1 :16 3.1 3.1 :8 5.1 :16 5.1 5.1 :8 5.1 :16 5.1 5.1
    `,
  },
];
