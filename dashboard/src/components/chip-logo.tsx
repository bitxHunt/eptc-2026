import { cn } from "@/lib/utils"

const INK = "#3f3f46"
const PINS = [12.5, 16, 19.5]
// Three traces per side, the middle one longer, each ending in a pad
const TRACES = PINS.flatMap((p) => {
  const end = p === 16 ? 3.6 : 5.2
  return [
    [p, 9.5, p, end],
    [p, 22.5, p, 32 - end],
    [9.5, p, end, p],
    [22.5, p, 32 - end, p],
  ]
})

/** The team mark: a chip with pin traces. Same drawing as public/favicon.svg. */
export function ChipLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8 shrink-0", className)}>
      <rect x="0.5" y="0.5" width="31" height="31" rx="7" fill="#ffffff" stroke="#e4e4e7" />
      <g stroke={INK} strokeWidth={1.5} strokeLinecap="round">
        {TRACES.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
      </g>
      <g fill="#ffffff" stroke={INK} strokeWidth={1.2}>
        {TRACES.map(([, , x, y], i) => (
          <circle key={i} cx={x} cy={y} r={1.25} />
        ))}
      </g>
      <rect x="9.5" y="9.5" width="13" height="13" rx="2.2" fill="#ffffff" stroke={INK} strokeWidth={1.6} />
      <rect x="13.4" y="13.4" width="5.2" height="5.2" rx="0.9" fill="none" stroke={INK} strokeWidth={1.4} />
    </svg>
  )
}
