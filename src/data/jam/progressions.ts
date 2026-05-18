export type Style = 'rock' | 'funk' | 'blues' | 'reggae' | 'jazz';

export interface Progression {
  name: string;
  /** Roman numeral per bar (when no originalKey) — tonal's Progression.fromRomanNumerals notation.
   *  Absolute chord names (when originalKey is set) — e.g. 'Cm7', 'F7'. */
  bars: string[];
  beatsPerBar: number;
  /** When present, bars[] are absolute chord names stored in this key.
   *  Transposed at runtime to the user's selected root via Chord.transpose. */
  originalKey?: string;
}

// Note: Roman-numeral progressions use tonal convention — explicit 'm' for minor (e.g. VIm, Im7)
export const PROGRESSIONS: Record<Style, Progression[]> = {
  blues: [
    {
      name: '12-bar blues',
      beatsPerBar: 4,
      bars: ['I7','I7','I7','I7','IV7','IV7','I7','I7','V7','IV7','I7','I7'],
    },
    {
      name: 'Quick-change blues',
      beatsPerBar: 4,
      bars: ['I7','IV7','I7','I7','IV7','IV7','I7','I7','V7','IV7','I7','I7'],
    },
    {
      name: 'Minor blues',
      beatsPerBar: 4,
      bars: ['Im7','Im7','Im7','Im7','IVm7','IVm7','Im7','Im7','Vm7','IVm7','Im7','Im7'],
    },
  ],

  rock: [
    {
      name: 'I – V – vi – IV',
      beatsPerBar: 4,
      bars: ['I', 'V', 'VIm', 'IV'],
    },
    {
      name: 'I – IV – V',
      beatsPerBar: 4,
      bars: ['I', 'I', 'IV', 'IV', 'V', 'V', 'I', 'I'],
    },
  ],

  funk: [
    {
      name: 'i7 – IV7 vamp',
      beatsPerBar: 4,
      bars: ['Im7', 'Im7', 'IV7', 'IV7'],
    },
    {
      name: 'i7 – bVII7 – bVI',
      beatsPerBar: 4,
      bars: ['Im7', 'Im7', 'bVII7', 'bVI'],
    },
  ],

  reggae: [
    {
      name: 'I – bVII – IV',
      beatsPerBar: 4,
      bars: ['I', 'bVII', 'IV', 'I'],
    },
    {
      name: 'I – IV – V',
      beatsPerBar: 4,
      bars: ['I', 'IV', 'V', 'IV'],
    },
  ],

  // ── Jazz standards ────────────────────────────────────────────────────────
  // Bars are absolute chord names in originalKey; transposed at runtime.
  // Simplified to 1 chord per bar (primary chord when bar has 2).
  jazz: [
    {
      // Joseph Kosma, 1945 — A section (8 bars). Play in G (Gm tonic).
      name: 'Autumn Leaves',
      beatsPerBar: 4,
      originalKey: 'G',
      bars: ['Cm7','F7','Bbmaj7','Ebmaj7','Am7b5','D7','Gm7','Gm7'],
    },
    {
      // Miles Davis, Kind of Blue, 1959 — modal Dorian. Play in D.
      name: 'So What',
      beatsPerBar: 4,
      originalKey: 'D',
      bars: [
        'Dm7','Dm7','Dm7','Dm7','Dm7','Dm7','Dm7','Dm7',
        'Ebm7','Ebm7','Ebm7','Ebm7',
        'Dm7','Dm7','Dm7','Dm7',
      ],
    },
    {
      // Kenny Dorham, 1963 — C minor with brief Db major section. Play in C.
      name: 'Blue Bossa',
      beatsPerBar: 4,
      originalKey: 'C',
      bars: [
        'Cm7','Cm7','Fm7','Fm7',
        'Dm7b5','G7','Cm7','Cm7',
        'Ebm7','Ab7','Dbmaj7','Dbmaj7',
        'Dm7b5','G7','Cm7','Cm7',
      ],
    },
    {
      // Sonny Rollins, 1956 — calypso feel. Play in F.
      name: 'St. Thomas',
      beatsPerBar: 4,
      originalKey: 'F',
      bars: [
        'Fmaj7','Fmaj7','C7','C7','Dm7','Gm7','C7','Fmaj7',
        'Bbmaj7','Bbmaj7','Gm7','C7','Fmaj7','Fmaj7','Gm7','C7',
      ],
    },
    {
      // Gerald Marks & Seymour Simons, 1931. Play in C.
      name: 'All of Me',
      beatsPerBar: 4,
      originalKey: 'C',
      bars: [
        'Cmaj7','Cmaj7','E7','E7','A7','A7','Dm','Dm',
        'E7','E7','Am','Am','D7','D7','Dm7','G7',
      ],
    },
    {
      // George Gershwin, 1935 — A minor. Play in A.
      name: 'Summertime',
      beatsPerBar: 4,
      originalKey: 'A',
      bars: ['Am7','Am7','E7','E7','Am7','D7','Am7','E7'],
    },
    {
      // George Gershwin, 1930 — A section of "I Got Rhythm". Play in Bb.
      name: 'Rhythm Changes',
      beatsPerBar: 4,
      originalKey: 'Bb',
      bars: ['Bbmaj7','Gm7','Cm7','F7','Bbmaj7','Gm7','Cm7','F7'],
    },
    {
      // Ray Henderson, 1926 — classic jam standard. Play in F.
      name: 'Bye Bye Blackbird',
      beatsPerBar: 4,
      originalKey: 'F',
      bars: [
        'Fmaj7','Fmaj7','Gm7','C7','Fmaj7','Fmaj7','Am7','D7',
        'Gm7','Gm7','C7','C7','Am7','D7','Gm7','C7',
      ],
    },
    {
      // Erroll Garner, 1954 — A section. Play in Eb.
      name: 'Misty',
      beatsPerBar: 4,
      originalKey: 'Eb',
      bars: ['Ebmaj7','Bb7','Abmaj7','Abm7','Ebmaj7','Fm7','Gm7','Fm7'],
    },
    {
      // Standard bebop blues form. Play in F.
      name: 'Jazz Blues',
      beatsPerBar: 4,
      originalKey: 'F',
      bars: ['F7','Bb7','F7','F7','Bb7','Bb7','Am7','D7','Gm7','C7','F7','C7'],
    },
  ],
};

export const STYLE_LABELS: Record<Style, string> = {
  rock: 'Rock',
  funk: 'Funk',
  blues: 'Blues',
  reggae: 'Reggae',
  jazz: 'Jazz',
};

export const CHROMATIC_ROOTS = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'] as const;
export type RootNote = typeof CHROMATIC_ROOTS[number];
