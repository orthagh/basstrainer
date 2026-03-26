/**
 * clickSynth — Web Audio–based synthesiser for metronome click sounds.
 *
 * Shared by AlphaTabView (real-time metronome) and MetronomeSettings (preview).
 */

export type ClickSound = 'default' | 'woodblock' | 'rimshot' | 'cowbell' | 'mechanical';

const FREQ: Record<ClickSound, number> = {
  default: 1000,
  woodblock: 800,
  rimshot: 1200,
  cowbell: 560,
  mechanical: 0, // unused — handled by noise synthesis
};

const OSC_TYPE: Record<ClickSound, OscillatorType> = {
  default: 'sine',
  woodblock: 'triangle',
  rimshot: 'square',
  cowbell: 'sawtooth',
  mechanical: 'sine', // unused — handled by noise synthesis
};

/** Mechanical tick: short noise burst through bandpass + low body thud. */
function scheduleMechanicalClick(ctx: AudioContext, accent: boolean, when: number, volumeScale = 1): void {
  // Noise burst through a resonant bandpass — the sharp tick transient
  const bufLen = Math.ceil(ctx.sampleRate * 0.08);
  const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = accent ? 1800 : 1200;
  bp.Q.value = 8;

  const noiseGain = ctx.createGain();
  const noiseVol = (accent ? 0.7 : 0.45) * volumeScale;
  noiseGain.gain.setValueAtTime(noiseVol, when);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, when + 0.05);

  noise.connect(bp);
  bp.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(when);
  noise.stop(when + 0.06);

  // Low body thud
  const thud = ctx.createOscillator();
  thud.type = 'sine';
  thud.frequency.value = accent ? 340 : 270;
  const thudGain = ctx.createGain();
  const thudVol = (accent ? 0.22 : 0.14) * volumeScale;
  thudGain.gain.setValueAtTime(thudVol, when);
  thudGain.gain.exponentialRampToValueAtTime(0.001, when + 0.035);
  thud.connect(thudGain);
  thudGain.connect(ctx.destination);
  thud.start(when);
  thud.stop(when + 0.04);
}

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
export function playClick(sound: ClickSound, accent = false, volumeScale = 1): void {
  const ctx = getAudioContext();
  if (sound === 'mechanical') { scheduleMechanicalClick(ctx, accent, ctx.currentTime, volumeScale); return; }

  const freq = accent ? FREQ[sound] * 1.25 : FREQ[sound];
  const duration = accent ? 0.06 : 0.04;
  const gain = (accent ? 0.5 : 0.25) * volumeScale;

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
 * Schedule a click at a precise AudioContext timestamp.
 * Unlike `playClick`, this does not fire immediately — it places the sound
 * at the exact sample position specified by `when`.
 *
 * @param sound        Which timbre to use.
 * @param accent       Whether this is an accented (first-beat) click.
 * @param when         Absolute AudioContext time at which to play.
 * @param volumeScale  Optional gain multiplier (e.g. 0.35 for sub-beat ticks).
 */
export function scheduleClick(
  sound: ClickSound,
  accent: boolean,
  when: number,
  volumeScale = 1,
): void {
  const ctx = getAudioContext();
  if (sound === 'mechanical') { scheduleMechanicalClick(ctx, accent, when, volumeScale); return; }

  const freq = accent ? FREQ[sound] * 1.25 : FREQ[sound];
  const duration = accent ? 0.06 : 0.04;
  const gain = (accent ? 0.5 : 0.25) * volumeScale;

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = OSC_TYPE[sound];
  osc.frequency.value = freq;
  gainNode.gain.setValueAtTime(gain, when);
  gainNode.gain.exponentialRampToValueAtTime(0.001, when + duration);
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start(when);
  osc.stop(when + duration);
}

/**
 * Expose the shared AudioContext so external schedulers can read
 * `currentTime` without duplicating context-management logic.
 * Creates the context lazily on first access.
 */
export function getSharedAudioContext(): AudioContext {
  return getAudioContext();
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
    if (sound === 'mechanical') { scheduleMechanicalClick(ctx, accent, time); continue; }

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
