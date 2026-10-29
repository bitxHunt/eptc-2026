import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { ArrowRightIcon } from "lucide-react"

import { SensitivityChart } from "@/components/charts/sensitivity-chart"
import { TradeoffChart } from "@/components/charts/tradeoff-chart"
import { InfoTip } from "@/components/info-tip"
import { Page, PageHeader, Panel } from "@/components/page"
import { Stat } from "@/components/stat"
import { ThermalPath } from "@/components/thermal-path"
import { buttonVariants } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { data } from "@/lib/data"
import { fmt, fmtModulus, OUTPUT } from "@/lib/format"
import { bestCooling, recommended } from "@/lib/materials"

export const Route = createFileRoute("/")({ component: Overview })

const score = (o: string) => data.scores.find((s) => s.output === o)!

function Overview() {
  const navigate = useNavigate()
  const rec = recommended
  const coolingGain = (rec.theta_jc / bestCooling.theta_jc - 1) * 100
  const stressRatio = bestCooling.stress_obj / rec.stress_obj

  return (
    <Page>
      <PageHeader
        title="TIM-1 and TIM-2 selection, 400 W flip-chip package"
        description={`${data.n_total} coupled thermal–structural Ansys runs over 16 real TIM-1 and TIM-2 product pairs, and a surrogate trained on them.`}
      />

      <section className="grid grid-cols-2 gap-x-6 gap-y-5 rounded-xl border bg-card p-4 md:p-5 lg:grid-cols-4" aria-label="Key numbers">
        <Stat
          label="Best cooling"
          value={fmt(bestCooling.theta_jc, "theta_jc")}
          unit="°C/W"
          hint={OUTPUT.theta_jc.hint}
          sub={`${bestCooling.tim1}, edge shear ${fmt(bestCooling.stress_obj)} MPa`}
        />
        <Stat
          label="Recommended design"
          value={fmt(rec.theta_jc, "theta_jc")}
          unit="°C/W"
          hint="Among Pareto runs with edge shear under 1 MPa: within 5 % of the best θJC, then the lowest Tj."
          sub={`${fmt(rec.stress_obj)} MPa edge shear · ${rec.run_id}`}
        />
        <Stat
          label="Cooling given up for it"
          value={`+${coolingGain.toFixed(0)}`}
          unit="% θJC"
          hint="Recommended design against the best-cooling run (indium)."
          sub={`for ${Math.round(stressRatio).toLocaleString()}× less edge shear`}
        />
        <Stat
          label="Surrogate error, θJC"
          value={score("theta_jc").mape_pct.toFixed(2)}
          unit="%"
          hint={`Mean error on the ${data.n_holdout} hold-out runs the surrogate never saw.`}
          sub={`${data.n_solved}/${data.n_total} runs solved · ${data.n_holdout} held out`}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel
          title={
            <>
              Cooling against TIM edge stress
              <InfoTip>
                Every solved run. Bottom left is best. Filled marks are not beaten on both axes by any other run (the
                Pareto set). Click a run to open it in the explorer.
              </InfoTip>
            </>
          }
          action={
            <Link to="/trade-off" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Explore <ArrowRightIcon />
            </Link>
          }
        >
          <TradeoffChart
            runs={data.runs}
            selectedId={rec.run_id}
            onSelect={(r) => navigate({ to: "/explorer", search: { run: r.run_id } })}
            className="h-[420px]"
          />
        </Panel>

        <Panel title="Recommended design">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">TIM-1</dt>
            <dd className="text-right font-medium">{rec.tim1}</dd>
            <dt className="text-muted-foreground">Modulus, bond line</dt>
            <dd className="tabular text-right">{fmtModulus(rec.E1)} · {rec.blt1} µm</dd>
            <dt className="text-muted-foreground">TIM-2</dt>
            <dd className="text-right font-medium">{rec.tim2}</dd>
            <dt className="text-muted-foreground">Bond line</dt>
            <dd className="tabular text-right">{rec.blt2} µm</dd>
          </dl>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <Stat label="θJC" value={fmt(rec.theta_jc, "theta_jc")} unit="°C/W" />
            <Stat label="Tj" value={fmt(rec.Tj, "Tj")} unit="°C" />
            <Stat label="TIM-1 edge shear" value={fmt(rec.tim1_edge_tau_max)} unit="MPa" />
            <Stat label="Warpage" value={fmt(rec.warpage, "warpage")} unit="µm" />
          </div>
          <ThermalPath tj={rec.Tj} tcase={rec.Tcase} />
          <p className="text-xs text-muted-foreground">
            Silver paste k and modulus are scenario values. Confirm a soft grade with the supplier.
          </p>
          <Link
            to="/explorer"
            search={{ run: rec.run_id }}
            className={buttonVariants({ variant: "outline", size: "sm", className: "w-full" })}
          >
            Open in design explorer
          </Link>
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel
          title="What sets cooling (θJC)"
          action={
            <Link to="/drivers" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              All drivers <ArrowRightIcon />
            </Link>
          }
        >
          <SensitivityChart output="theta_jc" top={3} />
        </Panel>
        <Panel title="What sets TIM-1 edge stress">
          <SensitivityChart output="tim1_edge_tau_max" top={3} />
        </Panel>
      </div>
    </Page>
  )
}
