import type { Exercise } from './types';

export const advancedGrooves: Exercise[] = [
  {
    id: 'a01-ghost-note-groove',
    title: 'Ghost Note Groove',
    subtitle: 'Dead notes for texture',
    difficulty: 'advanced',
    category: 'Advanced Grooves',
    defaultTempo: 90,
    tex: `
      \\title "Ghost Note Groove"
      \\subtitle "Feel the ghost notes"
      \\tempo 90
      \\instrument 34
      \\tuning e1 a1 d2 g2
      \\ts 4 4
      .
      :16 0.1 x.1 x.1 0.1 r x.1 0.1 x.1 0.1 x.1 x.1 0.1 r x.1 0.1 x.1 |
      0.1 x.1 x.1 0.1 r x.1 0.1 x.1 0.1 x.1 x.1 0.1 r x.1 0.1 x.1 |
      3.1 x.1 x.1 3.1 r x.1 5.1 x.1 3.1 x.1 x.1 3.1 r x.1 5.1 x.1 |
      3.1 x.1 x.1 3.1 r x.1 5.1 x.1 3.1 x.1 x.1 3.1 r x.1 :8 0.1
    `,
  },
  {
    id: 'a02-mixed-subdivision',
    title: 'Mixed Subdivisions',
    subtitle: '8th and 16th groupings',
    difficulty: 'advanced',
    category: 'Advanced Grooves',
    defaultTempo: 85,
    tex: `
      \\title "Mixed Subdivisions"
      \\subtitle "8ths and 16ths combined"
      \\tempo 85
      \\instrument 34
      \\tuning e1 a1 d2 g2
      \\ts 4 4
      .
      :8 0.1 :16 0.1 0.1 :8 3.1 :16 3.1 3.1 :8 5.1 :16 5.1 5.1 :8 3.1 :16 3.1 3.1 |
      :8 0.1 :16 0.1 0.1 :8 3.1 :16 3.1 3.1 :8 5.1 :16 5.1 5.1 :8 3.1 :16 3.1 3.1 |
      :16 0.1 0.1 :8 0.1 :16 3.1 3.1 :8 3.1 :16 5.1 5.1 :8 5.1 :16 3.1 3.1 :8 3.1 |
      :16 0.1 0.1 :8 0.1 :16 3.1 3.1 :8 3.1 :16 5.1 5.1 :8 5.1 :16 3.1 3.1 :8 0.1
    `,
  },
  {
    id: 'a03-double-ghost',
    title: 'Double Ghost Funk',
    subtitle: 'Two ghost notes between accents',
    difficulty: 'advanced',
    category: 'Advanced Grooves',
    defaultTempo: 85,
    tex: `
      \\title "Double Ghost Funk"
      \\subtitle "Deep pocket"
      \\tempo 85
      \\instrument 34
      \\tuning e1 a1 d2 g2
      \\ts 4 4
      .
      :16 0.1 x.1 x.1 r 0.2 x.1 x.1 r 0.1 x.1 x.1 r 0.2 x.1 x.1 r |
      0.1 x.1 x.1 r 0.2 x.1 x.1 r 0.1 x.1 x.1 r 0.2 x.1 x.1 r |
      3.1 x.1 x.1 r 5.1 x.1 x.1 r 3.1 x.1 x.1 r 5.1 x.1 x.1 r |
      3.1 x.1 x.1 r 5.1 x.1 x.1 r 3.1 x.1 x.1 r 5.1 x.1 :8 0.1
    `,
  },
  {
    id: 'a04-off-beat-16th-accent',
    title: 'Off-Beat 16th Accents',
    subtitle: 'Accent the "e" of every beat',
    difficulty: 'advanced',
    category: 'Advanced Grooves',
    defaultTempo: 80,
    tex: `
      \\title "Off-Beat 16th Accents"
      \\subtitle "Accent the e"
      \\tempo 80
      \\instrument 34
      \\tuning e1 a1 d2 g2
      \\ts 4 4
      .
      :16 r 0.1 r r r 0.2 r r r 0.1 r r r 0.2 r r |
      r 0.1 r r r 0.2 r r r 0.1 r r r 0.2 r r |
      r 3.1 r r r 5.1 r r r 3.1 r r r 5.1 r r |
      r 3.1 r r r 5.1 r r r 3.1 r r r 5.1 :8 0.1
    `,
  },
];
