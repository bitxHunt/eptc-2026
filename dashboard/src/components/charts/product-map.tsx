import { CartesianGrid, ReferenceArea, ReferenceLine, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts"

import { LegendMark, Mark } from "@/components/charts/mark"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { data, type Product } from "@/lib/data"
import { fmtModulus } from "@/lib/format"
import { CLASS_COLOR, tim1Class, tim1Products, tim1Shape, tim2Products } from "@/lib/materials"

const config = { tim1: { label: "TIM-1" }, tim2: { label: "TIM-2" } } satisfies ChartConfig

interface Pt {
  E: number
  k: number
  product?: Product
  layer?: 1 | 2
}

function points(list: Product[], layer: 1 | 2): Pt[] {
  return list.flatMap((p) => p.E.map((E) => ({ E, k: p.k, product: p, layer })))
}

/** Granta-style property map: conductivity against modulus, best region shaded. */
export function ProductMap() {
  const front = data.front.map((f) => ({ E: f.E1, k: f.k1 }))

  return (
    <div className="flex flex-col gap-3">
      <ChartContainer config={config} className="aspect-auto h-[380px] w-full">
        <ScatterChart margin={{ top: 8, right: 16, bottom: 22, left: 8 }}>
          <CartesianGrid vertical={false} />
          <ReferenceArea x1={0.005} x2={1} y1={20} y2={100} fill="var(--primary)" fillOpacity={0.08} stroke="none"
            label={{ value: "Target: high k, low E", position: "insideTopLeft", className: "fill-muted-foreground text-xs" }} />
          <XAxis type="number" dataKey="E" scale="log" domain={[0.005, 50000]} ticks={[0.01, 0.1, 1, 10, 100, 1000, 10000]}
            tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}k` : String(v))} tickLine={false} axisLine={false}
            allowDataOverflow
            label={{ value: "Young's modulus E (MPa)", position: "insideBottom", offset: -14, className: "fill-muted-foreground text-xs" }} />
          <YAxis type="number" dataKey="k" scale="log" domain={[1, 100]} ticks={[1, 3, 10, 30, 100]} tickLine={false} axisLine={false}
            width={44} allowDataOverflow
            label={{ value: "k (W/mK)", angle: -90, position: "insideLeft", offset: 6, className: "fill-muted-foreground text-xs" }} />
          {[...tim1Products, ...tim2Products]
            .filter((p) => p.E.length > 1)
            .map((p) => (
              <ReferenceLine key={p.name} segment={[{ x: p.E[0], y: p.k }, { x: p.E[p.E.length - 1], y: p.k }]}
                stroke={tim1Products.includes(p) ? CLASS_COLOR[tim1Class(p.name)] : "var(--muted-foreground)"} strokeWidth={2} />
            ))}
          <Tooltip cursor={false} isAnimationActive={false} content={<ProductTooltip />} />
          <Scatter data={front} isAnimationActive={false} fill="var(--muted-foreground)" fillOpacity={0.45}
            shape={(p: unknown) => { const { cx, cy } = p as { cx: number; cy: number }; return <circle cx={cx} cy={cy} r={2.5} fill="var(--muted-foreground)" fillOpacity={0.5} /> }} />
          <Scatter data={points(tim2Products, 2)} isAnimationActive={false}
            shape={(p: unknown) => {
              const { cx, cy } = p as { cx: number; cy: number }
              return <circle cx={cx} cy={cy} r={4.5} fill="var(--card)" stroke="var(--muted-foreground)" strokeWidth={1.5} />
            }} />
          <Scatter data={points(tim1Products, 1)} isAnimationActive={false}
            shape={(p: unknown) => {
              const { cx, cy, payload } = p as { cx: number; cy: number; payload: Pt }
              const name = payload.product!.name
              return <Mark shape={tim1Shape(name)} x={cx} y={cy} r={5.5} fill={CLASS_COLOR[tim1Class(name)]} stroke="var(--card)" strokeWidth={1.5} />
            }} />
        </ScatterChart>
      </ChartContainer>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {tim1Products.map((p) => (
          <span key={p.name} className="inline-flex items-center gap-1.5">
            <LegendMark shape={tim1Shape(p.name)} color={CLASS_COLOR[tim1Class(p.name)]} />
            {p.name}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <LegendMark shape="circle" color="var(--muted-foreground)" filled={false} />
          TIM-2 products
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="14" height="14" aria-hidden><circle cx="7" cy="7" r="2.5" fill="var(--muted-foreground)" opacity={0.6} /></svg>
          Surrogate optimum
        </span>
      </div>
    </div>
  )
}

function ProductTooltip({ active, payload }: { active?: boolean; payload?: { payload: Pt }[] }) {
  if (!active || !payload?.length) return null
  const pt = payload[0].payload
  return (
    <div className="tabular grid gap-1 rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
      {pt.product ? (
        <>
          <span className="font-medium">{pt.product.name}</span>
          <span className="text-muted-foreground">TIM-{pt.layer} · k {pt.k} W/mK · E {fmtModulus(pt.E)}</span>
          <span className="max-w-64 text-muted-foreground">{pt.product.basis.replaceAll("_", " ").replaceAll(";", " · ")}</span>
        </>
      ) : (
        <>
          <span className="font-medium">Surrogate optimum</span>
          <span className="text-muted-foreground">k {pt.k.toFixed(1)} W/mK · E {fmtModulus(pt.E)}. No tested product.</span>
        </>
      )}
    </div>
  )
}
