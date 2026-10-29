import type { InputKey, OutputKey } from "@/lib/data"

export const OUTPUT: Record<OutputKey | "stress_obj", { label: string; unit: string; hint: string }> = {
  theta_jc: {
    label: "θJC",
    unit: "°C/W",
    hint: "Junction-to-case resistance, (Tj − Tcase) / 400 W. Lower cools better, and it does not depend on the heat sink.",
  },
  Tj: { label: "Tj", unit: "°C", hint: "Junction temperature: the hottest point on the die." },
  Tcase: { label: "Tcase", unit: "°C", hint: "Lid top temperature at the centre, above the die." },
  tim1_edge_tau_max: {
    label: "TIM-1 edge shear",
    unit: "MPa",
    hint: "Max shear on a 1 mm path 0.5–1.5 mm in from the TIM-1 corner, at mid-plane. Delamination starts here; starting 0.5 mm in avoids the corner singularity.",
  },
  tim2_edge_tau_max: {
    label: "TIM-2 edge shear",
    unit: "MPa",
    hint: "The same edge-path max shear, in TIM-2.",
  },
  warpage: { label: "Warpage", unit: "µm", hint: "Substrate bow: max − min vertical displacement." },
  stress_obj: {
    label: "Edge shear (worse TIM)",
    unit: "MPa",
    hint: "The higher of the TIM-1 and TIM-2 edge shear. This is the stress objective of the optimisation.",
  },
}

export const INPUT: Record<InputKey, { label: string; unit: string }> = {
  k1: { label: "TIM-1 conductivity", unit: "W/mK" },
  E1: { label: "TIM-1 modulus", unit: "MPa" },
  a1: { label: "TIM-1 CTE", unit: "ppm/K" },
  blt1: { label: "TIM-1 bond line", unit: "µm" },
  k2: { label: "TIM-2 conductivity", unit: "W/mK" },
  E2: { label: "TIM-2 modulus", unit: "MPa" },
  a2: { label: "TIM-2 CTE", unit: "ppm/K" },
  blt2: { label: "TIM-2 bond line", unit: "µm" },
}

export function fmt(v: number | null | undefined, key?: string): string {
  if (v == null || !Number.isFinite(v)) return "–"
  if (key === "theta_jc") return v.toFixed(4)
  if (key === "Tj" || key === "Tcase" || key === "warpage") return v.toFixed(1)
  const a = Math.abs(v)
  if (a >= 100) return v.toFixed(0)
  if (a >= 10) return v.toFixed(1)
  if (a >= 1) return v.toFixed(2)
  if (a >= 0.01) return v.toFixed(3)
  return v.toPrecision(2)
}

export function fmtModulus(mpa: number): string {
  if (mpa >= 1000) return `${(mpa / 1000).toPrecision(3)} GPa`
  if (mpa >= 1) return `${+mpa.toPrecision(3)} MPa`
  return `${+(mpa * 1000).toPrecision(3)} kPa`
}

export function pct(v: number, digits = 2): string {
  return `${v.toFixed(digits)} %`
}
