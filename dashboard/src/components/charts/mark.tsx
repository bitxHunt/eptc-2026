import type { MarkShape } from "@/lib/materials"

/** One scatter mark. Shapes keep identity readable without colour. */
export function Mark({
  shape,
  x,
  y,
  r = 5,
  ...rest
}: { shape: MarkShape; x: number; y: number; r?: number } & React.SVGProps<SVGElement>) {
  const p = rest as React.SVGProps<SVGPolygonElement>
  if (shape === "circle") return <circle cx={x} cy={y} r={r} {...(rest as React.SVGProps<SVGCircleElement>)} />
  if (shape === "square")
    return <rect x={x - r * 0.88} y={y - r * 0.88} width={r * 1.76} height={r * 1.76} rx={1.5} {...(rest as React.SVGProps<SVGRectElement>)} />
  const pts =
    shape === "triangle"
      ? [[x, y - r * 1.15], [x + r * 1.05, y + r * 0.75], [x - r * 1.05, y + r * 0.75]]
      : [[x, y - r * 1.3], [x + r * 1.05, y], [x, y + r * 1.3], [x - r * 1.05, y]]
  return <polygon points={pts.map((q) => q.join(",")).join(" ")} {...p} />
}

export function LegendMark({ shape, color, filled = true }: { shape: MarkShape; color: string; filled?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="shrink-0 overflow-visible">
      <Mark shape={shape} x={7} y={7} r={4.5} fill={filled ? color : "none"} stroke={color} strokeWidth={1.5} />
    </svg>
  )
}
