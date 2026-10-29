import { cn } from "@/lib/utils"

/** The team mark: the flip-chip stack in side view. Same drawing as public/favicon.svg. */
export function ChipLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8 shrink-0", className)}>
      <rect x="0.5" y="0.5" width="31" height="31" rx="7" fill="#ffffff" stroke="#e4e4e7" />
      <g fill="#3f3f46">
        {[7, 11, 15, 19, 23].map((x) => (
          <rect key={x} x={x} y="4.5" width="2" height="4.5" rx="0.6" />
        ))}
        <rect x="6" y="8.5" width="20" height="2.2" rx="0.6" />
      </g>
      <rect x="7" y="11.3" width="18" height="1.2" rx="0.5" fill="#eb6834" />
      <path d="M5.5 13.2h21v2.4h-1.8v4.6h-2v-4.6h-13.4v4.6h-2v-4.6H5.5z" fill="#2a78d6" />
      <rect x="11" y="16.2" width="10" height="1.1" rx="0.5" fill="#eb6834" />
      <rect x="11" y="17.8" width="10" height="2.4" rx="0.5" fill="#18181b" />
      <rect x="5" y="20.8" width="22" height="2.6" rx="0.8" fill="#1baf7a" />
      <g fill="#71717a">
        {[8, 12, 16, 20, 24].map((x) => (
          <circle key={x} cx={x} cy="25.4" r="1.15" />
        ))}
      </g>
    </svg>
  )
}
