# Bass Groove Trainer

**[Live demo](https://orthagh.github.io/basstrainer/)**

An interactive browser-based practice tool for bass players. Pick an exercise, plug in your mic, and play along — the app listens to you in real time and tells you how tight your groove is.

## What it does

- **Listens to you play** via microphone, detecting pitch and timing as you go
- **Scores your performance** after each exercise: note accuracy, timing consistency, and a *Groove Lock* score that shows whether you rush or drag
- **Renders interactive tablature** so you can loop sections, adjust the tempo, and use a built-in metronome to work on tough passages
- **Tracks your progress** across sessions, saving your best scores per exercise

## Exercises

Exercises range from beginner to advanced and cover groove patterns, melodic movement, string crossing, sixteenth-note foundations, and speed builders. Each one has a default tempo you can freely adjust.

## Getting started

```bash
npm install
npm run dev
```

Open the app in your browser, select an exercise from the sidebar, enable your microphone, and hit play. A count-in bar gives you time to settle before evaluation begins.

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

React · TypeScript · Vite · AlphaTab (sheet music rendering) · Web Audio API
