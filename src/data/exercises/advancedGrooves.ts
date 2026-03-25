import type { Exercise } from './types';

export const advancedGrooves: Exercise[] = [
  {
    id: 'a01-ghost-note-groove',
    title: 'Ghost Note Groove',
    subtitle: 'Dead notes for texture at 5th position',
    difficulty: 'advanced',
    category: 'Advanced Grooves',
    defaultTempo: 90,
    tex: `
      \\title "Ghost Note Groove"
      \\subtitle "Feel the ghost notes"
      \\tempo 90
      \\instrument 34
      \\tuning g2 d2 a1 e1
      \\ts 4 4
      .
      \\clef F4
      :16 5.4 x.4 x.4 5.4 r x.4 7.4 x.4 5.4 x.4 x.4 5.4 r x.4 7.4 x.4 |
      5.4 x.4 x.4 5.4 r x.4 7.4 x.4 5.4 x.4 x.4 5.4 r x.4 7.4 x.4 |
      7.4 x.4 x.4 7.4 r x.4 9.4 x.4 7.4 x.4 x.4 7.4 r x.4 5.4 x.4 |
      7.4 x.4 x.4 7.4 r x.4 9.4 x.4 5.4 x.4 x.4 7.4 r x.4 :8 5.4
    `,
  },
  {
    id: 'a02-mixed-subdivision',
    title: 'Mixed Subdivisions',
    subtitle: '8th and 16th groupings with melody',
    difficulty: 'advanced',
    category: 'Advanced Grooves',
    defaultTempo: 85,
    tex: `
      \\title "Mixed Subdivisions"
      \\subtitle "8ths and 16ths combined"
      \\tempo 85
      \\instrument 34
      \\tuning g2 d2 a1 e1
      \\ts 4 4
      .
      \\clef F4
      :8 5.4 :16 7.4 5.4 :8 7.4 :16 5.3 7.3 :8 5.3 :16 7.3 5.4 :8 7.4 :16 5.4 7.4 |
      :8 5.4 :16 7.4 5.4 :8 7.4 :16 5.3 7.3 :8 5.3 :16 7.3 5.4 :8 7.4 :16 5.4 7.4 |
      :16 7.4 9.4 :8 7.4 :16 5.3 7.3 :8 5.3 :16 9.4 7.4 :8 9.4 :16 7.3 5.3 :8 7.3 |
      :16 7.4 9.4 :8 7.4 :16 5.3 7.3 :8 5.3 :16 7.4 5.4 :8 7.4 :16 5.3 7.3 :8 5.4
    `,
  },
  {
    id: 'a03-double-ghost',
    title: 'Double Ghost Funk',
    subtitle: 'Two ghost notes between fretted accents',
    difficulty: 'advanced',
    category: 'Advanced Grooves',
    defaultTempo: 85,
    tex: `
      \\title "Double Ghost Funk"
      \\subtitle "Deep pocket"
      \\tempo 85
      \\instrument 34
      \\tuning g2 d2 a1 e1
      \\ts 4 4
      .
      \\clef F4
      :16 5.4 x.4 x.4 r 7.3 x.4 x.4 r 5.4 x.4 x.4 r 7.3 x.4 x.4 r |
      5.4 x.4 x.4 r 7.3 x.4 x.4 r 5.4 x.4 x.4 r 7.3 x.4 x.4 r |
      7.4 x.4 x.4 r 9.3 x.4 x.4 r 7.4 x.4 x.4 r 5.3 x.4 x.4 r |
      7.4 x.4 x.4 r 9.3 x.4 x.4 r 5.4 x.4 x.4 r 7.4 x.4 :8 5.4
    `,
  },
  {
    id: 'a04-off-beat-16th-accent',
    title: 'Off-Beat 16th Accents',
    subtitle: 'Accent the "e" with fretted melody',
    difficulty: 'advanced',
    category: 'Advanced Grooves',
    defaultTempo: 80,
    tex: `
      \\title "Off-Beat 16th Accents"
      \\subtitle "Accent the e"
      \\tempo 80
      \\instrument 34
      \\tuning g2 d2 a1 e1
      \\ts 4 4
      .
      \\clef F4
      :16 r 5.4 r r r 7.3 r r r 5.4 r r r 7.3 r r |
      r 5.4 r r r 7.3 r r r 5.4 r r r 7.3 r r |
      r 7.4 r r r 9.3 r r r 7.4 r r r 5.3 r r |
      r 7.4 r r r 9.3 r r r 5.4 r r r 7.4 :8 5.4
    `,
  },
];
