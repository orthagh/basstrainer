# Bass Groove Trainer - Specifications

## Overview
A web-based bass practice tool designed to help amateur bassists improve their 16th-note feel and rhythm. The application will leverage the device's microphone to provide real-time feedback on rhythmic accuracy (timing) and melodic accuracy (pitch). 

## Technical Stack
* **Platform**: Pure Web Application
* **Frontend**: React, TypeScript, Vite
* **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (v4, Radix primitives) — Popover, Select, Slider, Label, Toggle, Separator, Tooltip, Button
* **Styling**: Tailwind CSS v4 with **orange accent theme** (oklch colour space). All colours use CSS custom-properties defined in `src/index.css` (`--primary`, `--secondary`, `--muted`, `--accent`, etc.) for light and dark modes. Utility helpers via `clsx` + `tailwind-merge` (`cn()` in `src/lib/utils.ts`).
* **Font**: Geist (variable, via `@fontsource-variable/geist`)
* **Audio Processing**: Web Audio API
* **Detection Algorithms**: `pitchfinder` (YIN pitch detection), custom onset detector (energy-spike based)
* **Exercise Format**: AlphaTex (inline Guitar Pro notation). Rendered and played back via **AlphaTab** (`@coderline/alphatab`).
* **Icons**: Lucide React + custom SVG (`MetronomeIcon`)

## Notation Display
* **Clef**: Bass clef (`\clef F4`) — set as bar metadata in each exercise's AlphaTex.
* **Stave profile**: `Default` — renders **standard notation above tablature** for every exercise.
* **Tab string order**: Tuning declared as `\tuning g2 d2 a1 e1` (string 1 = G, string 4 = E) so AlphaTab renders the lowest string (E) at the **bottom** of the tab — matching standard bass tab convention.
* **Layout**: Horizontal scrolling with player cursor and viewport auto-scroll.

## Keyboard Shortcuts
Global shortcuts handled by the `useKeyboardShortcuts` hook (`src/hooks/useKeyboardShortcuts.ts`). Ignored when focus is inside an input, textarea, or select element.

| Key | Action |
|-----|--------|
| Space | Play / Pause |
| Escape | Stop |
| L | Toggle loop |
| M | Toggle metronome |
| F | Toggle fullscreen |
| ← | Tempo −5 BPM |
| → | Tempo +5 BPM |
| ↑ | Tempo +1 BPM |
| ↓ | Tempo −1 BPM |

## Fullscreen Mode
* Activated via toolbar button (Maximize/Minimize icon) or **F** shortcut.
* Uses the native Fullscreen API (`document.requestFullscreen` / `document.exitFullscreen`).
* State managed in `App.tsx` with a `fullscreenchange` event listener.
* The root `<div ref={mainRef}>` is the fullscreen element.

## Exercise Data Architecture
Exercises are defined in AlphaTex format and organized by category under `src/data/exercises/`.
All exercises use **fretted positions** (primarily frets 4–10, centred around 5th position) with melodic variation — no open strings. This ensures the player practises real fretting-hand engagement even in groove-focused drills.

* `types.ts` — Shared `Exercise` interface
* `sixteenthNotesFoundation.ts` — 6 beginner exercises (steady 16ths, rests, two-string melodic, quarter+16th mix, beat on/off) — frets 5–7, strings 1–2
* `stringCrossing.ts` — 2 beginner exercises (3-string walk, 4-string sweep) — frets 5–7, strings 1–4
* `groovePatterns.ts` — 5 intermediate exercises (octave groove, syncopated funk, root-fifth pump, disco octave, gallop) — frets 5–9, octave shapes
* `melodicMovement.ts` — 4 intermediate exercises (chromatic walk, pentatonic run, major scale, box position shifting) — frets 4–10, scale patterns
* `advancedGrooves.ts` — 4 advanced exercises (ghost notes, mixed subdivisions, double ghost funk, off-beat accents) — frets 5–9, dead notes
* `speedBuilders.ts` — 3 advanced exercises (speed burst, spider walk, endurance 16ths) — frets 5–9, chromatic & cross-string
* `index.ts` — Barrel export aggregating all categories into a single `exercises` array

## Exercise Progression Tracking
Persist per-exercise progress in **browser `localStorage`** so returning users see their history without any back-end.

### Data Model (`ProgressRecord`)
Stored as a JSON map keyed by `exerciseId`:
```ts
interface ProgressRecord {
  exerciseId: string;
  /** Number of completed attempts */
  attempts: number;
  /** Best overall accuracy (0–100) */
  bestScore: number;
  /** Best timing score (0–100) */
  bestTimingScore: number;
  /** Best pitch score (0–100) */
  bestPitchScore: number;
  /** BPM at which the best score was achieved */
  bestScoreBpm: number;
  /** Highest BPM the user has practised at */
  highestBpm: number;
  /** ISO-8601 date of the last attempt */
  lastPlayedAt: string;
}
```

### Storage
* **Key**: `groovetrainer:progress`
* **Format**: `Record<string, ProgressRecord>` serialised as JSON.
* **Reads**: on app mount (`useProgress` hook).
* **Writes**: after each evaluated run completes (play-through finishes or user stops after ≥ 50 % of exercise played).
* **Limits**: localStorage is ~5 MB; the progress map is tiny — no eviction needed.

### UI Integration
* **Exercise sidebar** — each exercise card shows:
  - A small **best-score badge** (e.g. coloured dot or percentage) when a score exists.
  - A **last-played** relative date ("2 h ago", "3 days ago").
* **Post-exercise summary** — displays the delta vs. personal best ("↑ +4 %" or "New best!").

## Testing
* **Framework**: Vitest (with jsdom environment)
* **Setup**: `@testing-library/react`, `@testing-library/jest-dom` for React component tests
* **Test suites** (75 tests total):
  - `src/audio/pitchDetector.test.ts` — 19 tests: `frequencyToMidi`, `midiToNoteName`, `PitchDetector.analyse` (silence gating, low-frequency detection, RMS)
  - `src/audio/onsetDetector.test.ts` — 6 tests: silence, steady signal, onset spike, min interval, re-priming, reset
  - `src/audio/noteExtractor.test.ts` — 7 tests: null score, timing precision, dead/tie skipping, tempo changes, beatIndex, fallback
  - `src/data/exercises/exercises.test.ts` — 9 tests: data integrity (required fields, unique IDs, valid AlphaTex headers, tempo consistency, progression order)
  - `src/evaluation/evaluationEngine.test.ts` — 22 tests: note matching (timing window, pitch tolerance, closest match, double-match prevention), miss detection, latency compensation, tolerance presets, aggregates, reset
  - `src/evaluation/scoring.test.ts` — 12 tests: empty summary, accuracy computation, timing distribution, timing tendency, pitch accuracy, groove lock, std dev, mixed hit/miss scenarios
* **Scripts**: `npm test` (single run), `npm run test:watch` (watch mode)

## Step-by-Step Implementation Plan

### Phase 1: Foundation & UI Setup
- [x] Initialize React + TypeScript project via Vite.
- [x] Set up Tailwind CSS for styling.
- [x] Create the basic UI layout (Header, Main Practice Area, Settings Sidebar).
- [x] Implement a simple light-themed design.

### Phase 2: Tablature Rendering & Playback Engine (AlphaTab)
- [x] Integrate a tablature rendering library like **AlphaTab** to load and manipulate `.gp` files.
- [x] Configure AlphaTab to present the exercise in a clean, scrollable web view.
- [x] Wire up AlphaTab's built-in playback engine to handle audio synthesis, metronome, and tempo scaling (speed up/slow down).
- [x] Extract the programmatic note data (pitch, duration, precise start/end timings) from the AlphaTab data model so we can compare it against user input.

### Phase 3: Audio Input & Pitch/Rhythm Detection (Pitchfinder / Meyda)
- [x] Request user microphone permissions and capture the audio stream using the Web Audio API.
- [x] Integrate an existing specialized library like **`pitchfinder`** (using robust algorithms like YIN or MacLeod Pitch Method, which are well-suited for low bass frequencies).
- [x] Integrate an audio feature extraction library like **`meyda`** or a dedicated onset detector to accurately capture the precise timing (transients) of the plucked notes.

### Phase 4: Real-Time Evaluation Engine (Optional)
> **The evaluation is entirely optional.** Users can practice exercises with playback, metronome, and tempo control without ever enabling the microphone. Evaluation only activates when the user explicitly starts listening via the mic toggle.

- [x] Build the evaluation logic: compare detected microphone notes (pitch + timing) against the extracted `.gp` exercise data.
- [x] Implement latency compensation calibration (to handle hardware delay).
- [x] Implement an **Accuracy Cursor / Tolerance Setting**: A user-adjustable slider (like in Rocksmith) that configures how loose or strict the pitch and timing detection is, avoiding frustration for beginners.
- [x] Calculate scores based on rhythm (early/late/on-beat) and pitch correctness within the current tolerance window.
- [x] Create a comprehensive comparison summary after each exercise:
  - **Overall Accuracy Score:** A percentage representing total notes hit correctly.
  - **Rhythm Analysis:** A histogram or timeline showing if the user tends to play "ahead of the beat" (rushing) or "behind the beat" (dragging/laid back), particularly on challenging 16th-note subdivisions.
  - **Pitch Accuracy:** Identification of often missed or incorrectly fretted notes (e.g., dead notes vs clean notes).
  - **Groove Metric:** A variance score showing consistency in timing (how "locked in" the groove is).

### Phase 4½: UI Design System & Advanced Metronome
- [x] Integrate **shadcn/ui** component library (Radix primitives, Tailwind v4 compatible).
- [x] Establish an **orange accent** colour theme using oklch CSS custom-properties (light & dark modes).
- [x] Replace all hard-coded colour classes (`sky-*`, `slate-*`) with semantic design tokens (`primary`, `muted`, `foreground`, `border`, etc.).
- [x] Replace the emoji metronome toggle (🥁) with a **flat-style SVG metronome icon** (`MetronomeIcon` component).
- [x] Build **MetronomeSettings** popover with advanced options:
  - **Metronome on/off** toggle — by default uses AlphaTab's **built-in metronome** which is sample-accurate (rendered into the same audio buffer as playback). When a custom click sound or accent is selected, the built-in is muted and a Web Audio synthesiser (`src/audio/clickSynth.ts`) takes over via `midiEventsPlayed` events (slight latency trade-off with ScriptProcessor output mode).
  - **Count-in bars** slider (0–4) — uses AlphaTab `countInVolume` (1 bar built-in); values > 0 enable count-in.
  - **Click sound** selection (Default / Woodblock / Rimshot / Cowbell) — implemented via shared Web Audio synthesiser in `src/audio/clickSynth.ts`, triggered by AlphaTab `midiEventsPlayed` metronome events. Includes a **sound preview button** (Volume2 icon) that plays a 4-beat audition at 120 BPM.
  - **Accent first beat** toggle — plays a louder, higher-pitched click on beat 0 using custom Web Audio, while muting the built-in AlphaTab metronome.
- [x] Wire metronome configuration as lifted state in `App.tsx`, passed down to `AlphaTabView`.

### Phase 4¾: UX & Playability Improvements
- [x] **Click sound preview** — Volume2 icon button next to click-sound Select plays a 4-beat audition. Shared `clickSynth.ts` module extracted from inline AlphaTabView oscillator code.
- [x] **Fullscreen toggle** — Maximize/Minimize button in transport bar. Uses native Fullscreen API on root element. State lifted in `App.tsx` with `fullscreenchange` listener.
- [x] **Keyboard shortcuts** — `useKeyboardShortcuts` hook: Space (play/pause), Escape (stop), L (loop), M (metronome), F (fullscreen), arrows (tempo ±1/±5). Requires `AlphaTabHandle` ref via `forwardRef` + `useImperativeHandle`.
- [x] **Standard notation above tab** — Changed `staveProfile` from `'Tab'` to `'Default'` to render standard notation stave above tablature.
- [x] **Fretted exercise content** — Rewrote all 24 exercises to use positions at frets 4–10 (centred on 5th position) with melodic variation. No open strings.

### Phase 5: Visual Feedback, Progression & Polish

#### 5a — Real-Time Visual Feedback
- [x] Colour-code notes on the score as they are evaluated: **green** = hit, **red** = missed/wrong pitch, **orange** = timing off.
- [x] Show a small arrow indicator (↑ rush / ↓ drag) next to notes that are early or late beyond a threshold.
- [x] Animate a subtle pulse or glow on the active beat in the toolbar to reinforce tempo feel.

#### 5b — Post-Exercise Summary Screen
- [x] Display a summary panel/modal at the end of an evaluated run with:
  - **Overall accuracy** percentage (ring / radial chart).
  - **Timing distribution** histogram (early / on-time / late buckets).
  - **Timing tendency** label (rushing, dragging, or locked-in).
  - **Pitch accuracy** percenttage.
  - **Groove lock** score (consistency / variance).
  - **Notes hit / missed / extra** counts.
- [x] Show **delta vs. personal best** ("↑ +4 %" or "🏆 New best!").
- [x] Offer "Retry" and "Next exercise" actions from the summary.

#### 5c — Exercise Progression Tracking
- [x] Implement `useProgress` hook backed by `localStorage` (see *Exercise Progression Tracking* section).
- [x] Write progress after each evaluated run completes.
- [x] Show **best-score badge** and **last-played date** on each exercise card in the sidebar.
- [x] Provide a "Reset progress" option (per exercise or global).

#### 5d — Final Polish
- [x] Accessibility pass: focus outlines, ARIA labels, screen-reader announcements.
- [x] Responsive layout tweaks for tablet-sized viewports.
- [x] Write / update tests for new components and hooks.
- [x] Ensure smooth 60 fps performance during playback + mic analysis.