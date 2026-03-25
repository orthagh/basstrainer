/**
 * clickSynth — Web Audio–based synthesiser for metronome click sounds.
 *
 * Shared by AlphaTabView (real-time metronome) and MetronomeSettings (preview).
 */

export type ClickSound = 'default' | 'woodblock' | 'rimshot' | 'cowbell';

const FREQ: Record<ClickSound, number> = {
  default: 1000,
  woodblock: 800,
  rimshot: 1200,
  cowbell: 560,
};

const OSC_TYPE: Record<ClickSound, OscillatorType> = {
  default: 'sine',
  woodblock: 'triangle',
  rimshot: 'square',
  cowbell: 'sawtooth',
};

let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedCtx) {
    sharedCtx = new AudioContext();
  }
  // Resume if suspended (browser autoplay policy)
  if (sharedCtx.state === 'suspended') {
    sharedCtx.resume();
  }
  return sharedCtx;
}

/**
 * Play a single click sound.
 *
 * @param sound   Which timbre to use.
 * @param accent  Whether this is an accented (first-beat) click.
 */
export function playClick(sound: ClickSound, accent = false): void {
  const ctx = getAudioContext();

  const freq = accent ? FREQ[sound] * 1.25 : FREQ[sound];
  const duration = accent ? 0.06 : 0.04;
  const gain = accent ? 0.5 : 0.25;

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = OSC_TYPE[sound];
  osc.frequency.value = freq;
  gainNode.gain.setValueAtTime(gain, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

/**
 * Play a short preview pattern for a click sound:
 * four clicks at ~120 BPM with the first accented.
 */
export function playClickPreview(sound: ClickSound): void {
  const ctx = getAudioContext();
  const interval = 0.5; // 120 BPM = 500ms per beat

  for (let i = 0; i < 4; i++) {
    const time = ctx.currentTime + i * interval;
    const accent = i === 0;

    const freq = accent ? FREQ[sound] * 1.25 : FREQ[sound];
    const dur = accent ? 0.06 : 0.04;
    const vol = accent ? 0.5 : 0.25;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = OSC_TYPE[sound];
    osc.frequency.value = freq;
    gainNode.gain.setValueAtTime(vol, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + dur);
  }
}
