/**
 * NoteEvaluationOverlay — renders coloured indicators over the AlphaTab score
 * to give real-time visual feedback on each evaluated note.
 *
 * Indicators:
 *   • Green  — hit with good timing (|offset| ≤ 20 ms)
 *   • Orange — hit but timing off (|offset| > 20 ms), with ↑ rush / ↓ drag arrow
 *   • Red    — missed note
 *
 * The overlay is absolutely positioned inside the AlphaTab scroll container
 * so it scrolls with the score content.
 */

import { useMemo } from 'react';
import type { NoteEvaluation } from '../evaluation/types';

/** Timing threshold in ms — matches scoring.ts ON_TIME_THRESHOLD_MS. */
const ON_TIME_THRESHOLD_MS = 20;

export interface BeatRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface NoteEvaluationOverlayProps {
  evaluations: NoteEvaluation[];
  beatBoundsMap: Map<number, BeatRect>;
}

type EvalStatus = 'hit' | 'timing' | 'miss';

const STATUS_COLORS: Record<EvalStatus, string> = {
  hit: '#22c55e',    // emerald-500
  timing: '#f59e0b', // amber-500
  miss: '#ef4444',   // red-500
};

const STATUS_PRIORITY: Record<EvalStatus, number> = {
  hit: 0,
  timing: 1,
  miss: 2,
};

function getStatus(ev: NoteEvaluation): EvalStatus {
  if (!ev.isHit) return 'miss';
  return Math.abs(ev.timingOffsetMs) > ON_TIME_THRESHOLD_MS ? 'timing' : 'hit';
}

export default function NoteEvaluationOverlay({
  evaluations,
  beatBoundsMap,
}: NoteEvaluationOverlayProps) {
  // Group evaluations by beatIndex — keep the worst status per beat
  const beatEvals = useMemo(() => {
    const map = new Map<number, { status: EvalStatus; timingOffsetMs: number }>();

    for (const ev of evaluations) {
      const bi = ev.expected.beatIndex;
      const status = getStatus(ev);
      const existing = map.get(bi);

      if (!existing || STATUS_PRIORITY[status] > STATUS_PRIORITY[existing.status]) {
        map.set(bi, { status, timingOffsetMs: ev.timingOffsetMs });
      }
    }

    return map;
  }, [evaluations]);

  if (beatEvals.size === 0 || beatBoundsMap.size === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      {Array.from(beatEvals.entries()).map(([beatIndex, { status, timingOffsetMs }]) => {
        const bounds = beatBoundsMap.get(beatIndex);
        if (!bounds) return null;

        const color = STATUS_COLORS[status];
        const showArrow = status === 'timing';
        const isEarly = timingOffsetMs < 0;

        return (
          <div key={beatIndex}>
            {/* Subtle background tint */}
            <div
              className="note-eval-indicator"
              style={{
                position: 'absolute',
                left: bounds.x,
                top: bounds.y,
                width: bounds.w,
                height: bounds.h,
                backgroundColor: color,
                opacity: 0.1,
                borderRadius: 2,
              }}
            />
            {/* Bottom indicator strip */}
            <div
              className="note-eval-indicator"
              style={{
                position: 'absolute',
                left: bounds.x + 2,
                top: bounds.y + bounds.h - 3,
                width: Math.max(bounds.w - 4, 4),
                height: 3,
                borderRadius: 1.5,
                backgroundColor: color,
                opacity: 0.7,
              }}
            />
            {/* Rush / drag arrow */}
            {showArrow && (
              <div
                className="note-eval-indicator"
                style={{
                  position: 'absolute',
                  left: bounds.x + bounds.w / 2 - 6,
                  top: bounds.y - 16,
                  fontSize: 12,
                  fontWeight: 700,
                  color,
                  opacity: 0.85,
                  lineHeight: 1,
                  textAlign: 'center',
                  width: 12,
                }}
              >
                {isEarly ? '↑' : '↓'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
