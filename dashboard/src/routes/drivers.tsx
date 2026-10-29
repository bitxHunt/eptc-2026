import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"

import { SensitivityChart } from "@/components/charts/sensitivity-chart"
import { InfoTip } from "@/components/info-tip"
import { Page, PageHeader, Panel } from "@/components/page"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { data, type InputKey } from "@/lib/data"
import { INPUT, OUTPUT } from "@/lib/format"

export const Route = createFileRoute("/drivers")({ component: Drivers })

const OUTPUTS = ["theta_jc", "Tj", "tim1_edge_tau_max", "tim2_edge_tau_max", "warpage"] as const

function topDriver(output: string): { key: InputKey; share: number } {
  const v = data.sensitivity[output]
  const i = v.indexOf(Math.max(...v))
  return { key: data.sensitivity.inputs[i], share: Math.min(1, v[i]) }
}

function Drivers() {
  const [output, setOutput] = useState<(typeof OUTPUTS)[number]>("theta_jc")
  const top = topDriver(output)

  return (
    <Page>
      <PageHeader
        title="Key drivers"
        description="How much of each result's variation one input explains on its own, over the tested design range."
      >
        <Tabs value={output} onValueChange={(v) => setOutput(v as (typeof OUTPUTS)[number])}>
          <TabsList>
            {OUTPUTS.map((o) => (
              <TabsTrigger key={o} value={o}>{OUTPUT[o].label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Panel
          title={
            <>
              {OUTPUT[output].label}: share of variation by input
              <InfoTip>
                First-order Sobol index, from 20,000 surrogate samples across the tested ranges. 1 means that input alone
                explains all of the variation. What a single input does not explain comes from inputs acting together.
              </InfoTip>
            </>
          }
        >
          <SensitivityChart output={output} />
        </Panel>
        <Panel title="Reading">
          <p className="text-3xl font-semibold tracking-tight tabular">{Math.round(top.share * 100)} %</p>
          <p className="text-sm text-muted-foreground">
            of the variation in {OUTPUT[output].label} comes from <span className="font-medium text-foreground">{INPUT[top.key].label}</span> alone.
          </p>
          <ul className="mt-2 grid gap-2 border-t pt-3 text-sm text-muted-foreground">
            <li>Choose TIM-1 by conductivity first: it sets θJC.</li>
            <li>Then take the softest grade with that conductivity: modulus sets TIM-1 edge stress and most of the warpage.</li>
            <li>Bond line and CTE matter little between 30 and 50 µm.</li>
          </ul>
        </Panel>
      </div>
    </Page>
  )
}
