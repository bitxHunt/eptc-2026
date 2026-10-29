import { createFileRoute, Link } from "@tanstack/react-router"
import { useMemo, useState } from "react"

import { TradeoffChart } from "@/components/charts/tradeoff-chart"
import { Page, PageHeader, Panel } from "@/components/page"
import { buttonVariants } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { data, type Run } from "@/lib/data"
import { fmt, fmtModulus } from "@/lib/format"
import { tim2Products } from "@/lib/materials"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/trade-off")({ component: TradeOff })

const ALL = "all"

function TradeOff() {
  const [tim2, setTim2] = useState<string>(ALL)
  const [selected, setSelected] = useState<Run | undefined>()

  const runs = useMemo(() => data.runs.filter((r) => tim2 === ALL || r.tim2 === tim2), [tim2])
  const pareto = runs.filter((r) => r.pareto).sort((a, b) => a.theta_jc - b.theta_jc)

  return (
    <Page>
      <PageHeader
        title="Trade-off"
        description="Better cooling costs stress. Filled marks are the Pareto set: no other run beats them on both axes."
      >
        <ToggleGroup
          variant="outline"
          size="sm"
          value={[tim2]}
          onValueChange={(v) => setTim2((v as string[])[0] ?? ALL)}
          aria-label="Filter by TIM-2 product"
        >
          <ToggleGroupItem value={ALL}>All TIM-2</ToggleGroupItem>
          {tim2Products.map((t) => (
            <ToggleGroupItem key={t.name} value={t.name}>
              {t.name.replace("Honeywell ", "").replace("Bergquist ", "")}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel title={`${runs.length} runs`}>
          <TradeoffChart runs={runs} selectedId={selected?.run_id} onSelect={setSelected} className="h-[520px]" />
        </Panel>

        <Panel
          title={`Pareto set · ${pareto.length} runs`}
          action={
            selected && (
              <Link to="/explorer" search={{ run: selected.run_id }} className={buttonVariants({ size: "sm" })}>
                Open {selected.run_id}
              </Link>
            )
          }
        >
          <div className="-mx-1 max-h-[520px] overflow-auto">
            <Table className="tabular">
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead>TIM-1</TableHead>
                  <TableHead>TIM-2</TableHead>
                  <TableHead className="text-right">θJC</TableHead>
                  <TableHead className="text-right">Shear</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pareto.map((r) => (
                  <TableRow
                    key={r.run_id}
                    data-state={selected?.run_id === r.run_id ? "selected" : undefined}
                    className="cursor-pointer"
                    onClick={() => setSelected(r)}
                  >
                    <TableCell>
                      <div className="font-medium">{r.tim1}</div>
                      <div className="text-xs text-muted-foreground">{fmtModulus(r.E1)} · {r.blt1} µm</div>
                    </TableCell>
                    <TableCell>
                      <div>{r.tim2.replace("Honeywell ", "").replace("Bergquist ", "")}</div>
                      <div className="text-xs text-muted-foreground">{r.blt2} µm</div>
                    </TableCell>
                    <TableCell className="text-right">{fmt(r.theta_jc, "theta_jc")}</TableCell>
                    <TableCell className={cn("text-right", r.stress_obj > 1 && "text-series-2")}>{fmt(r.stress_obj)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">θJC in °C/W, edge shear in MPa (worse of the two TIMs).</p>
        </Panel>
      </div>
    </Page>
  )
}
