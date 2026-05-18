import type { Style } from './progressions';

export interface DrumEvent {
  /** Time in beats (0-based, fractional) within the loop */
  time: number;
  /** GM drum MIDI note number */
  note: number;
  /** Velocity 0–127 */
  velocity: number;
}

// GM drum note constants
export const GM = {
  KICK:        36,
  SNARE:       38,
  SNARE_GHOST: 40,
  HI_HAT_CLOSED: 42,
  HI_HAT_OPEN:   46,
  RIDE:        51,
  CRASH:       49,
  LOW_TOM:     45,
  MID_TOM:     48,
  HI_TOM:      50,
} as const;

// Loop length in bars
export const LOOP_BARS: Record<Style, number> = {
  rock:   2,
  funk:   2,
  blues:  2,
  reggae: 2,
  jazz:   2,
};

/**
 * Drum loops per style. Each style has 1–2 loop variations.
 * Populated by scripts/extractGrooveLoops.ts from the Groove MIDI Dataset.
 * Fallback hand-crafted patterns used until the script is run.
 */
export const DRUM_LOOPS: Record<Style, DrumEvent[][]> = {
  rock: [
    // Straight 8th hi-hat, kick on 1&3, snare on 2&4 (2-bar loop)
    [
      { time: 0,    note: GM.KICK,           velocity: 100 },
      { time: 0,    note: GM.HI_HAT_CLOSED,  velocity: 80  },
      { time: 0.5,  note: GM.HI_HAT_CLOSED,  velocity: 60  },
      { time: 1,    note: GM.SNARE,           velocity: 95  },
      { time: 1,    note: GM.HI_HAT_CLOSED,  velocity: 80  },
      { time: 1.5,  note: GM.HI_HAT_CLOSED,  velocity: 60  },
      { time: 2,    note: GM.KICK,           velocity: 100 },
      { time: 2,    note: GM.HI_HAT_CLOSED,  velocity: 80  },
      { time: 2.5,  note: GM.KICK,           velocity: 85  },
      { time: 2.5,  note: GM.HI_HAT_CLOSED,  velocity: 60  },
      { time: 3,    note: GM.SNARE,           velocity: 95  },
      { time: 3,    note: GM.HI_HAT_CLOSED,  velocity: 80  },
      { time: 3.5,  note: GM.HI_HAT_CLOSED,  velocity: 60  },
      // bar 2
      { time: 4,    note: GM.KICK,           velocity: 100 },
      { time: 4,    note: GM.HI_HAT_CLOSED,  velocity: 80  },
      { time: 4.5,  note: GM.HI_HAT_CLOSED,  velocity: 60  },
      { time: 5,    note: GM.SNARE,           velocity: 95  },
      { time: 5,    note: GM.HI_HAT_CLOSED,  velocity: 80  },
      { time: 5.5,  note: GM.HI_HAT_CLOSED,  velocity: 60  },
      { time: 6,    note: GM.KICK,           velocity: 100 },
      { time: 6,    note: GM.HI_HAT_CLOSED,  velocity: 80  },
      { time: 6.5,  note: GM.HI_HAT_CLOSED,  velocity: 60  },
      { time: 7,    note: GM.SNARE,           velocity: 95  },
      { time: 7,    note: GM.HI_HAT_CLOSED,  velocity: 80  },
      { time: 7.5,  note: GM.HI_HAT_CLOSED,  velocity: 60  },
    ],
  ],

  funk: [
    // 16th hi-hat, syncopated kick, ghost snares (2-bar)
    [
      { time: 0,     note: GM.KICK,           velocity: 100 },
      { time: 0,     note: GM.HI_HAT_CLOSED,  velocity: 90  },
      { time: 0.25,  note: GM.HI_HAT_CLOSED,  velocity: 50  },
      { time: 0.5,   note: GM.HI_HAT_CLOSED,  velocity: 70  },
      { time: 0.5,   note: GM.SNARE_GHOST,    velocity: 40  },
      { time: 0.75,  note: GM.HI_HAT_CLOSED,  velocity: 50  },
      { time: 1,     note: GM.SNARE,           velocity: 95  },
      { time: 1,     note: GM.HI_HAT_CLOSED,  velocity: 90  },
      { time: 1.25,  note: GM.HI_HAT_CLOSED,  velocity: 50  },
      { time: 1.5,   note: GM.KICK,           velocity: 85  },
      { time: 1.5,   note: GM.HI_HAT_CLOSED,  velocity: 70  },
      { time: 1.75,  note: GM.HI_HAT_CLOSED,  velocity: 50  },
      { time: 2,     note: GM.KICK,           velocity: 100 },
      { time: 2,     note: GM.HI_HAT_CLOSED,  velocity: 90  },
      { time: 2.25,  note: GM.SNARE_GHOST,    velocity: 35  },
      { time: 2.25,  note: GM.HI_HAT_CLOSED,  velocity: 50  },
      { time: 2.5,   note: GM.HI_HAT_CLOSED,  velocity: 70  },
      { time: 2.75,  note: GM.HI_HAT_CLOSED,  velocity: 50  },
      { time: 3,     note: GM.SNARE,           velocity: 95  },
      { time: 3,     note: GM.HI_HAT_CLOSED,  velocity: 90  },
      { time: 3.25,  note: GM.HI_HAT_CLOSED,  velocity: 50  },
      { time: 3.5,   note: GM.KICK,           velocity: 80  },
      { time: 3.5,   note: GM.HI_HAT_CLOSED,  velocity: 70  },
      { time: 3.75,  note: GM.HI_HAT_CLOSED,  velocity: 50  },
      // bar 2
      { time: 4,     note: GM.KICK,           velocity: 100 },
      { time: 4,     note: GM.HI_HAT_CLOSED,  velocity: 90  },
      { time: 4.25,  note: GM.HI_HAT_CLOSED,  velocity: 50  },
      { time: 4.5,   note: GM.HI_HAT_CLOSED,  velocity: 70  },
      { time: 4.75,  note: GM.HI_HAT_CLOSED,  velocity: 50  },
      { time: 5,     note: GM.SNARE,           velocity: 95  },
      { time: 5,     note: GM.HI_HAT_CLOSED,  velocity: 90  },
      { time: 5.25,  note: GM.HI_HAT_CLOSED,  velocity: 50  },
      { time: 5.5,   note: GM.KICK,           velocity: 85  },
      { time: 5.5,   note: GM.HI_HAT_CLOSED,  velocity: 70  },
      { time: 5.75,  note: GM.SNARE_GHOST,    velocity: 40  },
      { time: 5.75,  note: GM.HI_HAT_CLOSED,  velocity: 50  },
      { time: 6,     note: GM.KICK,           velocity: 95  },
      { time: 6,     note: GM.HI_HAT_CLOSED,  velocity: 90  },
      { time: 6.25,  note: GM.HI_HAT_CLOSED,  velocity: 50  },
      { time: 6.5,   note: GM.HI_HAT_CLOSED,  velocity: 70  },
      { time: 6.75,  note: GM.HI_HAT_CLOSED,  velocity: 50  },
      { time: 7,     note: GM.SNARE,           velocity: 95  },
      { time: 7,     note: GM.HI_HAT_CLOSED,  velocity: 90  },
      { time: 7.25,  note: GM.HI_HAT_CLOSED,  velocity: 50  },
      { time: 7.5,   note: GM.KICK,           velocity: 80  },
      { time: 7.5,   note: GM.HI_HAT_CLOSED,  velocity: 70  },
      { time: 7.75,  note: GM.HI_HAT_CLOSED,  velocity: 50  },
    ],
  ],

  blues: [
    // Shuffle feel — triplet-based 8ths, kick 1&3, snare 2&4 (2-bar)
    [
      { time: 0,     note: GM.KICK,           velocity: 100 },
      { time: 0,     note: GM.HI_HAT_CLOSED,  velocity: 85  },
      { time: 0.667, note: GM.HI_HAT_CLOSED,  velocity: 55  },
      { time: 1,     note: GM.SNARE,           velocity: 90  },
      { time: 1,     note: GM.HI_HAT_CLOSED,  velocity: 85  },
      { time: 1.667, note: GM.HI_HAT_CLOSED,  velocity: 55  },
      { time: 2,     note: GM.KICK,           velocity: 100 },
      { time: 2,     note: GM.HI_HAT_CLOSED,  velocity: 85  },
      { time: 2.333, note: GM.KICK,           velocity: 70  },
      { time: 2.667, note: GM.HI_HAT_CLOSED,  velocity: 55  },
      { time: 3,     note: GM.SNARE,           velocity: 90  },
      { time: 3,     note: GM.HI_HAT_CLOSED,  velocity: 85  },
      { time: 3.667, note: GM.HI_HAT_CLOSED,  velocity: 55  },
      // bar 2
      { time: 4,     note: GM.KICK,           velocity: 100 },
      { time: 4,     note: GM.HI_HAT_CLOSED,  velocity: 85  },
      { time: 4.667, note: GM.HI_HAT_CLOSED,  velocity: 55  },
      { time: 5,     note: GM.SNARE,           velocity: 90  },
      { time: 5,     note: GM.HI_HAT_CLOSED,  velocity: 85  },
      { time: 5.667, note: GM.HI_HAT_CLOSED,  velocity: 55  },
      { time: 6,     note: GM.KICK,           velocity: 100 },
      { time: 6,     note: GM.HI_HAT_CLOSED,  velocity: 85  },
      { time: 6.667, note: GM.HI_HAT_CLOSED,  velocity: 55  },
      { time: 7,     note: GM.SNARE,           velocity: 90  },
      { time: 7,     note: GM.HI_HAT_CLOSED,  velocity: 85  },
      { time: 7.667, note: GM.HI_HAT_CLOSED,  velocity: 55  },
    ],
  ],

  reggae: [
    // One-drop: kick on beat 3, snare on 2&4 (open hi-hat on 2&4 offbeats)
    [
      { time: 0,    note: GM.HI_HAT_CLOSED,  velocity: 70  },
      { time: 0.5,  note: GM.HI_HAT_OPEN,    velocity: 65  },
      { time: 1,    note: GM.SNARE,           velocity: 90  },
      { time: 1,    note: GM.HI_HAT_CLOSED,  velocity: 70  },
      { time: 1.5,  note: GM.HI_HAT_OPEN,    velocity: 65  },
      { time: 2,    note: GM.KICK,           velocity: 100 },
      { time: 2,    note: GM.HI_HAT_CLOSED,  velocity: 70  },
      { time: 2.5,  note: GM.HI_HAT_OPEN,    velocity: 65  },
      { time: 3,    note: GM.SNARE,           velocity: 90  },
      { time: 3,    note: GM.HI_HAT_CLOSED,  velocity: 70  },
      { time: 3.5,  note: GM.HI_HAT_OPEN,    velocity: 65  },
      // bar 2
      { time: 4,    note: GM.HI_HAT_CLOSED,  velocity: 70  },
      { time: 4.5,  note: GM.HI_HAT_OPEN,    velocity: 65  },
      { time: 5,    note: GM.SNARE,           velocity: 90  },
      { time: 5,    note: GM.HI_HAT_CLOSED,  velocity: 70  },
      { time: 5.5,  note: GM.HI_HAT_OPEN,    velocity: 65  },
      { time: 6,    note: GM.KICK,           velocity: 100 },
      { time: 6,    note: GM.HI_HAT_CLOSED,  velocity: 70  },
      { time: 6.5,  note: GM.HI_HAT_OPEN,    velocity: 65  },
      { time: 7,    note: GM.SNARE,           velocity: 90  },
      { time: 7,    note: GM.HI_HAT_CLOSED,  velocity: 70  },
      { time: 7.5,  note: GM.HI_HAT_OPEN,    velocity: 65  },
    ],
  ],

  jazz: [
    // Swing ride: triplet 8ths on ride (0.667 beat offset), snare on 2&4, sparse kick
    [
      // bar 1
      { time: 0,     note: GM.RIDE,  velocity: 90 },
      { time: 0.667, note: GM.RIDE,  velocity: 55 },
      { time: 1,     note: GM.RIDE,  velocity: 85 },
      { time: 1,     note: GM.SNARE, velocity: 58 },
      { time: 1.667, note: GM.RIDE,  velocity: 55 },
      { time: 2,     note: GM.KICK,  velocity: 65 },
      { time: 2,     note: GM.RIDE,  velocity: 88 },
      { time: 2.667, note: GM.RIDE,  velocity: 55 },
      { time: 3,     note: GM.RIDE,  velocity: 85 },
      { time: 3,     note: GM.SNARE, velocity: 58 },
      { time: 3.667, note: GM.RIDE,  velocity: 55 },
      // bar 2
      { time: 4,     note: GM.RIDE,  velocity: 90 },
      { time: 4.667, note: GM.RIDE,  velocity: 55 },
      { time: 5,     note: GM.RIDE,  velocity: 85 },
      { time: 5,     note: GM.SNARE, velocity: 58 },
      { time: 5.667, note: GM.RIDE,  velocity: 55 },
      { time: 6,     note: GM.RIDE,  velocity: 88 },
      { time: 6.667, note: GM.RIDE,  velocity: 55 },
      { time: 7,     note: GM.RIDE,  velocity: 85 },
      { time: 7,     note: GM.SNARE, velocity: 58 },
      { time: 7.667, note: GM.RIDE,  velocity: 55 },
    ],
  ],
};
