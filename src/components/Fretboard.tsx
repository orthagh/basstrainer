import { STANDARD_BASS_4, midiToNoteInfo } from '../lib/musicTheory';

export type HighlightState = 'target' | 'root' | 'correct' | 'wrong' | 'hint' | 'scale' | 'scale-active';

export interface FretHighlight {
  string: number;  // 0 = lowest string (E)
  fret: number;
  state: HighlightState;
  showLabel?: boolean;
}

export interface FretboardProps {
  tuning?: number[];
  frets?: number;
  highlights?: FretHighlight[];
  showFretNumbers?: boolean;
  onFretClick?: (string: number, fret: number) => void;
}

// SVG layout constants
const LABEL_W = 30;
const OPEN_W = 34;
const NUT_X = LABEL_W + OPEN_W;
const FRET_SPACING = 78;  // visual width per fret slot
const RIGHT_PAD = 14;
const TOP_PAD = 36;        // extra room above top string for fret numbers
const STRING_SPACING = 22;
const NUM_STRINGS = 4;
const BOT_PAD = 14;
const DOT_R = 8;
const TOTAL_H = TOP_PAD + (NUM_STRINGS - 1) * STRING_SPACING + BOT_PAD;

const STRING_LABELS = ['G', 'D', 'A', 'E'];

const FRET_MARKERS = [3, 5, 7, 9];
const DOUBLE_MARKER_FRET = 12;

const HIGHLIGHT_CONFIG: Record<HighlightState, { fill: string; stroke?: string; strokeWidth?: number; textFill: string }> = {
  target:         { fill: '#f5a623',              textFill: '#1c1c1f' },
  root:           { fill: '#3b82f6',              textFill: '#fff' },
  correct:        { fill: '#22c55e',              textFill: '#fff' },
  wrong:          { fill: '#ef4444',              textFill: '#fff' },
  hint:           { fill: '#f5a62366',            textFill: '#f5a623' },
  scale:          { fill: 'rgba(161,161,170,0.12)', stroke: '#a1a1aa', strokeWidth: 1.5, textFill: '#a1a1aa' },
  'scale-active': { fill: '#22c55e',              textFill: '#fff' },
};

function stringY(stringIndex: number): number {
  return TOP_PAD + (NUM_STRINGS - 1 - stringIndex) * STRING_SPACING;
}

// Equal-temperament fret ratio: fraction of scale length from nut to fret k
function fretRatio(k: number): number {
  return 1 - Math.pow(2, -k / 12);
}

// X position of fret bar k (1-indexed), using real physics tapering
function fretBarX(k: number, totalFretW: number): number {
  return NUT_X + fretRatio(k) * totalFretW;
}

// X position of note dot in fret slot f (center between bars f-1 and f)
function noteX(fret: number, totalFretW: number): number {
  if (fret === 0) return LABEL_W + OPEN_W / 2;
  const prev = fret === 1 ? 0 : fretRatio(fret - 1) * totalFretW;
  const curr = fretRatio(fret) * totalFretW;
  return NUT_X + (prev + curr) / 2;
}

export default function Fretboard({
  tuning = STANDARD_BASS_4,
  frets = 12,
  highlights = [],
  showFretNumbers = true,
  onFretClick,
}: FretboardProps) {
  // Visual width of the neck (nut → last fret bar). The internal "scale length"
  // totalFretW is larger so that equal-temperament ratios map the last fret
  // exactly to the right edge of the SVG.
  const neckVisualW = frets * FRET_SPACING;
  const totalFretW = neckVisualW / fretRatio(frets);
  const totalW = NUT_X + neckVisualW + RIGHT_PAD;
  const numStrings = tuning.length;

  const markerY = TOP_PAD + ((numStrings - 1) / 2) * STRING_SPACING;

  return (
    <svg
      viewBox={`0 0 ${totalW} ${TOTAL_H}`}
      className="w-full h-auto"
      style={{ maxHeight: 180 }}
      overflow="hidden"
      aria-hidden="true"
    >
      {/* String labels */}
      {Array.from({ length: numStrings }, (_, i) => {
        const visIdx = numStrings - 1 - i;
        const label = STRING_LABELS[visIdx];
        const y = stringY(i);
        return (
          <text
            key={i}
            x={LABEL_W / 2}
            y={y + 4}
            textAnchor="middle"
            fontSize={11}
            fill="#71717a"
            fontFamily="monospace"
          >
            {label}
          </text>
        );
      })}

      {/* Open string separator */}
      <line
        x1={NUT_X - 1} y1={TOP_PAD - 4}
        x2={NUT_X - 1} y2={TOP_PAD + (numStrings - 1) * STRING_SPACING + 4}
        stroke="#52525b"
        strokeWidth={1}
        strokeDasharray="3,3"
      />

      {/* Nut */}
      <rect
        x={NUT_X - 3}
        y={TOP_PAD - 4}
        width={5}
        height={(numStrings - 1) * STRING_SPACING + 8}
        fill="#e4e4e7"
        rx={1}
      />

      {/* Fret bars (tapered — closer together toward the right) */}
      {Array.from({ length: frets }, (_, k) => {
        const x = fretBarX(k + 1, totalFretW);
        return (
          <line
            key={k}
            x1={x} y1={TOP_PAD - 3}
            x2={x} y2={TOP_PAD + (numStrings - 1) * STRING_SPACING + 3}
            stroke="#3f3f46"
            strokeWidth={1.5}
          />
        );
      })}

      {/* Strings */}
      {Array.from({ length: numStrings }, (_, i) => {
        const y = stringY(i);
        const thickness = 1 + (i / (numStrings - 1)) * 1.5;
        return (
          <line
            key={i}
            x1={LABEL_W + 2} y1={y}
            x2={totalW - RIGHT_PAD} y2={y}
            stroke="#52525b"
            strokeWidth={thickness}
          />
        );
      })}

      {/* Fret numbers — raised to clear dot radius */}
      {showFretNumbers && Array.from({ length: frets }, (_, k) => {
        const f = k + 1;
        const x = noteX(f, totalFretW);
        return (
          <text
            key={f}
            x={x}
            y={TOP_PAD - DOT_R - 6}
            textAnchor="middle"
            fontSize={10}
            fill="#52525b"
            fontFamily="monospace"
          >
            {f}
          </text>
        );
      })}

      {/* Fret markers */}
      {FRET_MARKERS.filter(f => f <= frets).map(f => (
        <circle
          key={f}
          cx={noteX(f, totalFretW)}
          cy={markerY}
          r={4}
          fill="#3f3f46"
        />
      ))}
      {DOUBLE_MARKER_FRET <= frets && (
        <>
          <circle cx={noteX(DOUBLE_MARKER_FRET, totalFretW)} cy={TOP_PAD + STRING_SPACING * 0.5} r={4} fill="#3f3f46" />
          <circle cx={noteX(DOUBLE_MARKER_FRET, totalFretW)} cy={TOP_PAD + STRING_SPACING * 2.5} r={4} fill="#3f3f46" />
        </>
      )}

      {/* Click zones */}
      {onFretClick && Array.from({ length: numStrings }, (_, s) =>
        Array.from({ length: frets + 1 }, (_, f) => {
          const cellLeft = f === 0 ? LABEL_W : NUT_X + fretRatio(f - 1) * totalFretW;
          const cellWidth = f === 0 ? OPEN_W : (fretRatio(f) - fretRatio(f - 1)) * totalFretW;
          return (
            <rect
              key={`${s}-${f}`}
              x={cellLeft}
              y={stringY(s) - STRING_SPACING / 2}
              width={cellWidth}
              height={STRING_SPACING}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onClick={() => onFretClick(s, f)}
            />
          );
        })
      )}

      {/* Highlight dots */}
      {highlights.map(({ string: s, fret: f, state, showLabel }, idx) => {
        // Scale dots sit near the right fret bar instead of centered in the slot
        const isScaleDot = (state === 'scale' || state === 'scale-active') && f > 0;
        const cx = isScaleDot
          ? NUT_X + fretRatio(f) * totalFretW - DOT_R - 10
          : noteX(f, totalFretW);
        const cy = stringY(s);
        const cfg = HIGHLIGHT_CONFIG[state];
        const noteInfo = midiToNoteInfo(tuning[s] + f);

        return (
          <g key={idx}>
            <circle
              cx={cx}
              cy={cy}
              r={DOT_R}
              fill={cfg.fill}
              stroke={cfg.stroke}
              strokeWidth={cfg.strokeWidth}
              style={{
                filter: state === 'correct' || state === 'scale-active'
                  ? 'drop-shadow(0 0 6px rgba(34,197,94,0.6))'
                  : state === 'wrong'
                  ? 'drop-shadow(0 0 6px rgba(239,68,68,0.6))'
                  : state === 'target'
                  ? 'drop-shadow(0 0 6px rgba(245,166,35,0.5))'
                  : state === 'scale'
                  ? 'drop-shadow(0 0 3px rgba(161,161,170,0.3))'
                  : undefined,
              }}
            />
            {showLabel && (
              <text
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                fontSize={9}
                fill={cfg.textFill}
                fontFamily="sans-serif"
                fontWeight="600"
              >
                {noteInfo.en}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
