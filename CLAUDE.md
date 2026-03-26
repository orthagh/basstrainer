# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start dev server (Vite HMR)
npm run build        # type-check + production build
npm run lint         # ESLint
npm run test         # run tests once (vitest)
npm run test:watch   # vitest in watch mode
```

To run a single test file:
```bash
npx vitest run src/audio/onsetDetector.test.ts
```

## Architecture

GrooveTrainer is a React/TypeScript app that listens to a musician via microphone, compares what they play against a sheet music exercise, and scores their performance.

### Audio pipeline (`src/audio/`)

The pipeline flows in one direction:

```
Microphone → AudioCapture → AudioAnalyser → EvaluationEngine
                               ↓
                    PitchDetector + OnsetDetector
```

- **`AudioCapture`** — wraps Web Audio API. Creates `MediaStream → GainNode → AnalyserNode`. Deliberately not connected to the destination (no feedback loop). Uses `fftSize: 8192` to reliably detect low bass frequencies (~30 Hz).
- **`PitchDetector`** — wraps `pitchfinder` library. Converts PCM frames to `PitchResult` (frequency, MIDI note number, note name, RMS).
- **`OnsetDetector`** — energy-based transient detector. Fires when the RMS ratio exceeds a threshold after a re-prime period.
- **`AudioAnalyser`** — orchestrates the above two. Runs at ~60fps via `requestAnimationFrame`. On each frame: detect pitch, check for onset; if both fire, emit a `DetectedNote`.

### Score / exercise data (`src/data/exercises/`, `src/audio/noteExtractor.ts`)

- Exercises are defined as `Exercise` objects with an **AlphaTex** string (`tex` field). AlphaTex is AlphaTab's text notation format.
- **`noteExtractor.ts`** — walks the AlphaTab `score` object after `playerReady` fires and converts every note to a `TimedNote` (MIDI number + absolute start/duration in ms), building a tempo map from `api.tickCache` to handle tempo changes. AlphaTab uses **960 PPQN**.

### Evaluation (`src/evaluation/`)

- **`EvaluationEngine`** — stateful class that takes `expectedNotes: TimedNote[]` and, for each `DetectedNote` fed in, finds the nearest unmatched expected note within a timing window and pitch tolerance. Tracks hits/misses. Call `checkMissedNotes()` periodically to mark expired windows.
- **`scoring.ts`** — pure functions that produce an `EvaluationSummary` from a completed set of `NoteEvaluation[]`: accuracy, average timing offset, timing std-dev, and a **grooveLock** score (inverse of normalised timing variance).
- **`LatencyCompensator`** — stores a per-device latency offset in `localStorage` (`groovetrainer:latencyOffsetMs`) applied inside `EvaluationEngine` so that inherent audio hardware delay doesn't count against the player.
- Tolerance presets: `easy` (±150 ms, ±2 semitones), `medium` (±80 ms, ±1), `hard` (±40 ms, exact pitch).

### React layer

- **`useAudioInput`** (`src/hooks/`) — thin React wrapper around `AudioAnalyser`. Exposes `start/stop/toggle`, `currentPitch`, `detectedNotes`, and `lastNote` as state.
- UI components use **shadcn/ui** (Radix UI + Tailwind CSS v4). Component source is in `src/components/ui/`.
- Sheet music rendering is handled by **AlphaTab** (`@coderline/alphatab`).
