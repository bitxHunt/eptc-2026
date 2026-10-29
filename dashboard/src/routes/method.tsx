import { createFileRoute } from "@tanstack/react-router"

import { Page, PageHeader, Panel } from "@/components/page"
import { data } from "@/lib/data"

export const Route = createFileRoute("/method")({ component: Method })

const SETUP: [string, string][] = [
  ["Package", "65 × 65 mm flip-chip BGA, 20 × 20 mm die, lid, heat sink"],
  ["Load", `${data.power_w} W on the die, steady state`],
  ["Cooling", `Film coefficient 150 W/m²K to ${data.t_amb_c} °C on the heat sink`],
  ["Structure", "3-2-1 support, stress-free at 25 °C, thermal result imported"],
  ["Solver", "Ansys Workbench and Mechanical 2026 R1, about 2.5 min per design"],
  ["Design set", `${data.n_total} designs: 16 product pairs × 9, ${data.n_train} train, ${data.n_holdout} hold-out`],
  ["Surrogate", "One Gaussian process per output, Matérn 5/2, stresses learned as log10"],
  ["Search", "NSGA-II on the surrogate: minimise θJC and the worse TIM edge shear"],
]

const LIMITS: [string, string][] = [
  ["Perfect bonding", "No contact resistance, so θJC is 3 to 7 times below measured values (Hu et al., 0.10–0.23 °C/W). Rankings hold; absolute values are optimistic."],
  ["Linear elastic TIMs", "Indium shows 45–66 MPa edge shear. Real indium yields at a few MPa and creeps, so that stress is an upper bound."],
  ["Bond line", "Applied by scaling k and E by t_model / t_real. Exact for conduction, approximate for shear. Real-geometry checks pending."],
  ["Material data", "k from datasheets, CTE assumed, E swept where no datasheet value exists. Silver paste k and E are scenario values."],
  ["Surrogate range", "Hold-out runs share product pairs with training. Far from the tested products, predictions are extrapolation."],
]

const TERMS: [string, string][] = [
  ["θJC", "(Tj − Tcase) / 400 W, junction-to-case resistance"],
  ["Tj, Tcase", "Max die temperature; lid top at the centre"],
  ["Edge shear", "Max shear on a 1 mm path 0.5–1.5 mm in from the TIM corner, mid-plane"],
  ["Warpage", "Substrate max − min vertical displacement"],
  ["Pareto set", "Runs no other run beats on both θJC and edge shear"],
  ["Sobol index", "Share of an output's variation one input explains alone"],
]

function Method() {
  return (
    <Page>
      <PageHeader title="Method and limits" description="How the numbers were made, and where they stop being reliable." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Setup">
          <DefList rows={SETUP} />
        </Panel>
        <Panel title="Limits">
          <DefList rows={LIMITS} />
        </Panel>
        <Panel title="Terms" className="lg:col-span-2">
          <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {TERMS.map(([t, d]) => (
              <div key={t}>
                <dt className="font-medium">{t}</dt>
                <dd className="text-muted-foreground">{d}</dd>
              </div>
            ))}
          </dl>
          <p className="border-t pt-3 text-xs text-muted-foreground">
            Validation reference: Hu et al., “High Power Large Size HFCBGA Thermal Characterization”, EPTC 2019.
          </p>
        </Panel>
      </div>
    </Page>
  )
}

function DefList({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-[9rem_1fr]">
      {rows.map(([t, d]) => (
        <div key={t} className="contents">
          <dt className="font-medium">{t}</dt>
          <dd className="text-muted-foreground">{d}</dd>
        </div>
      ))}
    </dl>
  )
}
