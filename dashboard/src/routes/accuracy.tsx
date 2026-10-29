import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"

import { ParityChart } from "@/components/charts/parity-chart"
import { Page, PageHeader, Panel } from "@/components/page"
import { Stat } from "@/components/stat"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { data, runById, type OutputKey } from "@/lib/data"
import { fmt, OUTPUT } from "@/lib/format"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/accuracy")({ component: Accuracy })

const OTHER_LABEL: Record<string, string> = {
  Tcase_avg: "Tcase, lid average",
  tim1_vm_avg: "TIM-1 von Mises, average",
  tim1_vm_max: "TIM-1 von Mises, max",
  tim2_vm_avg: "TIM-2 von Mises, average",
  tim2_vm_max: "TIM-2 von Mises, max",
  tim1_edge_tau_avg: "TIM-1 edge shear, path average",
  tim2_edge_tau_avg: "TIM-2 edge shear, path average",
}

const pctText = (v: number) => (v < 0.01 ? "< 0.01" : v.toFixed(2))

const MAIN: OutputKey[] = ["theta_jc", "Tj", "tim1_edge_tau_max", "tim2_edge_tau_max", "warpage"]

function worst(output: OutputKey) {
  return Math.max(
    ...data.holdout_pred.map((p) => {
      const y = runById.get(p.run_id)![output]
      return Math.abs((100 * (p[output]! - y)) / y)
    }),
  )
}

function Accuracy() {
  const [output, setOutput] = useState<OutputKey>("theta_jc")
  const score = (o: string) => data.scores.find((s) => s.output === o)!

  return (
    <Page>
      <PageHeader
        title="Surrogate accuracy"
        description={`Checked on ${data.n_holdout} Ansys runs kept out of training, one per product pair. This measures interpolation between tested designs, not new materials.`}
      />

      <section className="grid grid-cols-2 gap-x-6 gap-y-5 rounded-xl border bg-card p-4 md:p-5 lg:grid-cols-5" aria-label="Mean hold-out error">
        {MAIN.map((o) => (
          <Stat key={o} label={OUTPUT[o].label} value={pctText(score(o).mape_pct)} unit="% mean error"
            sub={`worst run ${worst(o).toFixed(1)} % · R² ${score(o).r2.toFixed(3)}`} />
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel
          title="Surrogate against Ansys"
          action={
            <Tabs value={output} onValueChange={(v) => setOutput(v as OutputKey)}>
              <TabsList>
                {MAIN.map((o) => (
                  <TabsTrigger key={o} value={o}>{OUTPUT[o].label}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          }
        >
          <div className="flex justify-center">
            <ParityChart output={output} />
          </div>
        </Panel>
        <Panel title="Every output">
          <Table className="tabular">
            <TableHeader>
              <TableRow>
                <TableHead>Output</TableHead>
                <TableHead className="text-right">R²</TableHead>
                <TableHead className="text-right">RMSE</TableHead>
                <TableHead className="text-right">Mean error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.scores.map((s) => (
                <TableRow key={s.output} className={cn(s.output === output && "bg-muted/60")}>
                  <TableCell className="font-medium">{OUTPUT[s.output as OutputKey]?.label ?? OTHER_LABEL[s.output] ?? s.output}</TableCell>
                  <TableCell className="text-right">{s.r2.toFixed(4)}</TableCell>
                  <TableCell className="text-right">{fmt(s.rmse)}</TableCell>
                  <TableCell className="text-right">{pctText(s.mape_pct)} %</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      </div>
    </Page>
  )
}
