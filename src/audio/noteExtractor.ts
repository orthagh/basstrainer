import type { AlphaTabApi } from '@coderline/alphatab';

/** A segment in the tempo map: from `startTick` the tempo is `bpm`. */
export interface TempoSegment {
  startTick: number;
  startMs: number;
  bpm: number;
  msPerTick: number;
}

const PPQN = 960; // AlphaTab uses 960 pulses per quarter note

/**
 * Build a tempo map from AlphaTab's tick cache so we can convert
 * any tick to milliseconds accounting for tempo changes.
 */
export function buildTempoMap(api: AlphaTabApi): TempoSegment[] {
  const segments: TempoSegment[] = [];
  const tickCache = api.tickCache;
  const baseTempo = api.score?.tempo ?? 120;

  if (tickCache && tickCache.masterBars.length > 0) {
    let currentMs = 0;
    let prevTick = 0;
    let prevMsPerTick = 60000 / (baseTempo * PPQN);

    for (const mb of tickCache.masterBars) {
      // Advance ms by the gap since the last segment
      if (mb.start > prevTick && segments.length > 0) {
        currentMs += (mb.start - prevTick) * prevMsPerTick;
      }

      const bpm = mb.tempo ?? baseTempo;
      const msPerTick = 60000 / (bpm * PPQN);

      segments.push({
        startTick: mb.start,
        startMs: currentMs,
        bpm,
        msPerTick,
      });

      prevTick = mb.start;
      prevMsPerTick = msPerTick;
    }
  }

  // Fallback: single segment at the base tempo
  if (segments.length === 0) {
    segments.push({
      startTick: 0,
      startMs: 0,
      bpm: baseTempo,
      msPerTick: 60000 / (baseTempo * PPQN),
    });
  }

  return segments;
}

/**
 * Convert a MIDI tick to milliseconds using the pre-built tempo map.
 */
export function tickToMs(tempoMap: TempoSegment[], tick: number): number {
  // Find the last segment that starts at or before `tick`
  let seg = tempoMap[0];
  for (let i = tempoMap.length - 1; i >= 0; i--) {
    if (tempoMap[i].startTick <= tick) {
      seg = tempoMap[i];
      break;
    }
  }
  return seg.startMs + (tick - seg.startTick) * seg.msPerTick;
}
