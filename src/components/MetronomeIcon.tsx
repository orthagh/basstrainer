/**
 * Flat-style metronome SVG icon.
 * Designed to match lucide icon conventions (size, stroke, etc).
 */

interface MetronomeIconProps {
  size?: number;
  className?: string;
}

export default function MetronomeIcon({
  size = 18,
  className,
}: MetronomeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Metronome body (trapezoid) */}
      <path d="M5 21h14l-3-18H8L5 21z" />
      {/* Pendulum arm */}
      <line x1="12" y1="16" x2="16" y2="4" />
      {/* Pivot dot */}
      <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none" />
      {/* Base line */}
      <line x1="4" y1="21" x2="20" y2="21" />
    </svg>
  );
}
