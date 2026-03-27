# Bass Groove Trainer

A personal browser-based practice tool for bass. Drop in your Guitar Pro files, plug in your mic, and play along — the app listens in real time and tells you how tight your groove is.

## What it does

- **Listens to you play** via microphone, detecting pitch and timing as you go
- **Scores your performance** after each exercise: note accuracy, timing consistency, and a *Groove Lock* score that shows whether you rush or drag
- **Renders interactive tablature** with both standard notation and tab, so you can loop sections, adjust the tempo, and use a built-in metronome to work on tough passages
- **Tracks your progress** across sessions, saving your best scores per exercise
- **Loads your own GP files** — drop Guitar Pro files into `repository-exercises/` and they appear instantly in the file browser, no conversion needed
- **Chromatic tuner** — built-in tuner with visual needle and note detection
- **Standalone metronome** — configurable with accent, click sound, and subdivisions

## Exercises

Built-in exercises range from beginner to advanced and cover groove patterns, melodic movement, string crossing, sixteenth-note foundations, and speed builders. You can also load any Guitar Pro file (`.gp`, `.gpx`, `.gp3`–`.gp5`) from the directory browser.

## Adding your own files

Put Guitar Pro files anywhere under `repository-exercises/`, organized in subfolders however you like:

```
repository-exercises/
└── Jules/
    └── 2026-03-23/
        ├── Fly Away.gp
        └── groove exercise.gp
```

They show up in the directory browser automatically after a page reload (Vite picks them up at build time).

## Getting started

```bash
npm install
npm run dev
```

Select an exercise from the sidebar or the directory browser, enable your microphone, and hit play. A count-in gives you time to settle before evaluation begins.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `Esc` | Stop |
| `L` | Toggle loop |
| `M` | Toggle metronome |
| `F` | Fullscreen |
| `← / →` | Tempo ±5 BPM |
| `↑ / ↓` | Tempo ±1 BPM |

## Stack

React · TypeScript · Vite · AlphaTab (sheet music rendering & GP parsing) · Web Audio API
