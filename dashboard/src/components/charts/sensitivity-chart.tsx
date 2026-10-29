import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart"
import { data, type InputKey } from "@/lib/data"
import { INPUT } from "@/lib/format"

const config = { share: { label: "Share of variation", color: "var(--primary)" } } satisfies ChartConfig

/** First-order Sobol indices for one output, strongest driver first. */
export function SensitivityChart({ output, top }: { output: string; top?: number }) {
  const values = data.sensitivity[output] ?? []
  const rows = data.sensitivity.inputs
    .map((k, i) => ({ key: k as InputKey, label: INPUT[k as InputKey].label, share: Math.min(1, Math.max(0, values[i])) }))
    .sort((a, b) => b.share - a.share)
    .slice(0, top)

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height: rows.length * 30 + 8 }}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 44, bottom: 0, left: 0 }} barCategoryGap={6}>
        <XAxis type="number" domain={[0, 1]} hide />
        <YAxis type="category" dataKey="label" width={132} tickLine={false} axisLine={false} className="text-xs" />
        <ChartTooltip
          cursor={false}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <div className="tabular rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
                <div className="font-medium">{(payload[0].value as number).toFixed(3)}</div>
                <div className="text-muted-foreground">of the variation, from {payload[0].payload.label} alone</div>
              </div>
            ) : null
          }
        />
        <Bar dataKey="share" fill="var(--color-share)" radius={4} isAnimationActive={false} background={{ fill: "var(--muted)", radius: 4 }}>
          <LabelList
            dataKey="share"
            position="right"
            className="tabular fill-foreground text-xs"
            formatter={(v: unknown) => ((v as number) >= 0.02 ? (v as number).toFixed(2) : "")}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
