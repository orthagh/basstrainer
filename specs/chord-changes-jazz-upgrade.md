# Chord Changes — Jazz Upgrade Spec

## Goal

Add Jazz as a 5th style in the Chord Changes practice trainer, with:
- **Real jazz standard chord changes** (not approximated Roman numerals)
- **Richer backing audio**: organ pad layer + jazz piano comp rhythm

---

## Data Architecture

### `Progression` interface — add `originalKey`

```ts
export interface Progression {
  name: string;
  bars: string[];        // Roman numerals when no originalKey; absolute chord names otherwise
  beatsPerBar: number;
  originalKey?: string;  // When present, bars[] are absolute chord names (e.g. 'Cm7', 'F7')
}
```

### Chord transposition (for iReal-sourced songs)

```ts
import { Note, Chord } from 'tonal';
const ivl = Note.distance(originalKey, rootNote);
const transposedChord = Chord.transpose(chord, ivl) || chord;
```

`Note.distance` returns the ascending interval (e.g. `'G'→'A'` = `'2M'`).
`Chord.transpose` handles any chord symbol including `Cm7b5`, `Dbmaj7`, etc.

---

## Jazz Standards (10 songs)

All stored with `originalKey`; bars are absolute chord names in that key.

| Song | Composer | Original Key | Bars |
|------|----------|-------------|------|
| Autumn Leaves | Kosma, 1945 | G (Gm tonic) | 8 |
| So What | Miles Davis, 1959 | D (Dm Dorian) | 16 |
| Blue Bossa | Kenny Dorham, 1963 | C (Cm tonic) | 16 |
| St. Thomas | Sonny Rollins, 1956 | F | 16 |
| All of Me | Marks/Simons, 1931 | C | 16 |
| Summertime | Gershwin, 1935 | A (Am tonic) | 8 |
| Rhythm Changes A | Gershwin, 1930 | Bb | 8 |
| Bye Bye Blackbird | Henderson, 1926 | F | 16 |
| Misty | Erroll Garner, 1954 | Eb | 8 |
| Jazz Blues | standard form | F | 12 |

*Note: all simplified to 1 chord per bar. Standards with 2 chords/bar use the primary chord.*

---

## Audio Architecture

### Existing layers
- **DrumKit** (synthesized): kick, snare, hi-hat, ride, crash, toms
- **Piano Sampler** (Salamander CDN): plays chord voicings

### New: Organ pad layer
- `Tone.PolySynth(Tone.Synth)` with sine oscillator
- Slow attack (0.08s), full sustain, slow release
- Plays whole-note sustained chords per bar
- Active only for jazz and blues styles
- Volume: −20 dB (cushion behind piano)

### Jazz comp rhythm change
- Current: piano plays on beat 1 of each bar
- Jazz: piano plays short stabs on beats 2 and 4 (duration `'8n'`)
- Other styles: unchanged (beat 1, duration `'2n'`)

---

## Files Changed

| File | Change |
|------|--------|
| `src/data/jam/progressions.ts` | `'jazz'` to `Style`; `originalKey?` to interface; 10 jazz progressions |
| `src/data/jam/drumLoops.ts` | Jazz swing ride pattern + `LOOP_BARS['jazz']` |
| `src/features/practice/ChordChangesTrainer.tsx` | `'jazz'` to `STYLES`; update `ChordGrid` to branch on `originalKey` |
| `src/hooks/useJamPlayer.ts` | `originalKey` in `resolveChordNotes`; organ `PolySynth` layer; jazz comp rhythm |

---

## Future: iReal Pro import script

`scripts/importJazzStandards.ts` — paste iReal Pro URL strings for any song,
parse with `ireal-reader` (npm, `pianosnake/ireal-reader`), normalize notation
(`^7`→`maj7`, `ø`→`m7b5`, `-`→`m`), print TS array.

This allows expanding the song library from any iReal Pro community playlist
without manual transcription.
