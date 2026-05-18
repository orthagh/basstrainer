export const NOTE_NAMES_EN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTE_NAMES_FR = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

// Standard 4-string bass MIDI (low→high): E1=28, A1=33, D2=38, G2=43
export const STANDARD_BASS_4 = [28, 33, 38, 43];

export interface NoteInfo {
  en: string;
  fr: string;
  octave: number;
  pitchClass: number;
  midi: number;
}

export function midiToNoteInfo(midi: number): NoteInfo {
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return { en: NOTE_NAMES_EN[pitchClass], fr: NOTE_NAMES_FR[pitchClass], octave, pitchClass, midi };
}

// Pitch classes for natural (non-accidental) notes: C D E F G A B
const NATURAL_PITCH_CLASSES = new Set([0, 2, 4, 5, 7, 9, 11]);

export function isNaturalNote(midi: number): boolean {
  return NATURAL_PITCH_CLASSES.has(((midi % 12) + 12) % 12);
}

export interface FretPosition {
  string: number; // 0 = lowest string (E)
  fret: number;
}

export function getNotePositions(
  midi: number,
  tuning: number[] = STANDARD_BASS_4,
  maxFret = 17,
  minFret = 0,
): FretPosition[] {
  const positions: FretPosition[] = [];
  for (let s = 0; s < tuning.length; s++) {
    const fret = midi - tuning[s];
    if (fret >= minFret && fret <= maxFret) {
      positions.push({ string: s, fret });
    }
  }
  return positions;
}

export interface ScalePosition extends FretPosition {
  midi: number;
  degree: number;
}

export function buildScalePositions(
  rootMidi: number,
  scaleIntervals: number[],
  tuning: number[] = STANDARD_BASS_4,
  minFret = 0,
  maxFret = 4,
): ScalePosition[] {
  const positions: ScalePosition[] = [];
  const seen = new Set<string>();

  for (let octave = -1; octave <= 2; octave++) {
    for (let d = 0; d < scaleIntervals.length; d++) {
      const noteMidi = rootMidi + octave * 12 + scaleIntervals[d];
      for (let s = 0; s < tuning.length; s++) {
        const fret = noteMidi - tuning[s];
        if (fret >= minFret && fret <= maxFret) {
          const key = `${s}-${fret}`;
          if (!seen.has(key)) {
            seen.add(key);
            positions.push({ string: s, fret, midi: noteMidi, degree: d });
          }
        }
      }
    }
  }

  return positions.sort((a, b) => a.midi !== b.midi ? a.midi - b.midi : a.string - b.string);
}

// Get all unique MIDI notes available in a given string/fret range
export function getAvailableMidiNotes(
  tuning: number[],
  strings: number[], // string indices to include
  minFret: number,
  maxFret: number,
  naturalOnly: boolean,
): number[] {
  const midiSet = new Set<number>();
  for (const s of strings) {
    for (let f = minFret; f <= maxFret; f++) {
      const midi = tuning[s] + f;
      if (!naturalOnly || isNaturalNote(midi)) {
        midiSet.add(midi);
      }
    }
  }
  return Array.from(midiSet).sort((a, b) => a - b);
}

// Shuffle array in place (Fisher-Yates)
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build a session note queue: shuffled, ensuring no two identical notes in a row
export function buildNoteQueue(notePool: number[], count: number): number[] {
  if (notePool.length === 0) return [];
  const queue: number[] = [];
  let last = -1;
  while (queue.length < count) {
    const shuffled = shuffle(notePool);
    for (const n of shuffled) {
      if (n !== last) {
        queue.push(n);
        last = n;
        if (queue.length >= count) break;
      }
    }
    // Safety: avoid infinite loop if only 1 note in pool
    if (notePool.length === 1) {
      while (queue.length < count) queue.push(notePool[0]);
      break;
    }
  }
  return queue;
}

export interface IntervalDef {
  name: string;
  nameFr: string;
  shortName: string;
  semitones: number;
}

// Bass-priority order: octave, P5, P4, 3rds, 7ths, 2nds, 6ths, tritone
export const INTERVALS: IntervalDef[] = [
  { name: 'Octave',      nameFr: 'Octave',       shortName: 'P8', semitones: 12 },
  { name: 'Perfect 5th', nameFr: 'Quinte juste', shortName: 'P5', semitones: 7  },
  { name: 'Perfect 4th', nameFr: 'Quarte juste', shortName: 'P4', semitones: 5  },
  { name: 'Major 3rd',   nameFr: 'Tierce maj.',  shortName: 'M3', semitones: 4  },
  { name: 'Minor 3rd',   nameFr: 'Tierce min.',  shortName: 'm3', semitones: 3  },
  { name: 'Minor 7th',   nameFr: 'Septième min.',shortName: 'm7', semitones: 10 },
  { name: 'Major 7th',   nameFr: 'Septième maj.',shortName: 'M7', semitones: 11 },
  { name: 'Major 2nd',   nameFr: 'Seconde maj.', shortName: 'M2', semitones: 2  },
  { name: 'Minor 2nd',   nameFr: 'Seconde min.', shortName: 'm2', semitones: 1  },
  { name: 'Major 6th',   nameFr: 'Sixte maj.',   shortName: 'M6', semitones: 9  },
  { name: 'Minor 6th',   nameFr: 'Sixte min.',   shortName: 'm6', semitones: 8  },
  { name: 'Tritone',     nameFr: 'Triton',       shortName: 'b5', semitones: 6  },
];

export interface ScaleDef {
  name: string;
  nameFr: string;
  intervals: number[];
}

export const SCALES: Record<string, ScaleDef> = {
  major:           { name: 'Major',            nameFr: 'Majeure',              intervals: [0, 2, 4, 5, 7, 9, 11] },
  naturalMinor:    { name: 'Natural Minor',    nameFr: 'Mineure naturelle',    intervals: [0, 2, 3, 5, 7, 8, 10] },
  minorPentatonic: { name: 'Minor Pentatonic', nameFr: 'Pentatonique mineure', intervals: [0, 3, 5, 7, 10]       },
  majorPentatonic: { name: 'Major Pentatonic', nameFr: 'Pentatonique majeure', intervals: [0, 2, 4, 7, 9]        },
  blues:           { name: 'Blues',            nameFr: 'Blues',                intervals: [0, 3, 5, 6, 7, 10]    },
};
