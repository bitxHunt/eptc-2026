import { CartesianGrid, ReferenceDot, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts"

import { LegendMark, Mark } from "@/components/charts/mark"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import type { Run } from "@/lib/data"
import { fmt, fmtModulus } from "@/lib/format"
import {
  CLASS_COLOR,
  CLASS_LABEL,
  tim1Class,
  tim1Products,
  tim1Shape,
  type Tim1Class,
} from "@/lib/materials"
import { cn } from "@/lib/utils"

const config = {
  silver: { label: CLASS_LABEL.silver, color: CLASS_COLOR.silver },
  solder: { label: CLASS_LABEL.solder, color: CLASS_COLOR.solder },
  gel: { label: CLASS_LABEL.gel, color: CLASS_COLOR.gel },
} satisfies ChartConfig

const Y_TICKS = [0.001, 0.01, 0.1, 1, 10, 100]

interface Point extends Run {
  cls: Tim1Class
}

export function TradeoffChart({
  runs,
  marker,
  selectedId,
  onSelect,
  className,
}: {
  runs: Run[]
  marker?: { theta_jc: number; stress_obj: number }
  selectedId?: string
  onSelect?: (run: Run) => void
  className?: string
}) {
  const groups = (["silver", "solder", "gel"] as Tim1Class[]).map((cls) => ({
    cls,
    points: runs.filter((r) => tim1Class(r.tim1) === cls).map((r) => ({ ...r, cls })),
  }))

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <ChartContainer config={config} className="aspect-auto h-full min-h-72 w-full">
        <ScatterChart margin={{ top: 8, right: 12, bottom: 22, left: 8 }}>
          <CartesianGrid strokeDasharray="0" vertical={false} />
          <XAxis
            type="number"
            dataKey="theta_jc"
            domain={[0.008, 0.06]}
            ticks={[0.01, 0.02, 0.03, 0.04, 0.05, 0.06]}
            tickFormatter={(v: number) => v.toFixed(2)}
            tickLine={false}
            axisLine={false}
            label={{ value: "θJC (°C/W), lower cools better", position: "insideBottom", offset: -14, className: "fill-muted-foreground text-xs" }}
          />
          <YAxis
            type="number"
            dataKey="stress_obj"
            scale="log"
            domain={[0.001, 100]}
            ticks={Y_TICKS}
            allowDataOverflow
            tickFormatter={(v: number) => (v < 0.01 ? "0.001" : String(v))}
            tickLine={false}
            axisLine={false}
            width={52}
            label={{ value: "Edge shear (MPa)", angle: -90, position: "insideLeft", offset: 4, className: "fill-muted-foreground text-xs" }}
          />
          <Tooltip cursor={false} content={<RunTooltip />} isAnimationActive={false} />
          {groups.map(({ cls, points }) => (
            <Scatter
              key={cls}
              name={CLASS_LABEL[cls]}
              data={points}
              isAnimationActive={false}
              onClick={(p: unknown) => onSelect?.(p as Run)}
              className={onSelect ? "cursor-pointer" : undefined}
              shape={(props: unknown) => {
                const { cx, cy, payload } = props as { cx: number; cy: number; payload: Point }
                const selected = payload.run_id === selectedId
                return (
                  <Mark
                    shape={tim1Shape(payload.tim1)}
                    x={cx}
                    y={cy}
                    r={selected ? 7 : 5}
                    // Non-Pareto runs are outlines: designs that differ only in TIM-2 land on top of
                    // each other, and stacked translucent fills would read as solid
                    fill={payload.pareto || selected ? CLASS_COLOR[cls] : "none"}
                    stroke={selected ? "var(--foreground)" : payload.pareto ? "var(--card)" : CLASS_COLOR[cls]}
                    strokeOpacity={payload.pareto || selected ? 1 : 0.55}
                    strokeWidth={selected ? 2 : 1.25}
                  />
                )
              }}
            />
          ))}
          {marker && (
            <ReferenceDot
              x={marker.theta_jc}
              y={Math.max(marker.stress_obj, 0.001)}
              ifOverflow="extendDomain"
              shape={(p: unknown) => {
                const { cx, cy } = p as { cx: number; cy: number }
                return (
                  <g stroke="var(--foreground)" strokeWidth={2} strokeLinecap="round">
                    <circle cx={cx} cy={cy} r={9} fill="none" strokeWidth={1.5} />
                    <path d={`M${cx - 14} ${cy}H${cx - 5}M${cx + 5} ${cy}H${cx + 14}M${cx} ${cy - 14}V${cy - 5}M${cx} ${cy + 5}V${cy + 14}`} />
                  </g>
                )
              }}
            />
          )}
        </ScatterChart>
      </ChartContainer>
      <TradeoffLegend showMarker={!!marker} />
    </div>
  )
}

export function TradeoffLegend({ showMarker }: { showMarker?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {tim1Products.map((p) => (
        <span key={p.name} className="inline-flex items-center gap-1.5">
          <LegendMark shape={tim1Shape(p.name)} color={CLASS_COLOR[tim1Class(p.name)]} />
          {p.name}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <LegendMark shape="circle" color="var(--muted-foreground)" filled={false} />
        Outline: beaten by another run
      </span>
      {showMarker && (
        <span className="inline-flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <path d="M1 7H13M7 1V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Your design
        </span>
      )}
    </div>
  )
}

function RunTooltip({ active, payload }: { active?: boolean; payload?: { payload: Run }[] }) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload
  if (!r.run_id) return null
  return (
    <div className="tabular grid min-w-52 gap-1.5 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-mono text-[11px] text-muted-foreground">{r.run_id}</span>
        {r.pareto && <span className="text-[11px] font-medium text-primary">Pareto</span>}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        <span className="text-muted-foreground">θJC</span>
        <span className="text-right font-medium">{fmt(r.theta_jc, "theta_jc")} °C/W</span>
        <span className="text-muted-foreground">Edge shear</span>
        <span className="text-right font-medium">{fmt(r.stress_obj)} MPa</span>
        <span className="text-muted-foreground">Tj</span>
        <span className="text-right">{fmt(r.Tj, "Tj")} °C</span>
      </div>
      <div className="border-t pt-1.5 text-muted-foreground">
        {r.tim1} · {fmtModulus(r.E1)} · {r.blt1} µm
        <br />
        {r.tim2} · {r.blt2} µm
      </div>
    </div>
  )
}
