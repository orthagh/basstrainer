import type { Exercise } from './types';

export const sixteenthNotesFoundation: Exercise[] = [
  {
    id: 'b01-straight-16ths-open',
    title: 'Straight 16ths – Open E',
    subtitle: 'Play steady 16th notes on the open E string',
    difficulty: 'beginner',
    category: '16th Notes Foundation',
    defaultTempo: 70,
    tex: `
      \\title "Straight 16ths – Open E"
      \\subtitle "Keep it even!"
      \\tempo 70
      \\instrument 34
      \\tuning e1 a1 d2 g2
      \\ts 4 4
      .
      :16 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 |
      0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 |
      0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 |
      0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1 0.1
    `,
  },
  {
    id: 'b02-straight-16ths-open-a',
    title: 'Straight 16ths – Open A',
    subtitle: 'Same drill on the A string',
    difficulty: 'beginner',
    category: '16th Notes Foundation',
    defaultTempo: 70,
    tex: `
      \\title "Straight 16ths – Open A"
      \\subtitle "A string focus"
      \\tempo 70
      \\instrument 34
      \\tuning e1 a1 d2 g2
      \\ts 4 4
      .
      :16 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 |
      0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 |
      0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 |
      0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2
    `,
  },
  {
    id: 'b03-16ths-with-rests',
    title: '16ths with Rests',
    subtitle: 'Rests on beats 2 and 4',
    difficulty: 'beginner',
    category: '16th Notes Foundation',
    defaultTempo: 70,
    tex: `
      \\title "16ths with Rests"
      \\subtitle "Feel the space"
      \\tempo 70
      \\instrument 34
      \\tuning e1 a1 d2 g2
      \\ts 4 4
      .
      :16 0.1 0.1 0.1 0.1 r r r r 0.1 0.1 0.1 0.1 r r r r |
      0.1 0.1 0.1 0.1 r r r r 0.1 0.1 0.1 0.1 r r r r |
      0.1 0.1 0.1 0.1 r r r r 0.1 0.1 0.1 0.1 r r r r |
      0.1 0.1 0.1 0.1 r r r r 0.1 0.1 0.1 0.1 r r r r
    `,
  },
  {
    id: 'b04-two-string-alternating',
    title: 'Two-String Alternating',
    subtitle: 'Alternate E and A strings',
    difficulty: 'beginner',
    category: '16th Notes Foundation',
    defaultTempo: 65,
    tex: `
      \\title "Two-String Alternating"
      \\subtitle "E and A strings"
      \\tempo 65
      \\instrument 34
      \\tuning e1 a1 d2 g2
      \\ts 4 4
      .
      :16 0.1 0.1 0.2 0.2 0.1 0.1 0.2 0.2 0.1 0.1 0.2 0.2 0.1 0.1 0.2 0.2 |
      0.1 0.1 0.2 0.2 0.1 0.1 0.2 0.2 0.1 0.1 0.2 0.2 0.1 0.1 0.2 0.2 |
      0.2 0.2 0.1 0.1 0.2 0.2 0.1 0.1 0.2 0.2 0.1 0.1 0.2 0.2 0.1 0.1 |
      0.2 0.2 0.1 0.1 0.2 0.2 0.1 0.1 0.2 0.2 0.1 0.1 0.2 0.2 0.1 0.1
    `,
  },
  {
    id: 'b05-quarter-and-16ths',
    title: 'Quarter + 16ths',
    subtitle: 'Quarter note then four 16ths per beat',
    difficulty: 'beginner',
    category: '16th Notes Foundation',
    defaultTempo: 65,
    tex: `
      \\title "Quarter + 16ths"
      \\subtitle "Mix quarter and 16ths"
      \\tempo 65
      \\instrument 34
      \\tuning e1 a1 d2 g2
      \\ts 4 4
      .
      :4 0.1 :16 0.1 0.1 0.1 0.1 :4 0.2 :16 0.2 0.2 0.2 0.2 |
      :4 0.1 :16 0.1 0.1 0.1 0.1 :4 0.2 :16 0.2 0.2 0.2 0.2 |
      :4 0.2 :16 0.2 0.2 0.2 0.2 :4 0.1 :16 0.1 0.1 0.1 0.1 |
      :4 0.2 :16 0.2 0.2 0.2 0.2 :4 0.1 :16 0.1 0.1 0.1 0.1
    `,
  },
  {
    id: 'b06-one-beat-rest',
    title: 'One Beat On / One Beat Off',
    subtitle: '16ths with alternating silent beats',
    difficulty: 'beginner',
    category: '16th Notes Foundation',
    defaultTempo: 70,
    tex: `
      \\title "One Beat On / One Beat Off"
      \\subtitle "Precision starts & stops"
      \\tempo 70
      \\instrument 34
      \\tuning e1 a1 d2 g2
      \\ts 4 4
      .
      :16 0.1 0.1 0.1 0.1 r r r r 0.2 0.2 0.2 0.2 r r r r |
      0.1 0.1 0.1 0.1 r r r r 0.2 0.2 0.2 0.2 r r r r |
      r r r r 0.1 0.1 0.1 0.1 r r r r 0.2 0.2 0.2 0.2 |
      r r r r 0.1 0.1 0.1 0.1 r r r r 0.2 0.2 0.2 0.2
    `,
  },
];
