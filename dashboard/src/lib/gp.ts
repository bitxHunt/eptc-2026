// Gaussian process mean, evaluated in the browser. Mirrors export_predict() in
// scripts/export_data.py, which checks it against scikit-learn on every export.
import { data, type Design, type OutputKey } from "@/lib/data"

const SQRT5 = Math.sqrt(5)

function toUnit(x: Design): number[] {
  return data.input_cols.map((c) => {
    const [lo, hi, scale] = data.inputs[c]
    if (scale === "fixed") return 0
    if (scale === "log") return (Math.log10(x[c]) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))
    return (x[c] - lo) / (hi - lo)
  })
}

export type Prediction = Record<OutputKey, number> & { stress_obj: number }

export function predict(x: Design): Prediction {
  const u = toUnit(x)
  const out = {} as Record<string, number>
  for (const [col, g] of Object.entries(data.gp)) {
    let m = 0
    for (let i = 0; i < g.X.length; i++) {
      const xi = g.X[i]
      let d2 = 0
      for (let j = 0; j < u.length; j++) {
        const t = (u[j] - xi[j]) / g.ls[j]
        d2 += t * t
      }
      const d = Math.sqrt(d2)
      m += g.c * (1 + SQRT5 * d + (5 / 3) * d2) * Math.exp(-SQRT5 * d) * g.alpha[i]
    }
    const y = m * g.ys + g.ym
    out[col] = g.log ? 10 ** y : y
  }
  out.stress_obj = Math.max(...data.stress_cols.map((c) => out[c]))
  return out as Prediction
}
