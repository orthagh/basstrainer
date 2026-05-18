# Jam Feature — Idea Spec

## Goal

Add a "Jam" section alongside Directory, Tuner, and Metronome. The purpose is a play-along backing track player for improvisation and chord knowledge practice — more versatile than jazz-centric tools like iReal Pro.

**Genres targeted**: Rock/Funk, Blues, Reggae  
**Interaction model**: Pure play-along, no scoring or microphone analysis  
**Tempo**: Free BPM control (same feel as the metronome slider)  
**Instrument mix**: Drums + chord instrument (piano), ideally full-band minus bass

---

## Technical Stack

### JS Libraries (all MIT)
| Library | Role |
|---------|------|
| `tone` (Tone.js v15+) | Audio scheduling, BPM transport, polyphonic sample playback |
| `scribbletune` | Chord progressions from Roman numerals, rhythm patterns — works natively with Tone.js |
| `tonal` | Low-level music theory: key transposition, chord intervals |
| `@tonejs/midi` | Parse MIDI files from the Groove dataset during preprocessing |

### Drum Content — Groove MIDI Dataset (CC BY 4.0)
[Google Magenta Groove MIDI Dataset](https://magenta.tensorflow.org/datasets/groove): 1,150 MIDI files, 22,000+ measures of real professional drum performances, annotated by genre.

Covered genres include rock, funk, blues, reggae, afrobeat, jazz, pop, and more.

**Workflow**: download dataset once → run preprocessing script → extract 2–4 bar loops per style → commit as TypeScript data → Tone.js plays them through drum samples. The raw dataset is not committed to the repo.

This gives real human-played grooves instead of mechanical 16th-note step sequences — key for believable feel.

### Audio Samples (CC BY 3.0, self-hosted)
- **Drums**: [Salamander Drumkit](https://freesound.org/people/menegass/packs/2442/) — individual hits: kick, snare, hi-hat closed/open, ride, crash (~2 MB)
- **Piano**: [Salamander Grand Piano](https://github.com/sfztools/salamander-grand-piano) — 8 pitch points, Tone.js `Sampler` interpolates in between (~2.5 MB)

Both served from `public/samples/`. ~4–5 MB total, lazy-loaded on first play.

---

## Feature Scope (v1)

- **Style selector**: Rock, Funk, Blues, Reggae (tabs)
- **Progression picker**: 4–8 preset chord progressions per style
- **Key selector**: 12 chromatic roots (C through B)
- **BPM control**: slider + tap tempo (same component as metronome)
- **Chord display**: full progression shown, current chord highlighted, next chord visible
- **Play / Stop**

**Out of scope for v1**: custom progression editing, per-instrument mute, verse/chorus structure, recording, scoring.

---

## Drum Loops (from Groove MIDI Dataset)

| Style  | Genre tag in dataset | Feel |
|--------|---------------------|------|
| Rock   | `rock`              | 8th hi-hat, kick on 1&3, snare on 2&4 |
| Funk   | `funk`              | 16th hi-hat, syncopated kick, ghost snares |
| Blues  | `blues`             | Swing feel, 12-bar compatible |
| Reggae | `reggae`            | One-drop: kick on beat 3, open hi-hat on 2&4 |

1–2 loop variations per style. Stored as `src/data/jam/drumLoops.ts` (pre-extracted `{time, drum, velocity}` arrays).

---

## Chord Progressions

Scribbletune's `progression()` API handles Roman numeral → chord → notes, transposed to any key at runtime.

Preset examples:
- **Blues 12-bar**: `['I7','I7','I7','I7','IV7','IV7','I7','I7','V7','IV7','I7','V7']`
- **Rock**: `['I','V','vi','IV']`
- **Funk vamp**: `['i7','IV7']`
- **Reggae**: `['I','bVII','IV','I']`

Stored in `src/data/jam/progressions.ts`.

---

## Files to Create / Modify

### New
| Path | Purpose |
|------|---------|
| `src/components/JamPage.tsx` | Page layout — pickers, chord display, play controls |
| `src/hooks/useJamPlayer.ts` | Tone.js lifecycle: load samples, schedule drums + chords, BPM/play/stop |
| `src/data/jam/drumLoops.ts` | Pre-extracted Groove MIDI loops per style |
| `src/data/jam/progressions.ts` | Preset chord progression library per style |
| `scripts/extractGrooveLoops.ts` | One-time preprocessing script (not shipped) |
| `public/samples/drums/` | Salamander Drumkit MP3s |
| `public/samples/piano/` | Salamander Grand Piano MP3s |

### Modified
| Path | Change |
|------|--------|
| `src/App.tsx` | Add `'jam'` to `AppView`; add nav button; add route |
| `package.json` | Add `tone`, `scribbletune`, `tonal`, `@tonejs/midi` |

---

## UI Sketch

```
┌──────────────────────────────────────────────────────┐
│  [Rock] [Funk] [Blues] [Reggae]          Key: [C▾]  │
├──────────────────┬───────────────────────────────────┤
│  Progressions    │                                   │
│  ○ 12-bar blues  │   ┌────────────────────────────┐  │
│  ● Quick-change  │   │  ♩ = 120                   │  │
│  ○ Minor blues   │   │                            │  │
│  ○ Jazz blues    │   │  [A7]  D7  A7  E7          │  │
│                  │   │  bar 3/12                  │  │
│                  │   └────────────────────────────┘  │
│                  │                                   │
│                  │        BPM  [──●────]  140        │
│                  │                                   │
│                  │         [▶ Play / ■ Stop]         │
└──────────────────┴───────────────────────────────────┘
```

---

## Open Questions / Risks

1. **Tone.js AudioContext isolation**: Tone.js creates its own `AudioContext`. Needs to stay isolated from the tuner/metronome contexts — only active while on the Jam page.
2. **Blues shuffle authenticity**: Tone.js `Transport.swing` approximates triplet feel. The Groove MIDI Dataset blues loops should handle this better since they're real performances.
3. **Chord voicing register**: `tonal`/Scribbletune voicings may need an octave-normalization pass to keep chords in a playable mid-range (C3–C5).
4. **Scribbletune maintenance**: Last released ~2022. Small, stable, MIT — low risk, but worth monitoring.
