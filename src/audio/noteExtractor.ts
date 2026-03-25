import type { AlphaTabApi } from '@coderline/alphatab';

export interface TimedNote {
  /** MIDI note number (e.g. 40 = E2) */
  midi: number;
  /** Absolute start time in milliseconds */
  startMs: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Beat index within the score */
  beatIndex: number;
}

/**
 * Extract precise timing data for every note in the current score.
 *
 * This relies on AlphaTab's `tickCache` (MidiTickLookup) which maps
 * MIDI ticks → tempo information. It should be called after `playerReady`
 * fires so the MIDI data is available.
 */
export function extractTimedNotes(api: AlphaTabApi): TimedNote[] {
  const score = api.score;
  if (!score) return [];

  // Build a tempo map from the tickCache for tick → ms conversion
  const tempoMap = buildTempoMap(api);

  const notes: TimedNote[] = [];
  let beatIndex = 0;

  for (const track of score.tracks) {
    for (const staff of track.staves) {
      for (const bar of staff.bars) {
        for (const voice of bar.voices) {
          for (const beat of voice.beats) {
            const startTick = beat.absolutePlaybackStart;
            const durationTick = beat.playbackDuration;

            const startMs = tickToMs(tempoMap, startTick);
            const endMs = tickToMs(tempoMap, startTick + durationTick);

            for (const note of beat.notes) {
              if (note.isDead || note.isTieDestination) continue;
              notes.push({
                midi: note.realValue,
                startMs,
                durationMs: endMs - startMs,
                beatIndex,
              });
            }
            beatIndex++;
          }
        }
      }
    }
  }

  return notes;
}

/** A segment in the tempo map: from `startTick` the tempo is `bpm`. */
interface TempoSegment {
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
function buildTempoMap(api: AlphaTabApi): TempoSegment[] {
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
function tickToMs(tempoMap: TempoSegment[], tick: number): number {
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
