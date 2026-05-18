import { useRef, useState, useCallback, useEffect } from 'react';
import * as Tone from 'tone';
import { Progression as TonalProgression, Chord, Note } from 'tonal';
import type { Style, Progression } from '../data/jam/progressions';
import { DRUM_LOOPS, LOOP_BARS } from '../data/jam/drumLoops';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PPQ = 192; // Tone.js default ticks per quarter note
const TAP_WINDOW_MS = 3000;
const MAX_TAPS = 8;
const BPM_MIN = 40;
const BPM_MAX = 220;

// Salamander Grand Piano — hosted on tonejs.github.io (no download required)
const PIANO_URLS: Record<string, string> = {
  A2: 'A2.mp3', 'C3': 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3',
  A3: 'A3.mp3', 'C4': 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3',
  A4: 'A4.mp3', 'C5': 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3',
  A5: 'A5.mp3',
};
const PIANO_BASE_URL = 'https://tonejs.github.io/audio/salamander/';

// ---------------------------------------------------------------------------
// Drum kit — synthesized, no sample downloads required
// ---------------------------------------------------------------------------

class DrumKit {
  private kick: Tone.MembraneSynth;
  private snare: Tone.NoiseSynth;
  private hihatClosed: Tone.MetalSynth;
  private hihatOpen: Tone.MetalSynth;
  private crash: Tone.MetalSynth;
  private ride: Tone.MetalSynth;
  private tomLow: Tone.MembraneSynth;
  private tomMid: Tone.MembraneSynth;
  private tomHi: Tone.MembraneSynth;

  constructor() {
    this.kick = new Tone.MembraneSynth({
      pitchDecay: 0.05, octaves: 6,
      envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.1 },
      volume: -4,
    }).toDestination();

    this.snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 },
      volume: -10,
    }).toDestination();

    this.hihatClosed = new Tone.MetalSynth({
      harmonicity: 5.1, modulationIndex: 32,
      resonance: 4000, octaves: 1.5,
      envelope: { attack: 0.001, decay: 0.04, release: 0.01 },
      volume: -16,
    }).toDestination();
    this.hihatClosed.frequency.value = 400;

    this.hihatOpen = new Tone.MetalSynth({
      harmonicity: 5.1, modulationIndex: 32,
      resonance: 4000, octaves: 1.5,
      envelope: { attack: 0.001, decay: 0.28, release: 0.08 },
      volume: -18,
    }).toDestination();
    this.hihatOpen.frequency.value = 400;

    this.crash = new Tone.MetalSynth({
      harmonicity: 5.1, modulationIndex: 16,
      resonance: 3200, octaves: 1.5,
      envelope: { attack: 0.001, decay: 0.9, release: 0.4 },
      volume: -16,
    }).toDestination();
    this.crash.frequency.value = 240;

    this.ride = new Tone.MetalSynth({
      harmonicity: 5.1, modulationIndex: 24,
      resonance: 3600, octaves: 1.5,
      envelope: { attack: 0.001, decay: 0.18, release: 0.06 },
      volume: -18,
    }).toDestination();
    this.ride.frequency.value = 320;

    this.tomLow = new Tone.MembraneSynth({
      pitchDecay: 0.06, octaves: 4,
      envelope: { attack: 0.001, decay: 0.28, sustain: 0, release: 0.1 },
      volume: -8,
    }).toDestination();

    this.tomMid = new Tone.MembraneSynth({
      pitchDecay: 0.05, octaves: 4,
      envelope: { attack: 0.001, decay: 0.22, sustain: 0, release: 0.08 },
      volume: -8,
    }).toDestination();

    this.tomHi = new Tone.MembraneSynth({
      pitchDecay: 0.04, octaves: 3,
      envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.07 },
      volume: -8,
    }).toDestination();
  }

  trigger(gmNote: number, time: Tone.Unit.Time, velocity: number): void {
    const v = Math.max(0.01, Math.min(1, velocity));
    switch (gmNote) {
      case 36: this.kick.triggerAttackRelease('C1', '8n', time, v); break;
      case 38: this.snare.triggerAttackRelease('16n', time, v); break;
      case 40: this.snare.triggerAttackRelease('16n', time, v * 0.4); break;  // ghost
      case 42: case 44: this.hihatClosed.triggerAttackRelease('32n', time, v); break;
      case 46: this.hihatOpen.triggerAttackRelease('8n', time, v); break;
      case 49: this.crash.triggerAttackRelease('4n', time, v); break;
      case 51: this.ride.triggerAttackRelease('8n', time, v); break;
      case 45: this.tomLow.triggerAttackRelease('C2', '8n', time, v); break;
      case 48: this.tomMid.triggerAttackRelease('E2', '8n', time, v); break;
      case 50: this.tomHi.triggerAttackRelease('A2', '8n', time, v); break;
    }
  }

  dispose(): void {
    this.kick.dispose();
    this.snare.dispose();
    this.hihatClosed.dispose();
    this.hihatOpen.dispose();
    this.crash.dispose();
    this.ride.dispose();
    this.tomLow.dispose();
    this.tomMid.dispose();
    this.tomHi.dispose();
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ScheduledDrumEvent { time: string; note: number; velocity: number; }
interface ScheduledChordEvent { time: string; notes: string[]; }

/**
 * Resolve a bar chord to playable note strings in the C3–C5 range.
 * When `originalKey` is provided, `barChord` is an absolute chord name
 * (e.g. 'Cm7') that gets transposed to `rootNote`.
 * Otherwise `barChord` is a Roman numeral resolved via tonal.
 */
function resolveChordNotes(
  barChord: string,
  rootNote: string,
  originalKey?: string,
): string[] {
  let chordName: string;
  if (originalKey) {
    const ivl = Note.distance(originalKey, rootNote);
    chordName = Chord.transpose(barChord, ivl) || barChord;
  } else {
    const [name] = TonalProgression.fromRomanNumerals(rootNote, [barChord]);
    chordName = name ?? barChord;
  }

  const { notes } = Chord.get(chordName);
  if (!notes?.length) return [];

  const result: string[] = [];
  let lastMidi = -1;
  let oct = 3;

  for (const n of notes) {
    let midi = Note.midi(n + oct);
    if (midi == null) continue;
    while (midi <= lastMidi) { oct++; midi = Note.midi(n + oct); if (midi == null) break; }
    if (midi == null) continue;
    while (midi < 48) { oct++; midi = Note.midi(n + oct) ?? midi; }
    while (midi > 72) { oct--; midi = Note.midi(n + oct) ?? midi; }
    result.push(n + oct);
    lastMidi = midi;
  }
  return result;
}

function beatsToTicks(beats: number): string {
  return Math.round(beats * PPQ) + 'i';
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface JamPlayerState {
  bpm: number;
  isPlaying: boolean;
  isLoaded: boolean;
  currentBar: number;
  play: () => Promise<void>;
  stop: () => void;
  tap: () => void;
  setBpm: (bpm: number) => void;
}

export function useJamPlayer(
  style: Style,
  progression: Progression,
  rootNote: string,
): JamPlayerState {
  const [bpm, setBpmState] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentBar, setCurrentBar] = useState(0);

  const drumKitRef = useRef<DrumKit | null>(null);
  const pianoSamplerRef = useRef<Tone.Sampler | null>(null);
  const organSynthRef = useRef<Tone.PolySynth | null>(null);
  const drumPartRef = useRef<Tone.Part<ScheduledDrumEvent> | null>(null);
  const chordPartRef = useRef<Tone.Part<ScheduledChordEvent> | null>(null);
  const organPartRef = useRef<Tone.Part<ScheduledChordEvent> | null>(null);
  const rafRef = useRef<number>(0);
  const tapTimesRef = useRef<number[]>([]);
  const isPlayingRef = useRef(false);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // ── Initialize instruments once ───────────────────────────────────────────

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoaded(false);

    const kit = new DrumKit();
    drumKitRef.current = kit;

    const piano = new Tone.Sampler({
      urls: PIANO_URLS,
      baseUrl: PIANO_BASE_URL,
      volume: -6,
    }).toDestination();
    pianoSamplerRef.current = piano;

    // Organ pad — sine wave, slow attack, sustained
    const organ = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.08, decay: 0, sustain: 1, release: 0.5 },
      volume: -20,
    }).toDestination();
    organSynthRef.current = organ;

    Tone.loaded().then(() => setIsLoaded(true));

    return () => {
      kit.dispose();
      piano.dispose();
      organ.dispose();
      drumKitRef.current = null;
      pianoSamplerRef.current = null;
      organSynthRef.current = null;
      setIsLoaded(false);
    };
  }, []);

  // ── Recreate parts when style / progression / key changes ────────────────

  useEffect(() => {
    const transport = Tone.getTransport();

    if (isPlayingRef.current) {
      transport.stop();
      transport.cancel(0);
      setIsPlaying(false);
      setCurrentBar(0);
    }

    drumPartRef.current?.dispose();
    chordPartRef.current?.dispose();
    organPartRef.current?.dispose();

    const kit = drumKitRef.current;
    const piano = pianoSamplerRef.current;
    const organ = organSynthRef.current;
    if (!kit || !piano || !organ) return;

    // Drum Part
    const loopEvents = (DRUM_LOOPS[style][0] ?? []).map(e => ({
      ...e,
      time: beatsToTicks(e.time),
    }));
    const loopBeatLength = LOOP_BARS[style] * 4;

    const drumPart = new Tone.Part<ScheduledDrumEvent>((time, event) => {
      kit.trigger(event.note, time, event.velocity / 127);
    }, loopEvents);
    drumPart.loop = true;
    drumPart.loopEnd = beatsToTicks(loopBeatLength);
    drumPart.start(0);
    drumPartRef.current = drumPart;

    // Piano Chord Part — jazz comps on beats 2 & 4; others on beat 1
    const totalBars = progression.bars.length;
    const isJazz = style === 'jazz';
    const isJazzOrBlues = style === 'jazz' || style === 'blues';

    const chordEvents: ScheduledChordEvent[] = [];
    progression.bars.forEach((bar, i) => {
      const notes = resolveChordNotes(bar, rootNote, progression.originalKey);
      const barStart = i * 4;
      if (isJazz) {
        // Comp on beat 2 and beat 4
        chordEvents.push({ time: beatsToTicks(barStart + 1), notes });
        chordEvents.push({ time: beatsToTicks(barStart + 3), notes });
      } else {
        chordEvents.push({ time: beatsToTicks(barStart), notes });
      }
    });

    const pianoNoteDuration = isJazz ? '8n' : '2n';

    const chordPart = new Tone.Part<ScheduledChordEvent>((time, { notes }) => {
      notes.forEach(note => piano.triggerAttackRelease(note, pianoNoteDuration, time, 0.65));
    }, chordEvents);
    chordPart.loop = true;
    chordPart.loopEnd = beatsToTicks(totalBars * 4);
    chordPart.start(0);
    chordPartRef.current = chordPart;

    // Organ Part — whole-note sustained pads (jazz + blues only)
    if (isJazzOrBlues) {
      const organEvents: ScheduledChordEvent[] = progression.bars.map((bar, i) => ({
        time: beatsToTicks(i * 4),
        notes: resolveChordNotes(bar, rootNote, progression.originalKey),
      }));

      const organPart = new Tone.Part<ScheduledChordEvent>((time, { notes }) => {
        organ.releaseAll(time);
        notes.forEach(note => organ.triggerAttackRelease(note, '1n', time, 0.5));
      }, organEvents);
      organPart.loop = true;
      organPart.loopEnd = beatsToTicks(totalBars * 4);
      organPart.start(0);
      organPartRef.current = organPart;
    } else {
      organPartRef.current = null;
    }

    transport.loop = true;
    transport.loopStart = 0;
    transport.loopEnd = beatsToTicks(totalBars * 4);
    transport.bpm.value = bpm;

    return () => {
      drumPart.dispose();
      chordPart.dispose();
      organPartRef.current?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style, progression, rootNote]);

  // ── Live BPM sync ─────────────────────────────────────────────────────────

  useEffect(() => {
    Tone.getTransport().bpm.value = bpm;
  }, [bpm]);

  // ── currentBar tracker via rAF ────────────────────────────────────────────

  useEffect(() => {
    if (!isPlaying) { cancelAnimationFrame(rafRef.current); return; }
    const totalBars = progression.bars.length;
    const ticksPerBar = 4 * PPQ;

    const tick = () => {
      const bar = Math.floor(Tone.getTransport().ticks / ticksPerBar) % totalBars;
      setCurrentBar(bar);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, progression.bars.length]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      Tone.getTransport().stop();
      Tone.getTransport().cancel(0);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const play = useCallback(async () => {
    if (!isLoaded) return;
    await Tone.start();
    Tone.getTransport().start('+0.05');
    setIsPlaying(true);
  }, [isLoaded]);

  const stop = useCallback(() => {
    const transport = Tone.getTransport();
    transport.stop();
    transport.position = 0 as unknown as Tone.Unit.TransportTime;
    organSynthRef.current?.releaseAll();
    setIsPlaying(false);
    setCurrentBar(0);
  }, []);

  const setBpm = useCallback((nextBpm: number) => {
    setBpmState(Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(nextBpm))));
  }, []);

  const tap = useCallback(() => {
    const now = performance.now();
    const recent = tapTimesRef.current.filter(t => now - t < TAP_WINDOW_MS);
    recent.push(now);
    tapTimesRef.current = recent.slice(-MAX_TAPS);
    if (recent.length >= 2) {
      let total = 0;
      for (let i = 1; i < recent.length; i++) total += recent[i] - recent[i - 1];
      setBpm(Math.round(60000 / (total / (recent.length - 1))));
    }
  }, [setBpm]);

  return { bpm, isPlaying, isLoaded, currentBar, play, stop, tap, setBpm };
}
