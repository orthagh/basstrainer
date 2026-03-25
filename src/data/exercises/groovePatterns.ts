import type { Exercise } from './types';

export const groovePatterns: Exercise[] = [
  {
    id: 'i01-octave-groove',
    title: 'Octave Groove',
    subtitle: 'Classic octave pattern around A (frets 5-7)',
    difficulty: 'intermediate',
    category: 'Groove Patterns',
    defaultTempo: 80,
    tex: `
      \\title "Octave Groove"
      \\subtitle "Lock in the octave"
      \\tempo 80
      \\instrument 34
      \\tuning g2 d2 a1 e1
      \\ts 4 4
      .
      \\clef F4
      :16 5.4 5.4 r 5.4 :8 7.2 :16 r 5.4 5.4 5.4 r 5.4 :8 7.2 |
      :16 5.4 5.4 r 5.4 :8 7.2 :16 r 5.4 5.4 5.4 r 5.4 :8 7.2 |
      :16 7.4 7.4 r 7.4 :8 9.2 :16 r 7.4 7.4 7.4 r 7.4 :8 9.2 |
      :16 7.4 7.4 r 7.4 :8 9.2 :16 r 7.4 5.4 7.4 r 5.4 :8 7.2
    `,
  },
  {
    id: 'i02-syncopated-funk',
    title: 'Syncopated Funk',
    subtitle: 'Off-beat accents around 5th position',
    difficulty: 'intermediate',
    category: 'Groove Patterns',
    defaultTempo: 85,
    tex: `
      \\title "Syncopated Funk"
      \\subtitle "Hit the off-beats"
      \\tempo 85
      \\instrument 34
      \\tuning g2 d2 a1 e1
      \\ts 4 4
      .
      \\clef F4
      :16 r 5.4 7.4 r r 5.3 7.3 r r 5.4 7.4 r r 5.3 7.3 r |
      r 5.4 7.4 r r 5.3 7.3 r r 5.4 7.4 r r 5.3 7.3 r |
      r 7.4 5.4 r r 7.3 5.3 r r 7.4 5.4 r r 7.3 5.3 r |
      r 7.4 5.4 r r 7.3 5.3 r r 5.4 7.4 r r 5.3 :8 5.4
    `,
  },
  {
    id: 'i03-root-fifth-pump',
    title: 'Root-Fifth Pump',
    subtitle: '16th note root-fifth with fretted notes',
    difficulty: 'intermediate',
    category: 'Groove Patterns',
    defaultTempo: 80,
    tex: `
      \\title "Root-Fifth Pump"
      \\subtitle "Root and fifth drive"
      \\tempo 80
      \\instrument 34
      \\tuning g2 d2 a1 e1
      \\ts 4 4
      .
      \\clef F4
      :16 5.4 5.4 r 5.4 7.3 7.3 r 7.3 5.4 5.4 r 5.4 7.3 7.3 r 7.3 |
      5.4 5.4 r 5.4 7.3 7.3 r 7.3 5.4 5.4 r 5.4 7.3 7.3 r 7.3 |
      7.4 7.4 r 7.4 9.3 9.3 r 9.3 7.4 7.4 r 7.4 9.3 9.3 r 9.3 |
      7.4 7.4 r 7.4 9.3 9.3 r 9.3 5.4 5.4 r 7.4 5.3 7.3 :8 5.4
    `,
  },
  {
    id: 'i04-disco-octave',
    title: 'Disco Octave',
    subtitle: 'Driving 8th-note octaves at 5th position',
    difficulty: 'intermediate',
    category: 'Groove Patterns',
    defaultTempo: 110,
    tex: `
      \\title "Disco Octave"
      \\subtitle "Steady 8th octaves"
      \\tempo 110
      \\instrument 34
      \\tuning g2 d2 a1 e1
      \\ts 4 4
      .
      \\clef F4
      :8 5.4 7.2 5.4 7.2 5.4 7.2 5.4 7.2 |
      5.4 7.2 5.4 7.2 5.4 7.2 5.4 7.2 |
      7.4 9.2 7.4 9.2 7.4 9.2 7.4 9.2 |
      7.4 9.2 7.4 9.2 5.4 7.2 5.4 7.2
    `,
  },
  {
    id: 'i05-gallop-16ths',
    title: 'Gallop 16ths',
    subtitle: '8th + two 16ths gallop feel with melody',
    difficulty: 'intermediate',
    category: 'Groove Patterns',
    defaultTempo: 90,
    tex: `
      \\title "Gallop 16ths"
      \\subtitle "Gallop rhythm"
      \\tempo 90
      \\instrument 34
      \\tuning g2 d2 a1 e1
      \\ts 4 4
      .
      \\clef F4
      :8 5.4 :16 7.4 5.4 :8 5.3 :16 7.3 5.3 :8 5.4 :16 7.4 5.4 :8 5.3 :16 7.3 5.3 |
      :8 5.4 :16 7.4 5.4 :8 5.3 :16 7.3 5.3 :8 5.4 :16 7.4 5.4 :8 5.3 :16 7.3 5.3 |
      :8 7.4 :16 9.4 7.4 :8 7.3 :16 9.3 7.3 :8 7.4 :16 9.4 7.4 :8 7.3 :16 9.3 7.3 |
      :8 7.4 :16 5.4 7.4 :8 5.3 :16 7.3 5.3 :8 7.4 :16 5.4 7.4 :8 5.3 :16 7.3 5.4
    `,
  },
];
