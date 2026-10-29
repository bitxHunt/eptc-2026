import { CartesianGrid, ReferenceLine, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts"

import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { data, runById, type OutputKey } from "@/lib/data"
import { fmt, OUTPUT } from "@/lib/format"

const config = { pts: { label: "Hold-out runs", color: "var(--primary)" } } satisfies ChartConfig
const LOG: OutputKey[] = ["tim1_edge_tau_max", "tim2_edge_tau_max"]

/** Surrogate against Ansys on the hold-out runs, with the y = x line. */
export function ParityChart({ output }: { output: OutputKey }) {
  const pts = data.holdout_pred
    .map((p) => ({ id: p.run_id, ansys: runById.get(p.run_id)![output], gp: p[output]! }))
    .filter((p) => p.gp != null)
  const log = LOG.includes(output)
  const all = pts.flatMap((p) => [p.ansys, p.gp])
  let lo = Math.min(...all)
  let hi = Math.max(...all)
  let ticks: number[] | undefined
  if (log) {
    lo = 10 ** Math.floor(Math.log10(lo))
    hi = 10 ** Math.ceil(Math.log10(hi))
  } else {
    // Round the range out to a 1-2-5 step so the ticks land on readable values
    const raw = (hi - lo) / 4 || Math.abs(hi) * 0.02
    const mag = 10 ** Math.floor(Math.log10(raw))
    const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw)!
    lo = Math.floor(lo / step) * step
    hi = Math.ceil(hi / step) * step
    ticks = Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => +(lo + i * step).toPrecision(6))
  }
  const tick = (v: number) => (log ? String(+v.toPrecision(1)) : String(+v.toPrecision(4)))

  return (
    <ChartContainer config={config} className="aspect-square w-full max-w-[420px]">
      <ScatterChart margin={{ top: 8, right: 12, bottom: 22, left: 8 }}>
        <CartesianGrid />
        <XAxis type="number" dataKey="ansys" domain={[lo, hi]} ticks={ticks} scale={log ? "log" : "linear"} tickFormatter={tick}
          tickLine={false} axisLine={false} allowDataOverflow
          label={{ value: `Ansys (${OUTPUT[output].unit})`, position: "insideBottom", offset: -14, className: "fill-muted-foreground text-xs" }} />
        <YAxis type="number" dataKey="gp" domain={[lo, hi]} ticks={ticks} scale={log ? "log" : "linear"} tickFormatter={tick} width={56}
          tickLine={false} axisLine={false} allowDataOverflow
          label={{ value: "Surrogate", angle: -90, position: "insideLeft", offset: 4, className: "fill-muted-foreground text-xs" }} />
        <ReferenceLine segment={[{ x: lo, y: lo }, { x: hi, y: hi }]} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
        <Tooltip cursor={false} isAnimationActive={false}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const p = payload[0].payload as (typeof pts)[number]
            const err = (100 * (p.gp - p.ansys)) / p.ansys
            return (
              <div className="tabular grid gap-0.5 rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
                <span className="font-medium">{err >= 0 ? "+" : ""}{err.toFixed(2)} %</span>
                <span className="font-mono text-[11px] text-muted-foreground">{p.id}</span>
                <span className="text-muted-foreground">Ansys {fmt(p.ansys, output)} · surrogate {fmt(p.gp, output)}</span>
              </div>
            )
          }} />
        <Scatter data={pts} fill="var(--color-pts)" isAnimationActive={false}
          shape={(p: unknown) => { const { cx, cy } = p as { cx: number; cy: number }; return <circle cx={cx} cy={cy} r={5} fill="var(--color-pts)" stroke="var(--card)" strokeWidth={1.5} /> }} />
      </ScatterChart>
    </ChartContainer>
  )
}
