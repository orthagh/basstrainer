import { describe, it, expect } from 'vitest';
import { extractTimedNotes } from './noteExtractor';

/**
 * Build a minimal mock that satisfies extractTimedNotes().
 *
 * We mock the AlphaTab API shape: score (tracks → staves → bars → voices → beats → notes)
 * and tickCache (masterBars with tick start + tempo).
 */
function makeMockApi(options: {
  tempo?: number;
  beats: Array<{
    absolutePlaybackStart: number;
    playbackDuration: number;
    notes: Array<{ realValue: number; isDead?: boolean; isTieDestination?: boolean }>;
  }>;
  masterBars?: Array<{ start: number; tempo?: number }>;
}) {
  const { tempo = 120, beats, masterBars } = options;

  return {
    score: {
      tempo,
      tracks: [
        {
          staves: [
            {
              bars: [
                {
                  voices: [
                    {
                      beats: beats.map((b) => ({
                        absolutePlaybackStart: b.absolutePlaybackStart,
                        playbackDuration: b.playbackDuration,
                        notes: b.notes.map((n) => ({
                          realValue: n.realValue,
                          isDead: n.isDead ?? false,
                          isTieDestination: n.isTieDestination ?? false,
                        })),
                      })),
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    tickCache: {
      masterBars: masterBars ?? [{ start: 0, tempo }],
    },
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

describe('extractTimedNotes', () => {
  const PPQN = 960; // AlphaTab pulses per quarter note

  it('returns empty array when score is null', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = { score: null, tickCache: null } as any;
    expect(extractTimedNotes(api)).toEqual([]);
  });

  it('extracts a single note with correct timing', () => {
    const bpm = 120;
    // At 120 BPM, one quarter note = 500ms, one 16th note = 125ms
    // 16th note duration in ticks = PPQN / 4 = 240 ticks
    const api = makeMockApi({
      tempo: bpm,
      beats: [
        {
          absolutePlaybackStart: 0,
          playbackDuration: PPQN / 4, // 16th note = 240 ticks
          notes: [{ realValue: 40 }], // E2
        },
      ],
    });

    const notes = extractTimedNotes(api);
    expect(notes).toHaveLength(1);
    expect(notes[0].midi).toBe(40);
    expect(notes[0].startMs).toBeCloseTo(0, 1);
    // 240 ticks at 120 BPM: 240 * (60000 / (120 * 960)) = 240 * 0.0520833 = 12.5ms? No…
    // msPerTick = 60000 / (bpm * PPQN) = 60000 / (120 * 960) = 0.065104166...
    // Actually: 60000 / 120 = 500ms per quarter, 500 / 960 = 0.520833 ms/tick
    // 240 ticks * 0.520833 = 125ms ← one 16th note at 120bpm ✓
    expect(notes[0].durationMs).toBeCloseTo(125, 0);
  });

  it('skips dead notes and tie destinations', () => {
    const api = makeMockApi({
      tempo: 120,
      beats: [
        {
          absolutePlaybackStart: 0,
          playbackDuration: PPQN,
          notes: [
            { realValue: 40 },
            { realValue: 45, isDead: true },
            { realValue: 33, isTieDestination: true },
          ],
        },
      ],
    });

    const notes = extractTimedNotes(api);
    expect(notes).toHaveLength(1);
    expect(notes[0].midi).toBe(40);
  });

  it('extracts multiple beats in sequence', () => {
    const bpm = 120;
    const sixteenthTicks = PPQN / 4; // 240

    const api = makeMockApi({
      tempo: bpm,
      beats: [
        { absolutePlaybackStart: 0, playbackDuration: sixteenthTicks, notes: [{ realValue: 40 }] },
        { absolutePlaybackStart: 240, playbackDuration: sixteenthTicks, notes: [{ realValue: 45 }] },
        { absolutePlaybackStart: 480, playbackDuration: sixteenthTicks, notes: [{ realValue: 33 }] },
        { absolutePlaybackStart: 720, playbackDuration: sixteenthTicks, notes: [{ realValue: 38 }] },
      ],
    });

    const notes = extractTimedNotes(api);
    expect(notes).toHaveLength(4);

    // Check sequential timing
    expect(notes[0].startMs).toBeCloseTo(0, 0);
    expect(notes[1].startMs).toBeCloseTo(125, 0);
    expect(notes[2].startMs).toBeCloseTo(250, 0);
    expect(notes[3].startMs).toBeCloseTo(375, 0);

    // Check MIDI values
    expect(notes.map((n) => n.midi)).toEqual([40, 45, 33, 38]);
  });

  it('handles tempo changes across master bars', () => {
    // Bar 1 at 120 BPM (4 quarter notes = 4 * 960 = 3840 ticks)
    // Bar 2 starts at tick 3840, tempo changes to 60 BPM
    const api = makeMockApi({
      tempo: 120,
      beats: [
        { absolutePlaybackStart: 0, playbackDuration: PPQN, notes: [{ realValue: 40 }] },
        { absolutePlaybackStart: 3840, playbackDuration: PPQN, notes: [{ realValue: 45 }] },
      ],
      masterBars: [
        { start: 0, tempo: 120 },
        { start: 3840, tempo: 60 },
      ],
    });

    const notes = extractTimedNotes(api);
    expect(notes).toHaveLength(2);

    // Note 1: tick 0 at 120 BPM → 0ms
    expect(notes[0].startMs).toBeCloseTo(0, 0);
    // Duration: 960 ticks * (60000 / (120 * 960)) = 500ms
    expect(notes[0].durationMs).toBeCloseTo(500, 0);

    // Note 2: tick 3840, bar 1 was 3840 ticks at 120 BPM = 2000ms
    expect(notes[1].startMs).toBeCloseTo(2000, 0);
    // Duration at 60 BPM: 960 ticks * (60000 / (60 * 960)) = 1000ms
    expect(notes[1].durationMs).toBeCloseTo(1000, 0);
  });

  it('assigns sequential beatIndex values', () => {
    const api = makeMockApi({
      tempo: 120,
      beats: [
        { absolutePlaybackStart: 0, playbackDuration: PPQN, notes: [{ realValue: 40 }] },
        { absolutePlaybackStart: PPQN, playbackDuration: PPQN, notes: [{ realValue: 45 }] },
        { absolutePlaybackStart: PPQN * 2, playbackDuration: PPQN, notes: [{ realValue: 33 }] },
      ],
    });

    const notes = extractTimedNotes(api);
    expect(notes.map((n) => n.beatIndex)).toEqual([0, 1, 2]);
  });

  it('uses fallback tempo when tickCache has no masterBars', () => {
    const api = {
      score: {
        tempo: 90,
        tracks: [
          {
            staves: [
              {
                bars: [
                  {
                    voices: [
                      {
                        beats: [
                          {
                            absolutePlaybackStart: 0,
                            playbackDuration: PPQN,
                            notes: [{ realValue: 40, isDead: false, isTieDestination: false }],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      tickCache: { masterBars: [] },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const notes = extractTimedNotes(api);
    expect(notes).toHaveLength(1);
    // At 90 BPM: msPerTick = 60000 / (90 * 960) ≈ 0.6944
    // Duration = 960 * 0.6944 ≈ 666.67ms
    expect(notes[0].durationMs).toBeCloseTo(666.67, 0);
  });
});
