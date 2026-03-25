/**
 * PostExerciseSummary — full-screen overlay shown after an evaluated run.
 *
 * Displays:
 *  • SVG radial ring chart for overall accuracy
 *  • Pitch accuracy, groove lock score
 *  • Hit / missed counts
 *  • Delta vs personal best (placeholder until 5c)
 *  • Retry & Next exercise actions
 */

import { useMemo, useEffect, useRef } from 'react';
import { RotateCcw, SkipForward, X } from 'lucide-react';
import type { EvaluationSummary } from '../evaluation/types';

// ── Ring chart geometry ─────────────────────────────────
const RING_SIZE = 140;
const RING_STROKE = 12;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface PostExerciseSummaryProps {
  summary: EvaluationSummary;
  exerciseTitle: string;
  /** Personal best accuracy (0..1) for delta display. `null` if none saved. */
  personalBest: number | null;
  onDismiss: () => void;
  onRetry: () => void;
  onNextExercise: (() => void) | null;
}

export default function PostExerciseSummary({
  summary,
  exerciseTitle,
  personalBest,
  onDismiss,
  onRetry,
  onNextExercise,
}: PostExerciseSummaryProps) {
  const accuracyPct = Math.round(summary.accuracy * 100);
  const pitchPct = Math.round(summary.pitchAccuracy * 100);
  const groovePct = Math.round(summary.grooveLock * 100);

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap and Escape key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onDismiss]);

  // ── Personal best delta ────────────────────────────────
  const delta = useMemo(() => {
    if (personalBest === null) return null;
    const diff = summary.accuracy - personalBest;
    const diffPct = Math.round(diff * 100);
    if (diff > 0) return { text: `↑ +${diffPct}%`, isNewBest: diffPct >= 0 && summary.accuracy >= personalBest, color: 'text-emerald-400' };
    if (diff === 0) return { text: 'Matched best', isNewBest: false, color: 'text-muted-foreground' };
    return { text: `↓ ${diffPct}%`, isNewBest: false, color: 'text-rose-400' };
  }, [summary.accuracy, personalBest]);

  const isNewBest = personalBest !== null && summary.accuracy > personalBest;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="summary-title"
        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-8 animate-in zoom-in-95 duration-200"
      >
        {/* Close button */}
        <button
          ref={closeButtonRef}
          onClick={onDismiss}
          className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          aria-label="Dismiss summary"
        >
          <X size={18} aria-hidden="true" />
        </button>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 id="summary-title" className="text-lg font-bold text-foreground">Session Complete</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{exerciseTitle}</p>
        </div>

        {/* ── Top row: Ring + Stats ───────────────────── */}
        <div className="flex items-center gap-8 mb-6">
          {/* Accuracy ring chart */}
          <div className="shrink-0 relative flex items-center justify-center">
            <svg
              width={RING_SIZE}
              height={RING_SIZE}
              viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
              className="-rotate-90"
              aria-hidden="true"
            >
              {/* Background ring */}
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke="currentColor"
                className="text-muted/40"
                strokeWidth={RING_STROKE}
              />
              {/* Foreground arc */}
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke="currentColor"
                className={
                  accuracyPct >= 80
                    ? 'text-emerald-400'
                    : accuracyPct >= 50
                      ? 'text-amber-400'
                      : 'text-rose-400'
                }
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={
                  RING_CIRCUMFERENCE * (1 - summary.accuracy)
                }
                style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
              />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
              <span className="text-3xl font-bold text-foreground tabular-nums">
                {accuracyPct}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Accuracy
              </span>
            </div>
            {/* SR text for the chart */}
            <span className="sr-only">Overall accuracy: {accuracyPct}%</span>
          </div>

          {/* Stats grid */}
          <div className="flex-1 grid grid-cols-2 gap-3" role="group" aria-label="Session statistics">
            <StatCard label="Notes hit" value={`${summary.hitCount} / ${summary.totalNotes}`} />
            <StatCard label="Missed" value={String(summary.missCount)} warn={summary.missCount > 0} />
            <StatCard label="Pitch accuracy" value={`${pitchPct}%`} />
            <StatCard
              label="Groove lock"
              value={`${groovePct}%`}
              sublabel={grooveLabel(groovePct)}
            />
          </div>
        </div>

        {/* ── Personal best delta ─────────────────────── */}
        {delta && (
          <div className="text-center mb-5" role="status">
            {isNewBest ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-400">
                🏆 New personal best!
              </span>
            ) : (
              <span className={`text-sm font-medium ${delta.color}`}>
                vs. best: {delta.text}
              </span>
            )}
          </div>
        )}

        {/* ── Actions ─────────────────────────────────── */}
        <div className="flex gap-3">
          <button
            onClick={onRetry}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-muted hover:bg-secondary text-foreground font-medium text-sm rounded-xl transition-colors"
          >
            <RotateCcw size={16} aria-hidden="true" />
            Retry
          </button>
          {onNextExercise && (
            <button
              onClick={onNextExercise}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm rounded-xl transition-colors"
            >
              Next exercise
              <SkipForward size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function StatCard({
  label,
  value,
  sublabel,
  warn = false,
}: {
  label: string;
  value: string;
  sublabel?: string;
  warn?: boolean;
}) {
  return (
    <div className="bg-muted/40 rounded-lg px-3 py-2">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
        {label}
      </div>
      <div
        className={`text-sm font-semibold tabular-nums ${
          warn ? 'text-rose-400' : 'text-foreground'
        }`}
      >
        {value}
      </div>
      {sublabel && (
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {sublabel}
        </div>
      )}
    </div>
  );
}

function grooveLabel(pct: number): string {
  if (pct >= 90) return 'Rock solid';
  if (pct >= 70) return 'Tight';
  if (pct >= 50) return 'Decent';
  if (pct >= 30) return 'Loose';
  return 'Shaky';
}
