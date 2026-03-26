# Standalone Metronome — Implementation Plan

## Overview

Add a third top-level page for a standalone metronome alongside Trainer and Tuner in the shared header navigation. The metronome keeps entirely independent state from the AlphaTab trainer playback, implements its own Web Audio lookahead scheduler for sample-accurate clicks, and integrates with the existing app's page-contextual keyboard shortcut system.

---

## Feature Requirements

### Core
| Feature | Detail |
|---|---|
| Tempo control | BPM display with −/+ buttons, scroll-wheel, inline edit, and a Tap Tempo button |
| Tempo range | 20 – 300 BPM |
| Rhythm picker | Combined control: beats-per-bar (1–8) + note subdivision (♩ ♪♪ ♩³ ♬) + per-beat accent dots (inspired by Easy Metronome on Google Play) |
| Transport | Large start/stop button; Space keyboard shortcut (page-contextual) |
| Counters | Current beat (1-based, updates on main beats) and bar counter, displayed live |

### Advanced (collapsible section)
| Feature | Detail |
|---|---|
| Sound selection | Same four timbres as trainer metronome: Default / Woodblock / Rimshot / Cowbell; preview button |
| Silent bars | Toggle on/off; when enabled: "Play N bars, mute M bars" cycle; visual counters keep advancing during muted bars |

---

## Architecture

### New files

| File | Purpose |
|---|---|
| `src/hooks/useMetronome.ts` | Self-contained hook owning all metronome state and the Web Audio lookahead scheduler |
| `src/components/RhythmPicker.tsx` | Reusable UI component: beat-count row + accent-dot circles + subdivision selector |
| `src/components/MetronomePage.tsx` | Full-page shell (mirrors `TunerPage.tsx` pattern); exposes `MetronomeHandle` via `forwardRef`/`useImperativeHandle` for keyboard shortcut wiring |

### Modified files

| File | Change |
|---|---|
| `src/audio/clickSynth.ts` | Add `scheduleClick(sound, accent, when, volumeScale?)` for precise Web Audio scheduling; add `getSharedAudioContext()` so the hook can read `currentTime` without duplicating context logic |
| `src/App.tsx` | Extend `AppView` union with `'metronome'`; add nav button (MetronomeIcon); mount `<MetronomePage ref={metronomeRef} />`; route Space/Escape/arrow shortcuts to active page context |

### Not changed

- `src/hooks/useKeyboardShortcuts.ts` — no interface change needed; App.tsx passes different callbacks based on `currentView`
- `src/components/MetronomeSettings.tsx` — trainer metronome config is independent; its `MetronomeConfig` type is not reused here

---

## Domain Model (`src/hooks/useMetronome.ts`)

```ts
export type Subdivision = 'quarter' | 'eighth' | 'triplet' | 'sixteenth';

export const SUBDIVISION_MULTIPLIER: Record<Subdivision, number> = {
  quarter: 1, eighth: 2, triplet: 3, sixteenth: 4,
};

export const SUBDIVISIONS: Subdivision[] = ['quarter', 'eighth', 'triplet', 'sixteenth'];

export const SUBDIVISION_SYMBOLS: Record<Subdivision, { symbol: string; label: string }> = {
  quarter:   { symbol: '♩',   label: '1/4'  },
  eighth:    { symbol: '♪♪',  label: '1/8'  },
  triplet:   { symbol: '♩3',  label: 'Trip.'  },
  sixteenth: { symbol: '♬',   label: '1/16' },
};

interface MetronomeConfig {
  tempo: number;           // 20–300 BPM
  beatsPerBar: number;     // 1–8
  subdivision: Subdivision;
  accentPattern: boolean[]; // length === beatsPerBar; index 0 always true
  clickSound: ClickSound;
  silentBarsEnabled: boolean;
  playBarsCount: number;   // ≥ 1
  silentBarsCount: number; // ≥ 1
}

// Exported state shape (MetronomeConfig + runtime)
interface MetronomeState extends MetronomeConfig {
  isRunning: boolean;
  currentBeat: number; // 0-based index within bar
  currentBar: number;  // 1-based, resets on start
}

// Imperative handle exposed via forwardRef on MetronomePage
export interface MetronomeHandle {
  toggle: () => void;
  stop: () => void;
  changeTempo: (delta: number) => void;
}
```

### Scheduler design

Uses a standard Web Audio lookahead pattern:
- `LOOKAHEAD_S = 0.1` — schedule 100 ms ahead
- `SCHEDULER_INTERVAL_MS = 25` — setInterval runs every 25 ms
- Position tracked as integer tick index (0 → beatsPerBar × subdivMult − 1), incremented deterministically each scheduled tick
- UI counter updates use `setTimeout(delay)` where `delay = (nextTickTime − ctx.currentTime) × 1000`, giving visual updates that roughly coincide with audio
- Sub-beat clicks play at 35 % volume via the `volumeScale` parameter on `scheduleClick`
- Silent bar detection: `cyclePos = silentCycleRef.current % (playBarsCount + silentBarsCount)`; if `cyclePos >= playBarsCount`, skip `scheduleClick` for all ticks in that bar while still advancing counters

### Tap tempo

- Record tap timestamps via `performance.now()`
- Keep last 8 taps; discard any older than 3 s (session reset)
- BPM = `round(60000 / avgInterval)`, clamped to [20, 300]

---

## UI Layout (`MetronomePage`)

```
┌── full-height scrollable, bg-gradient ─────────────────────┐
│  ┌── card: Tempo ─────────────────────────────────────────┐ │
│  │  [−][120 BPM][+]                        [TAP TEMPO]   │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌── card: Rhythm ────────────────────────────────────────┐ │
│  │  Beats per bar:  [1][2][3][4][5][6][7][8]             │ │
│  │  [●][ ][ ][ ]  ← accent dots (click to toggle)        │ │
│  │  Division:  [♩]  [♪♪]  [♩3]  [♬]                    │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌── card: Transport ─────────────────────────────────────┐ │
│  │  Beat 1 / 4                                  Bar 3     │ │
│  │  [              ▶  START (Space)              ]        │ │
│  └────────────────────────────────────────────────────────┘ │
│  ▼ Advanced                                                  │
│  ┌── collapsible ─────────────────────────────────────────┐ │
│  │  Click sound: [Default ▾]  [🔊]                       │ │
│  │  Silent bars  [ toggle ]                               │ │
│  │  Play [2] bars, mute [2] bars                         │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Beat-accent circles

- Each circle represents one main beat
- Beat 1: always accent (not toggleable)
- Other beats: click to cycle accent on/off
- When playing: active beat circle pulses with primary-colour glow
- Accent beat styling: `border-primary bg-primary/20`; active: `bg-primary text-primary-foreground scale-110 shadow-glow`

### Subdivision selector

Four pill-style segmented buttons using Unicode music notation symbols. Selecting a new subdivision resets the sub-tick counter silently (scheduler adapts on next run).

---

## Keyboard Shortcuts (page-contextual)

No changes to `useKeyboardShortcuts.ts`. `App.tsx` passes different action callbacks based on `currentView`:

| Key | Trainer page | Metronome page |
|---|---|---|
| Space | AlphaTab play/pause | metronome toggle |
| Escape | AlphaTab stop | metronome stop |
| ← / → | tempo ±5 BPM (AlphaTab) | tempo ±5 BPM (metronome) |
| ↑ / ↓ | tempo ±1 BPM (AlphaTab) | tempo ±1 BPM (metronome) |
| L | toggle loop | (no-op) |
| M | toggle trainer metronome | (no-op) |
| F | fullscreen | fullscreen |

---

## Silent Bars Behaviour

Visual counters (beat + bar) **continue advancing** during muted bars. Only the audio click is suppressed. The word "SILENT" or a muted indicator can optionally be shown on the transport row to make the cycle visible to the user.

---

## Decisions

- **Independent state**: standalone metronome config is not synced to or from the AlphaTab trainer metronome config
- **forwardRef handle**: MetronomePage exposes `MetronomeHandle` so App.tsx can wire keyboard shortcuts without lifting `useMetronome` state
- **Sub-beat volume**: sub-division ticks play at 35 % gain via `scheduleClick`'s `volumeScale` parameter
- **Accent pattern**: beat 1 is always accented and is not user-toggleable; other beats are off by default
- **Beat count change**: when `beatsPerBar` changes, the accent array is resized — existing values kept for unchanged indices, new indices default to `false`, index 0 forced to `true`

---

## Verification Checklist

1. `npm run test` — all existing tests pass
2. `npm run lint` — no new ESLint errors
3. `npm run build` — TypeScript type-checks cleanly
4. Browser smoke: start/stop, tap tempo stabilises after 4 taps, beat circles pulse, silent bars suppress audio, arrows adjust BPM while metronome runs
5. Keyboard: Space toggles metronome on metronome page; switching to trainer and pressing Space controls AlphaTab instead
6. AudioContext: metronome starts on first user gesture; no "AudioContext was not allowed to start" console errors
