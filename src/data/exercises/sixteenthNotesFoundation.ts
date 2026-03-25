import type { Exercise } from './types';

export const sixteenthNotesFoundation: Exercise[] = [
  {
    id: 'b01-straight-16ths-e-groove',
    title: 'Straight 16ths – E Groove',
    subtitle: 'Steady 16ths around 5th-7th fret on E string',
    difficulty: 'beginner',
    category: '16th Notes Foundation',
    defaultTempo: 70,
    tex: `
      \\title "Straight 16ths – E Groove"
      \\subtitle "Keep it even!"
      \\tempo 70
      \\instrument 34
      \\tuning g2 d2 a1 e1
      \\ts 4 4
      .
      \\clef F4
      :16 5.4 5.4 7.4 5.4 5.4 5.4 7.4 5.4 5.4 5.4 7.4 5.4 5.4 5.4 7.4 5.4 |
      5.4 5.4 7.4 5.4 5.4 5.4 7.4 5.4 5.4 5.4 7.4 5.4 5.4 5.4 7.4 5.4 |
      7.4 7.4 5.4 7.4 7.4 7.4 5.4 7.4 7.4 7.4 5.4 7.4 7.4 7.4 5.4 7.4 |
      5.4 5.4 7.4 5.4 5.4 5.4 7.4 5.4 5.4 5.4 7.4 5.4 5.4 5.4 7.4 5.4
    `,
  },
  {
    id: 'b02-straight-16ths-a-groove',
    title: 'Straight 16ths – A Groove',
    subtitle: 'Same concept on the A string with frets 5-7',
    difficulty: 'beginner',
    category: '16th Notes Foundation',
    defaultTempo: 70,
    tex: `
      \\title "Straight 16ths – A Groove"
      \\subtitle "A string melody"
      \\tempo 70
      \\instrument 34
      \\tuning g2 d2 a1 e1
      \\ts 4 4
      .
      \\clef F4
      :16 5.3 5.3 7.3 5.3 5.3 5.3 7.3 5.3 5.3 5.3 7.3 5.3 5.3 5.3 7.3 5.3 |
      7.3 7.3 5.3 7.3 7.3 7.3 5.3 7.3 7.3 7.3 5.3 7.3 7.3 7.3 5.3 7.3 |
      5.3 7.3 5.3 7.3 5.3 7.3 5.3 7.3 5.3 7.3 5.3 7.3 5.3 7.3 5.3 7.3 |
      7.3 5.3 7.3 5.3 7.3 5.3 7.3 5.3 7.3 5.3 7.3 5.3 7.3 5.3 7.3 5.3
    `,
  },
  {
    id: 'b03-16ths-with-rests',
    title: '16ths with Rests',
    subtitle: 'Melodic 16ths with rests on beats 2 and 4',
    difficulty: 'beginner',
    category: '16th Notes Foundation',
    defaultTempo: 70,
    tex: `
      \\title "16ths with Rests"
      \\subtitle "Feel the space"
      \\tempo 70
      \\instrument 34
      \\tuning g2 d2 a1 e1
      \\ts 4 4
      .
      \\clef F4
      :16 5.4 7.4 5.4 7.4 r r r r 5.3 7.3 5.3 7.3 r r r r |
      5.4 7.4 5.4 7.4 r r r r 5.3 7.3 5.3 7.3 r r r r |
      7.4 5.4 7.4 5.4 r r r r 7.3 5.3 7.3 5.3 r r r r |
      5.4 7.4 5.4 7.4 r r r r 5.3 7.3 5.3 7.3 r r r r
    `,
  },
  {
    id: 'b04-two-string-melodic',
    title: 'Two-String Melodic',
    subtitle: 'Alternate E and A strings with fretted notes',
    difficulty: 'beginner',
    category: '16th Notes Foundation',
    defaultTempo: 65,
    tex: `
      \\title "Two-String Melodic"
      \\subtitle "E and A with melody"
      \\tempo 65
      \\instrument 34
      \\tuning g2 d2 a1 e1
      \\ts 4 4
      .
      \\clef F4
      :16 5.4 7.4 5.3 7.3 5.4 7.4 5.3 7.3 5.4 7.4 5.3 7.3 5.4 7.4 5.3 7.3 |
      7.4 5.4 7.3 5.3 7.4 5.4 7.3 5.3 7.4 5.4 7.3 5.3 7.4 5.4 7.3 5.3 |
      5.4 5.4 7.3 7.3 5.4 5.4 7.3 7.3 5.4 5.4 7.3 7.3 5.4 5.4 7.3 7.3 |
      7.3 7.3 5.4 5.4 7.3 7.3 5.4 5.4 7.3 7.3 5.4 5.4 7.3 7.3 5.4 5.4
    `,
  },
  {
    id: 'b05-quarter-and-16ths',
    title: 'Quarter + 16ths',
    subtitle: 'Quarter note anchor then 16th fills',
    difficulty: 'beginner',
    category: '16th Notes Foundation',
    defaultTempo: 65,
    tex: `
      \\title "Quarter + 16ths"
      \\subtitle "Mix quarter and 16ths"
      \\tempo 65
      \\instrument 34
      \\tuning g2 d2 a1 e1
      \\ts 4 4
      .
      \\clef F4
      :4 5.4 :16 5.4 7.4 5.4 7.4 :4 5.3 :16 5.3 7.3 5.3 7.3 |
      :4 7.4 :16 7.4 5.4 7.4 5.4 :4 7.3 :16 7.3 5.3 7.3 5.3 |
      :4 5.4 :16 5.4 7.4 5.3 7.3 :4 5.3 :16 7.3 5.3 7.4 5.4 |
      :4 7.4 :16 5.4 7.4 5.3 7.3 :4 5.4 :16 7.4 5.4 7.4 5.4
    `,
  },
  {
    id: 'b06-one-beat-rest',
    title: 'One Beat On / One Beat Off',
    subtitle: 'Melodic 16ths with alternating silent beats',
    difficulty: 'beginner',
    category: '16th Notes Foundation',
    defaultTempo: 70,
    tex: `
      \\title "One Beat On / One Beat Off"
      \\subtitle "Precision starts & stops"
      \\tempo 70
      \\instrument 34
      \\tuning g2 d2 a1 e1
      \\ts 4 4
      .
      \\clef F4
      :16 5.4 7.4 5.4 7.4 r r r r 5.3 7.3 5.3 7.3 r r r r |
      7.4 5.4 7.4 5.4 r r r r 7.3 5.3 7.3 5.3 r r r r |
      r r r r 5.4 7.4 5.3 7.3 r r r r 7.3 5.3 7.4 5.4 |
      r r r r 5.4 5.4 7.4 7.4 r r r r 5.3 5.3 7.3 7.3
    `,
  },
];
