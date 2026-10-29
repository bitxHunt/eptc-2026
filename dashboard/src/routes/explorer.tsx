import { createFileRoute } from "@tanstack/react-router"
import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react"
import { useMemo, useState } from "react"

import { TradeoffChart } from "@/components/charts/tradeoff-chart"
import { InfoTip } from "@/components/info-tip"
import { Page, PageHeader, Panel } from "@/components/page"
import { ThermalPath } from "@/components/thermal-path"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { data, runById, type OutputKey } from "@/lib/data"
import {
  CUSTOM,
  distanceToProducts,
  fromSlider,
  matchingRun,
  span,
  stateFromRun,
  toDesign,
  toSlider,
  type DesignState,
} from "@/lib/design"
import { fmt, fmtModulus, OUTPUT } from "@/lib/format"
import { predict } from "@/lib/gp"
import { recommended, tim1Products, tim2Products } from "@/lib/materials"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/explorer")({
  validateSearch: (s: Record<string, unknown>): { run?: string } =>
    typeof s.run === "string" && runById.has(s.run) ? { run: s.run } : {},
  component: Explorer,
})

const SHOWN: OutputKey[] = ["theta_jc", "Tj", "tim1_edge_tau_max", "tim2_edge_tau_max", "warpage"]

function Explorer() {
  const { run } = Route.useSearch()
  const start = runById.get(run ?? "") ?? recommended
  const [s, setS] = useState<DesignState>(() => stateFromRun(start))
  const [startId, setStartId] = useState(start.run_id)
  // Follow a new ?run= when another page links here while the explorer is open
  if (run && run !== startId && runById.has(run)) {
    setStartId(run)
    setS(stateFromRun(runById.get(run)!))
  }

  const design = useMemo(() => toDesign(s), [s])
  const p = useMemo(() => predict(design), [design])
  const match = matchingRun(design)
  const extrapolating = s.tim1 === CUSTOM && distanceToProducts(design) > 0.25
  const set = (patch: Partial<DesignState>) => setS((prev) => ({ ...prev, ...patch }))

  function chooseTim1(name: string) {
    const t = tim1Products.find((x) => x.name === name)
    if (!t) return set({ tim1: CUSTOM })
    set({ tim1: name, k1: t.k, E1: t.E[Math.floor((t.E.length - 1) / 2)], a1: t.cte[Math.floor((t.cte.length - 1) / 2)] })
  }
  function chooseTim2(name: string) {
    const t = tim2Products.find((x) => x.name === name)!
    set({ tim2: name, E2: t.E[0] })
  }

  return (
    <Page>
      <PageHeader
        title="Design explorer"
        description="Pick the TIMs and their bond lines. The surrogate predicts the result instantly, without a new Ansys run."
      >
        <Button variant="outline" size="sm" onClick={() => setS(stateFromRun(recommended))}>
          <RotateCcwIcon /> Recommended design
        </Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Panel title="Design" className="self-start">
          <Layer title="TIM-1, die to lid">
            <Field label="Product">
              <Select value={s.tim1} onValueChange={(v) => chooseTim1(String(v))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tim1Products.map((t) => (
                    <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                  ))}
                  <SelectItem value={CUSTOM}>Custom material</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <RangeField label="Conductivity k" value={`${+s.k1.toPrecision(3)} W/mK`} sp={span(s, "k1")} v={s.k1} onChange={(k1) => set({ k1 })} />
            <RangeField label="Modulus E" value={fmtModulus(s.E1)} sp={span(s, "E1")} v={s.E1} onChange={(E1) => set({ E1 })} />
            <RangeField label="CTE" value={`${s.a1.toFixed(0)} ppm/K`} sp={span(s, "a1")} v={s.a1} onChange={(a1) => set({ a1 })} />
            <RangeField label="Bond line" value={`${s.blt1} µm`} sp={[30, 50, false]} v={s.blt1} step={10} onChange={(blt1) => set({ blt1: Math.round(blt1) })} />
          </Layer>
          <Separator />
          <Layer title="TIM-2, lid to heat sink">
            <Field label="Product">
              <Select value={s.tim2} onValueChange={(v) => chooseTim2(String(v))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tim2Products.map((t) => (
                    <SelectItem key={t.name} value={t.name}>{t.name} · k {t.k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <RangeField label="Modulus E" value={fmtModulus(s.E2)} sp={span(s, "E2")} v={s.E2} onChange={(E2) => set({ E2 })} />
            <RangeField label="Bond line" value={`${s.blt2} µm`} sp={[30, 50, false]} v={s.blt2} step={10} onChange={(blt2) => set({ blt2: Math.round(blt2) })} />
          </Layer>
        </Panel>

        <div className="flex min-w-0 flex-col gap-4">
          <Panel
            title={
              <>
                Predicted result
                <InfoTip>Gaussian process trained on {data.n_train} Ansys runs. Each prediction takes under a millisecond.</InfoTip>
              </>
            }
            action={
              <span className="text-xs text-muted-foreground">
                {match ? (
                  <>Same design as Ansys run <span className="font-mono">{match.run_id}</span></>
                ) : (
                  "No Ansys run at this exact design"
                )}
              </span>
            }
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 xl:grid-cols-5">
              {SHOWN.map((k) => (
                <Output key={k} k={k} value={p[k]} ansys={match?.[k]} />
              ))}
            </div>
            <ThermalPath tj={p.Tj} tcase={p.Tcase} />
            {(extrapolating || s.tim1.startsWith("Indium")) && (
              <div className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0 text-series-2" />
                {extrapolating
                  ? "No tested product is near this k and E. The surrogate is extrapolating: read the numbers as a direction, not a result."
                  : "Indium is modelled as linear elastic. Real indium yields at a few MPa and creeps, so its edge shear is an upper bound."}
              </div>
            )}
          </Panel>

          <Panel title="Where this design sits among the runs">
            <TradeoffChart runs={data.runs} marker={p} selectedId={match?.run_id} onSelect={(r) => setS(stateFromRun(r))} className="h-[340px]" />
          </Panel>
        </div>
      </div>
    </Page>
  )
}

function Layer({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-3 text-xs font-medium tracking-wide text-muted-foreground">{title}</legend>
      {children}
    </fieldset>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  )
}

function RangeField({
  label,
  value,
  sp,
  v,
  step,
  onChange,
}: {
  label: string
  value: string
  sp: [number, number, boolean]
  v: number
  step?: number
  onChange: (v: number) => void
}) {
  const fixed = sp[0] === sp[1]
  const linearStep = step ? (step / (sp[1] - sp[0])) * 1000 : 1
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span>{label}</span>
        <span className={cn("tabular text-sm font-medium", fixed && "text-muted-foreground")}>
          {value}
          {fixed && <span className="ml-1 text-xs font-normal">(product value)</span>}
        </span>
      </div>
      <Slider
        aria-label={label}
        disabled={fixed}
        min={0}
        max={1000}
        step={linearStep}
        value={[toSlider(v, sp)]}
        onValueChange={(val) => onChange(fromSlider(Array.isArray(val) ? val[0] : (val as number), sp))}
      />
    </div>
  )
}

function Output({ k, value, ansys }: { k: OutputKey; value: number; ansys?: number }) {
  const meta = OUTPUT[k]
  const err = ansys != null ? (100 * (value - ansys)) / ansys : null
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {meta.label}
        <InfoTip label={`About ${meta.label}`}>{meta.hint}</InfoTip>
      </div>
      <div className="tabular flex items-baseline gap-1 text-2xl font-semibold tracking-tight">
        {fmt(value, k)}
        <span className="text-sm font-normal text-muted-foreground">{meta.unit}</span>
      </div>
      <div className="tabular text-xs text-muted-foreground">
        {err != null ? `Ansys ${fmt(ansys, k)} · ${err >= 0 ? "+" : ""}${err.toFixed(2)} %` : " "}
      </div>
    </div>
  )
}
