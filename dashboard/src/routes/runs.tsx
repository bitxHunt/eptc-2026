import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, SearchIcon } from "lucide-react"
import { useState } from "react"

import { Page, PageHeader } from "@/components/page"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { data, type Run } from "@/lib/data"
import { fmt, fmtModulus } from "@/lib/format"

export const Route = createFileRoute("/runs")({ component: Runs })

const num = (key: keyof Run, header: string, f: (v: number) => string): ColumnDef<Run> => ({
  accessorKey: key,
  header,
  cell: ({ getValue }) => f(getValue() as number),
  meta: { numeric: true },
})

const columns: ColumnDef<Run>[] = [
  { accessorKey: "run_id", header: "Run", cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() as string}</span> },
  { accessorKey: "tim1", header: "TIM-1" },
  num("E1", "E1", fmtModulus),
  num("blt1", "BLT1 µm", String),
  { accessorKey: "tim2", header: "TIM-2" },
  num("blt2", "BLT2 µm", String),
  num("theta_jc", "θJC °C/W", (v) => fmt(v, "theta_jc")),
  num("Tj", "Tj °C", (v) => fmt(v, "Tj")),
  num("tim1_edge_tau_max", "TIM-1 shear MPa", (v) => fmt(v)),
  num("tim2_edge_tau_max", "TIM-2 shear MPa", (v) => fmt(v)),
  num("warpage", "Warpage µm", (v) => fmt(v, "warpage")),
  {
    id: "tags",
    header: "",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex justify-end gap-1">
        {row.original.pareto && <Badge variant="secondary">Pareto</Badge>}
        {row.original.role === "holdout" && <Badge variant="outline">Hold-out</Badge>}
      </div>
    ),
  },
]

function Runs() {
  const navigate = useNavigate()
  const [sorting, setSorting] = useState<SortingState>([{ id: "theta_jc", desc: false }])
  const [query, setQuery] = useState("")
  const table = useReactTable({
    data: data.runs,
    columns,
    state: { sorting, globalFilter: query },
    onSortingChange: setSorting,
    onGlobalFilterChange: setQuery,
    globalFilterFn: (row, _id, q: string) =>
      [row.original.run_id, row.original.tim1, row.original.tim2].join(" ").toLowerCase().includes(q.toLowerCase()),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })
  const rows = table.getRowModel().rows

  return (
    <Page>
      <PageHeader title="All runs" description="Every solved Ansys run. Click a column to sort, a row to open it in the explorer.">
        <div className="relative w-64">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Run, TIM-1 or TIM-2" className="pl-8" aria-label="Filter runs" />
        </div>
      </PageHeader>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="max-h-[calc(100svh-12rem)] overflow-auto">
          <Table className="tabular">
            <TableHeader className="sticky top-0 z-[1] bg-card shadow-[0_1px_0_var(--border)]">
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => {
                    const numeric = (h.column.columnDef.meta as { numeric?: boolean } | undefined)?.numeric
                    const sorted = h.column.getIsSorted()
                    return (
                      <TableHead key={h.id} className={numeric ? "text-right" : undefined}>
                        {h.column.getCanSort() ? (
                          <button
                            type="button"
                            onClick={h.column.getToggleSortingHandler()}
                            className={`inline-flex items-center gap-1 rounded hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring ${numeric ? "flex-row-reverse" : ""}`}
                          >
                            {flexRender(h.column.columnDef.header, h.getContext())}
                            {sorted === "asc" ? <ArrowUpIcon className="size-3" /> : sorted === "desc" ? <ArrowDownIcon className="size-3" /> : <ArrowUpDownIcon className="size-3 opacity-40" />}
                          </button>
                        ) : (
                          flexRender(h.column.columnDef.header, h.getContext())
                        )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((row) => (
                  <TableRow key={row.id} className="cursor-pointer" onClick={() => navigate({ to: "/explorer", search: { run: row.original.run_id } })}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className={(cell.column.columnDef.meta as { numeric?: boolean } | undefined)?.numeric ? "text-right" : undefined}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    No run matches “{query}”. Try a product name such as “PTM7950” or a run ID such as “P14”.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="tabular border-t px-4 py-2 text-xs text-muted-foreground">
          {rows.length} of {data.runs.length} runs
        </div>
      </div>
    </Page>
  )
}
