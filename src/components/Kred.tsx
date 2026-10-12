import { MARK_PATH, MARK_VIEWBOX } from './Logo';

// The Kred unit symbol — the Kredilo brand mark, sized like a lucide icon.
// Use in place of a coin icon next to kred amounts.
export function Kred({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      width={size}
      height={size}
      fill="currentColor"
      role="img"
      aria-label="kreds"
      className={`inline-block shrink-0 ${className}`}
    >
      <path fillRule="evenodd" d={MARK_PATH} />
    </svg>
  );
}

// Amount + symbol, e.g. "1,250 ⟨mark⟩". Keeps the number and symbol together.
export function KredAmount({ value, size = 15, className = '' }: { value: number; size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {value.toLocaleString()}
      <Kred size={size} />
    </span>
  );
}
