/**
 * EvaluationPanel — displays evaluation settings, live results during
 * playback, and a post-session summary.
 *
 * Evaluation is entirely optional: the user can toggle it on/off
 * independently of the microphone.
 */

import type {
  ToleranceLevel,
  NoteEvaluation,
  EvaluationSummary,
} from '../evaluation/types';
import type { LiveResults } from '../hooks/useEvaluation';
import { midiToNoteName } from '../audio/pitchDetector';

interface EvaluationPanelProps {
  evaluationEnabled: boolean;
  setEvaluationEnabled: (enabled: boolean) => void;
  isActive: boolean;
  isListening: boolean;
  toleranceLevel: ToleranceLevel;
  changeTolerance: (level: ToleranceLevel) => void;
  latencyMs: number;
  changeLatency: (ms: number) => void;
  liveResults: LiveResults;
  lastEvaluation: NoteEvaluation | null;
  summary: EvaluationSummary | null;
  dismissSummary: () => void;
}

const TOLERANCE_LEVELS: ToleranceLevel[] = ['easy', 'medium', 'hard'];

export default function EvaluationPanel({
  evaluationEnabled,
  setEvaluationEnabled,
  isActive,
  isListening,
  toleranceLevel,
  changeTolerance,
  latencyMs,
  changeLatency,
  liveResults,
  lastEvaluation,
  summary,
  dismissSummary,
}: EvaluationPanelProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      {/* Header with toggle */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800">Evaluation</h3>
        <button
          onClick={() => setEvaluationEnabled(!evaluationEnabled)}
          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
            evaluationEnabled
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {evaluationEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {!evaluationEnabled ? (
        <p className="text-sm text-slate-400 text-center py-4">
          Enable to get scored while playing
        </p>
      ) : (
        <>
          {/* ── Settings ──────────────────────────── */}

          {/* Tolerance selector */}
          <div className="mb-3">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">
              Tolerance
            </div>
            <div className="flex gap-1">
              {TOLERANCE_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => changeTolerance(level)}
                  disabled={isActive}
                  className={`flex-1 px-2 py-1 text-xs font-medium rounded-lg transition-colors capitalize disabled:opacity-60 ${
                    toleranceLevel === level
                      ? 'bg-sky-100 text-sky-700 ring-1 ring-sky-300'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Latency slider */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                Latency offset
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {latencyMs}ms
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={latencyMs}
              onChange={(e) => changeLatency(Number(e.target.value))}
              disabled={isActive}
              className="w-full accent-sky-500"
            />
          </div>

          {/* ── Divider ───────────────────────────── */}
          <div className="h-px bg-slate-100 mb-4" />

          {/* ── Content ───────────────────────────── */}
          {summary ? (
            <SummaryDisplay summary={summary} onDismiss={dismissSummary} />
          ) : isActive ? (
            <LiveDisplay
              liveResults={liveResults}
              lastEvaluation={lastEvaluation}
            />
          ) : (
            <InactiveDisplay isListening={isListening} />
          )}
        </>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────

/** Shown during active evaluation. */
function LiveDisplay({
  liveResults,
  lastEvaluation,
}: {
  liveResults: LiveResults;
  lastEvaluation: NoteEvaluation | null;
}) {
  const accuracyPct = Math.round(liveResults.accuracy * 100);

  return (
    <div className="space-y-3">
      {/* Accuracy bar */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-600">Accuracy</span>
          <span className="font-semibold text-slate-800">{accuracyPct}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              accuracyPct >= 80
                ? 'bg-emerald-400'
                : accuracyPct >= 50
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
            }`}
            style={{ width: `${accuracyPct}%` }}
          />
        </div>
      </div>

      {/* Hit / Miss counters */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-slate-600">
            Hits: <b>{liveResults.hits}</b>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-400" />
          <span className="text-slate-600">
            Miss: <b>{liveResults.misses}</b>
          </span>
        </div>
      </div>

      {/* Last note result */}
      {lastEvaluation && (
        <div
          className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
            lastEvaluation.isHit ? 'bg-emerald-50' : 'bg-rose-50'
          }`}
        >
          <span
            className={`text-lg ${
              lastEvaluation.isHit ? 'text-emerald-500' : 'text-rose-500'
            }`}
          >
            {lastEvaluation.isHit ? '✓' : '✗'}
          </span>
          <div>
            <span className="font-mono font-medium text-slate-700">
              {midiToNoteName(lastEvaluation.expected.midi)}
            </span>
            {lastEvaluation.isHit && (
              <span className="text-xs text-slate-400 ml-1.5">
                {lastEvaluation.timingOffsetMs > 0 ? '+' : ''}
                {Math.round(lastEvaluation.timingOffsetMs)}ms
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Shown after a completed session. */
function SummaryDisplay({
  summary,
  onDismiss,
}: {
  summary: EvaluationSummary;
  onDismiss: () => void;
}) {
  const accuracyPct = Math.round(summary.accuracy * 100);
  const pitchPct = Math.round(summary.pitchAccuracy * 100);
  const groovePct = Math.round(summary.grooveLock * 100);

  // Timing tendency
  const avgMs = summary.averageTimingOffsetMs;
  let timingLabel: string;
  let timingColor: string;
  if (summary.hitCount === 0) {
    timingLabel = '—';
    timingColor = 'text-slate-400';
  } else if (Math.abs(avgMs) < 10) {
    timingLabel = '🎯 Locked in!';
    timingColor = 'text-emerald-600';
  } else if (avgMs < 0) {
    timingLabel = `⚡ Rushing (${Math.round(Math.abs(avgMs))}ms early)`;
    timingColor = 'text-amber-600';
  } else {
    timingLabel = `🐢 Dragging (${Math.round(avgMs)}ms late)`;
    timingColor = 'text-amber-600';
  }

  return (
    <div className="space-y-3">
      <div className="text-[10px] text-slate-400 uppercase tracking-wider">
        Session Summary
      </div>

      {/* Note count */}
      <div className="text-sm text-slate-600">
        <b>{summary.hitCount}</b> / {summary.totalNotes} notes hit
      </div>

      {/* Stat bars */}
      <StatBar label="Accuracy" value={accuracyPct} />
      <StatBar label="Pitch" value={pitchPct} />
      <StatBar label="Groove Lock" value={groovePct} />

      {/* Timing tendency */}
      <div className={`text-sm font-medium ${timingColor}`}>
        {timingLabel}
      </div>

      {/* Timing distribution */}
      {summary.hitCount > 0 && (
        <div className="flex gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Early: {summary.timingDistribution.early}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            On: {summary.timingDistribution.onTime}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            Late: {summary.timingDistribution.late}
          </span>
        </div>
      )}

      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="w-full mt-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
      >
        Dismiss
      </button>
    </div>
  );
}

/** Reusable horizontal stat bar. */
function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-800">{value}%</span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            value >= 80
              ? 'bg-emerald-400'
              : value >= 50
                ? 'bg-amber-400'
                : 'bg-rose-400'
          }`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

/** Shown when evaluation is enabled but not active. */
function InactiveDisplay({ isListening }: { isListening: boolean }) {
  return (
    <div className="text-center py-4">
      {isListening ? (
        <p className="text-sm text-slate-500">
          Press play to start evaluation
        </p>
      ) : (
        <p className="text-sm text-slate-400">
          Enable mic &amp; press play to evaluate
        </p>
      )}
    </div>
  );
}
