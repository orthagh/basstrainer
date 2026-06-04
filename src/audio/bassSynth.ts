/**
 * bassSynth — Tone.js-based bass-guitar note player for the practice trainers.
 *
 * Plays target notes aloud so the user can associate a sound with a position on
 * the neck. Used by NoteTrainer, IntervalTrainer and ScaleTrainer.
 *
 * Because the trainers validate via the microphone, a played note must NOT be
 * picked up and counted as the user's answer. `isNotePlaying()` exposes a gate
 * (audio duration + a short tail) that the detection effects check before
 * matching.
 */

import * as Tone from 'tone';

// Free electric-bass sample set hosted on GitHub (no download/bundle required).
// Filenames use 's' for sharp (e.g. A#1 → As1.mp3).
const BASS_URLS: Record<string, string> = {
  'E1': 'E1.mp3', 'G1': 'G1.mp3', 'A#1': 'As1.mp3', 'C#2': 'Cs2.mp3',
  'E2': 'E2.mp3', 'G2': 'G2.mp3', 'A#2': 'As2.mp3', 'C#3': 'Cs3.mp3',
  'E3': 'E3.mp3', 'G3': 'G3.mp3', 'A#3': 'As3.mp3', 'C#4': 'Cs4.mp3',
  'E4': 'E4.mp3', 'G4': 'G4.mp3', 'A#4': 'As4.mp3', 'C#5': 'Cs5.mp3',
};
const BASS_BASE_URL = 'https://nbrosowsky.github.io/tonejs-instruments/samples/bass-electric/';

const TAIL_MS = 250; // extra mic-gate time after the last audible note

type BassInstrument = Tone.Sampler | Tone.MonoSynth;

let instrument: BassInstrument | null = null;
let loadPromise: Promise<void> | null = null;
let playingUntil = 0;

/** Lazily build a sawtooth MonoSynth — used as an offline/load-failure fallback. */
function buildFallbackSynth(): Tone.MonoSynth {
  return new Tone.MonoSynth({
    oscillator: { type: 'sawtooth' },
    filter: { Q: 2, type: 'lowpass', rolloff: -24 },
    filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.4, baseFrequency: 200, octaves: 3 },
    envelope: { attack: 0.005, decay: 0.1, sustain: 0.6, release: 0.4 },
    volume: -8,
  }).toDestination();
}

/**
 * Ensure the bass instrument exists and its samples are loaded. Resolves once
 * playback is possible (either the sampler loaded, or we fell back to a synth).
 */
function ensureInstrument(): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve) => {
    try {
      const sampler = new Tone.Sampler({
        urls: BASS_URLS,
        baseUrl: BASS_BASE_URL,
        release: 0.6,
        volume: -4,
        onload: () => resolve(),
        onerror: () => {
          // Samples failed (offline / CDN down) — swap in a synth.
          sampler.dispose();
          instrument = buildFallbackSynth();
          resolve();
        },
      }).toDestination();
      instrument = sampler;
    } catch {
      instrument = buildFallbackSynth();
      resolve();
    }
  });

  return loadPromise;
}

/** Begin loading the bass samples ahead of time (call when a session starts). */
export function preloadBassSynth(): void {
  void ensureInstrument();
}

/** Whether a cue is currently sounding (or within the mic-gate tail). */
export function isNotePlaying(): boolean {
  return performance.now() < playingUntil;
}

function midiToNoteName(midi: number): string {
  return Tone.Frequency(midi, 'midi').toNote();
}

/** Play a single bass note aloud. */
export async function playMidiNote(midi: number, durationMs = 700): Promise<void> {
  await Tone.start();
  await ensureInstrument();
  if (!instrument) return;
  playingUntil = performance.now() + durationMs + TAIL_MS;
  instrument.triggerAttackRelease(midiToNoteName(midi), durationMs / 1000);
}

/**
 * Play a sequence of bass notes back-to-back. Resolves after the last note has
 * been scheduled to finish. Used for the interval cue and the scale preview.
 */
export async function playMidiSequence(
  midis: number[],
  opts: { noteMs?: number; gapMs?: number } = {},
): Promise<void> {
  const noteMs = opts.noteMs ?? 500;
  const gapMs = opts.gapMs ?? 0;
  if (midis.length === 0) return;

  await Tone.start();
  await ensureInstrument();
  if (!instrument) return;

  const step = noteMs + gapMs;
  const totalMs = step * (midis.length - 1) + noteMs;
  playingUntil = performance.now() + totalMs + TAIL_MS;

  const start = Tone.now();
  midis.forEach((midi, i) => {
    instrument!.triggerAttackRelease(
      midiToNoteName(midi),
      noteMs / 1000,
      start + (i * step) / 1000,
    );
  });

  await new Promise<void>((resolve) => setTimeout(resolve, totalMs));
}
