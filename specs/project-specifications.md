# Bass Groove Trainer - Specifications

## Overview
A web-based bass practice tool designed to help amateur bassists improve their 16th-note feel and rhythm. The application will leverage the device's microphone to provide real-time feedback on rhythmic accuracy (timing) and melodic accuracy (pitch). 

## Technical Stack
* **Platform**: Pure Web Application
* **Frontend**: React, TypeScript, Vite
* **Styling**: Tailwind CSS (for a simple, light-themed, clean UI)
* **Audio Processing**: Web Audio API
* **Detection Algorithms**: Utilize established standard libraries (e.g., `pitchfinder` for YIN/AMDF pitch detection, or `meyda` for audio feature extraction and transient/onset detection).
* **Exercise Format**: `.gp` (Guitar Pro) format. We will use an existing library (like `alphatab` or a dedicated parser) to load, display, and extract timing/pitch data from `.gp` files.

## Exercise Data Architecture
Exercises are defined in AlphaTex format and organized by category under `src/data/exercises/`:
* `types.ts` — Shared `Exercise` interface
* `sixteenthNotesFoundation.ts` — 6 beginner exercises (steady 16ths, rests, string alternating, quarter+16th mix, beat on/off)
* `stringCrossing.ts` — 2 beginner exercises (3-string walk, 4-string sweep)
* `groovePatterns.ts` — 5 intermediate exercises (octave groove, syncopated funk, root-fifth, disco octave, gallop)
* `melodicMovement.ts` — 4 intermediate exercises (chromatic walk, pentatonic run, major scale, box position shifting)
* `advancedGrooves.ts` — 4 advanced exercises (ghost notes, mixed subdivisions, double ghost funk, off-beat accents)
* `speedBuilders.ts` — 3 advanced exercises (speed burst, spider walk, endurance 16ths)
* `index.ts` — Barrel export aggregating all categories into a single `exercises` array

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

### Phase 5: Visual Feedback & Polish
- [ ] Display real-time visual feedback on the UI (e.g., green for good, red for missed/wrong pitch, arrows for rushing/dragging).
- [ ] Build the post-exercise summary screen using charts or visual timelines to display the metrics calculated in Phase 4.
- [ ] Finalize UI polish and ensure smooth performance.