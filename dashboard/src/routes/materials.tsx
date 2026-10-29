import { createFileRoute } from "@tanstack/react-router"

import { ProductMap } from "@/components/charts/product-map"
import { Page, PageHeader, Panel } from "@/components/page"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { data, type Product } from "@/lib/data"
import { fmt, fmtModulus } from "@/lib/format"
import { tim1Products, tim2Products } from "@/lib/materials"

export const Route = createFileRoute("/materials")({ component: Materials })

// "k_from_source;CTE_assumed;E_hypothetical_sweep" -> what is measured and what is assumed
function sourceOf(basis: string): { label: string; tone: "solid" | "assumed" } {
  if (basis.includes("hypothetical") || basis.includes("upper_bound")) return { label: "Scenario values", tone: "assumed" }
  if (basis.includes("proxy")) return { label: "k from datasheet, E proxy", tone: "assumed" }
  return { label: "Published values", tone: "solid" }
}

function bestRuns(p: Product, layer: 1 | 2) {
  const runs = data.runs.filter((r) => (layer === 1 ? r.tim1 : r.tim2) === p.name)
  return {
    theta: Math.min(...runs.map((r) => r.theta_jc)),
    shear: Math.min(...runs.map((r) => (layer === 1 ? r.tim1_edge_tau_max : r.tim2_edge_tau_max))),
  }
}

function Materials() {
  return (
    <Page>
      <PageHeader
        title="Materials"
        description="The eight tested products by conductivity and stiffness. Good TIM-1 sits top left: high k cools, low E keeps edge stress down."
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Conductivity against modulus">
          <ProductMap />
          <p className="text-xs text-muted-foreground">
            Lines span the moduli swept for one product. The surrogate's optimum (k ≈ 60 W/mK, E ≈ 0.04 MPa) is a target
            for material development, not a product on the shelf.
          </p>
        </Panel>
        <Panel title="Products">
          <ProductTable title="TIM-1" list={tim1Products} layer={1} />
          <ProductTable title="TIM-2" list={tim2Products} layer={2} />
        </Panel>
      </div>
    </Page>
  )
}

function ProductTable({ title, list, layer }: { title: string; list: Product[]; layer: 1 | 2 }) {
  return (
    <Table className="tabular">
      <TableHeader>
        <TableRow>
          <TableHead>{title}</TableHead>
          <TableHead className="text-right">k</TableHead>
          <TableHead className="text-right">E tested</TableHead>
          <TableHead className="text-right">Best θJC</TableHead>
          <TableHead className="text-right">Min shear</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.map((p) => {
          const best = bestRuns(p, layer)
          const src = sourceOf(p.basis)
          return (
            <TableRow key={p.name}>
              <TableCell>
                <div className="font-medium">{p.name}</div>
                <Badge variant={src.tone === "solid" ? "secondary" : "outline"} className="mt-1 font-normal">
                  {src.label}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{p.k}</TableCell>
              <TableCell className="text-right text-xs">
                {p.E.length > 1 ? `${fmtModulus(p.E[0])} – ${fmtModulus(p.E[p.E.length - 1])}` : fmtModulus(p.E[0])}
              </TableCell>
              <TableCell className="text-right">{fmt(best.theta, "theta_jc")}</TableCell>
              <TableCell className="text-right">{fmt(best.shear)}</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
