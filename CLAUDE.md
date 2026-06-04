# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev               # start dev server (Vite HMR)
npm run build             # type-check + production build
npm run lint              # ESLint
npm run test              # run tests once (vitest)
npm run test:watch        # vitest in watch mode
npm run preview           # serve the production build
npm run exercises:convert # convert Guitar Pro files in repository-exercises/
```

To run a single test file:
```bash
npx vitest run src/audio/pitchDetector.test.ts
```

## Architecture

Bass Trainer is a React/TypeScript app for practicing bass. It renders Guitar Pro
exercises as interactive sheet music to play along with, plus standalone practice
trainers, a metronome, and a microphone tuner.

The app has three top-level views, hash-routed in `App.tsx`
(`directory` / `metronome` / `practice`), plus a Tuner modal:

- **Directory** — browse and play Guitar Pro exercises rendered by AlphaTab.
- **Metronome** — `MetronomePage` (`useMetronome`).
- **Practice** — `PracticeHub` with Note / Interval / Scale / Chord-Changes trainers.
- **Tuner** — modal pitch display fed by the microphone.

### Audio pipeline (`src/audio/`)

Microphone audio is captured and analysed for pitch only (used by the tuner and the
practice trainers — there is no scoring/evaluation engine):

```
Microphone → AudioCapture → AudioAnalyser → PitchDetector → PitchResult (per frame)
```

- **`AudioCapture`** — wraps Web Audio API. Creates `MediaStream → GainNode → AnalyserNode`. Deliberately not connected to the destination (no feedback loop). Uses `fftSize: 8192` to reliably detect low bass frequencies (~30 Hz).
- **`PitchDetector`** — wraps the `pitchfinder` library. Converts PCM frames to a `PitchResult` (frequency, MIDI note number, note name, RMS). Constructed with a silence gate (default `0.003`).
- **`AudioAnalyser`** — drives `PitchDetector` at display refresh rate (~60fps) via `requestAnimationFrame`, updating `currentPitch` and firing the `onPitch` callback each frame.
- **`clickSynth.ts`** — metronome click synthesis.
- **`noteExtractor.ts`** — converts an AlphaTab `score` into `TimedNote`s (MIDI + absolute start/duration in ms), building a tempo map from `api.tickCache` (AlphaTab uses **960 PPQN**). Note: currently not referenced from the live view code; treat as a utility/legacy helper before relying on it.

### Exercises (`repository-exercises/`, `src/features/exerciseDirectory/`)

- Exercises are **Guitar Pro files** (`.gp`, `.gpx`, `.gp3`, `.gp4`, `.gp5`) placed under `repository-exercises/`.
- **`useExerciseDirectory.ts`** — discovers those files at build time via `import.meta.glob` (served as hashed static-asset URLs), builds the folder tree, and tracks selection (persisted in `localStorage`). `AlphaTabView` loads the selected file by URL with `api.load()`.
- **`scripts/convert-repository-exercises.mjs`** (`npm run exercises:convert`) — uses AlphaTab's importer/exporter to convert source files; the empty-directory UI points users to drop files in and run this.
- `src/data/jam/` holds play-along data (`drumLoops.ts`, `progressions.ts`) used by the Jam feature.

### Feature modules (`src/features/`)

- **`practice/`** — `PracticeHub` plus `NoteTrainer`, `IntervalTrainer`, `ScaleTrainer`, `ChordChangesTrainer`. The trainers consume live pitch via `useAudioInput`; `ChordChangesTrainer` drives a backing track through the Jam player.
- **`jam/`** — `JamPage`, backed by `useJamPlayer` (drum loops + chord progressions).
- **`exerciseDirectory/`** — the directory hook and types described above.

### React layer

- **`useAudioInput`** (`src/hooks/`) — React wrapper around `AudioAnalyser`. Exposes `start`/`stop`/`toggle`, `isListening`, `currentPitch`, and `error`.
- Other hooks: `useMetronome`, `useJamPlayer`, `useKeyboardShortcuts`.
- **`src/lib/`** — `musicTheory.ts` (notes/intervals/scales), `displaySettings.ts` (AlphaTab stave profile, persisted), `timeHelper.ts`, `utils.ts`.
- UI components use **shadcn/ui** (Radix UI + Tailwind CSS v4); source in `src/components/ui/`. The accent color is amber (`#f5a623`).
- Sheet music rendering is handled by **AlphaTab** (`@coderline/alphatab`) via `AlphaTabView` / `components/AlphaTabView.tsx`.
