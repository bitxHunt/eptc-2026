// Typed access to src/data/dashboard.json, written by scripts/export_data.py.
import raw from "@/data/dashboard.json"

export type InputKey = "k1" | "E1" | "a1" | "blt1" | "k2" | "E2" | "a2" | "blt2"
export type OutputKey =
  | "Tj"
  | "Tcase"
  | "theta_jc"
  | "tim1_edge_tau_max"
  | "tim2_edge_tau_max"
  | "warpage"

export type Design = Record<InputKey, number>

export interface Run extends Design, Record<OutputKey, number> {
  run_id: string
  pair_id: string
  role: "train" | "holdout"
  tim1: string
  tim2: string
  stress_obj: number
  pareto: boolean
}

export interface Product {
  name: string
  full: string
  k: number
  E: number[] // MPa, the values swept in the design set
  cte: number[] // ppm/K
  basis: string // where each property came from, e.g. "k_from_source;CTE_assumed;..."
}

export interface Score {
  output: string
  r2: number
  rmse: number
  mape_pct: number
}

export interface ExportedGP {
  c: number
  ls: number[]
  X: number[][]
  alpha: number[]
  ym: number
  ys: number
  log: boolean
}

interface Dashboard {
  power_w: number
  t_amb_c: number
  n_total: number
  n_solved: number
  n_train: number
  n_holdout: number
  inputs: Record<InputKey, [number, number, "log" | "lin" | "fixed"]>
  input_cols: InputKey[]
  stress_cols: OutputKey[]
  tim1: Product[]
  tim2: Product[]
  runs: Run[]
  holdout_pred: ({ run_id: string } & Partial<Record<OutputKey, number>>)[]
  scores: Score[]
  sensitivity: { inputs: InputKey[] } & Record<string, number[]>
  front: (Design & { theta_jc: number; stress_obj: number })[]
  gp: Record<string, ExportedGP>
}

export const data = raw as unknown as Dashboard

export const runById = new Map(data.runs.map((r) => [r.run_id, r]))
