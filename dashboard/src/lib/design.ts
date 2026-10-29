import { data, type Design, type Run } from "@/lib/data"
import { tim1Products, tim2Products } from "@/lib/materials"

export const CUSTOM = "custom"

/** What the explorer controls hold. k2 and a2 follow the TIM-2 product. */
export interface DesignState {
  tim1: string // product name or CUSTOM
  k1: number
  E1: number
  a1: number
  blt1: number
  tim2: string
  E2: number
  blt2: number
}

export function stateFromRun(r: Run): DesignState {
  return { tim1: r.tim1, k1: r.k1, E1: r.E1, a1: r.a1, blt1: r.blt1, tim2: r.tim2, E2: r.E2, blt2: r.blt2 }
}

export function toDesign(s: DesignState): Design {
  const t2 = tim2Products.find((p) => p.name === s.tim2) ?? tim2Products[0]
  return { k1: s.k1, E1: s.E1, a1: s.a1, blt1: s.blt1, k2: t2.k, E2: s.E2, a2: t2.cte[0], blt2: s.blt2 }
}

/** Slider span for an input, given the chosen products: [lo, hi, log scale]. */
export function span(s: DesignState, key: "k1" | "E1" | "a1" | "E2"): [number, number, boolean] {
  const t1 = tim1Products.find((p) => p.name === s.tim1)
  const t2 = tim2Products.find((p) => p.name === s.tim2) ?? tim2Products[0]
  const [lo, hi] = data.inputs[key]
  if (key === "k1") return t1 ? [t1.k, t1.k, true] : [lo, hi, true]
  if (key === "E1") return t1 ? [t1.E[0], t1.E[t1.E.length - 1], true] : [lo, hi, true]
  if (key === "a1") return t1 ? [t1.cte[0], t1.cte[t1.cte.length - 1], false] : [lo, hi, false]
  return [t2.E[0], t2.E[t2.E.length - 1], true]
}

export function toSlider(v: number, [lo, hi, log]: [number, number, boolean]): number {
  if (lo === hi) return 500
  const f = log ? (Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)) : (v - lo) / (hi - lo)
  return Math.round(Math.min(1, Math.max(0, f)) * 1000)
}

export function fromSlider(pos: number, [lo, hi, log]: [number, number, boolean]): number {
  if (lo === hi) return lo
  const f = pos / 1000
  return log ? 10 ** (Math.log10(lo) + f * (Math.log10(hi) - Math.log10(lo))) : lo + f * (hi - lo)
}

/** A solved run with exactly this design, if any. */
export function matchingRun(d: Design): Run | undefined {
  return data.runs.find((r) =>
    data.input_cols.every((c) => Math.abs(r[c] - d[c]) <= 1e-3 * Math.max(1, Math.abs(d[c]))),
  )
}

/** The solved run closest to a design, on the same log / linear scales the surrogate uses. */
export function nearestRun(d: Design): Run {
  const unit = (c: (typeof data.input_cols)[number], v: number) => {
    const [lo, hi, scale] = data.inputs[c]
    if (scale === "fixed") return 0
    return scale === "log" ? (Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)) : (v - lo) / (hi - lo)
  }
  const dist = (r: Run) => data.input_cols.reduce((s, c) => s + (unit(c, r[c]) - unit(c, d[c])) ** 2, 0)
  return data.runs.reduce((a, b) => (dist(b) < dist(a) ? b : a))
}

/** Values Ansys actually ran for a slider, given the chosen products: the slider snaps to these. */
export function testedValues(s: DesignState, key: "E1" | "a1" | "E2"): number[] {
  const t1 = tim1Products.find((p) => p.name === s.tim1)
  const t2 = tim2Products.find((p) => p.name === s.tim2)
  if (key === "E2") return t2?.E ?? []
  if (!t1) return []
  return key === "E1" ? t1.E : t1.cte
}

/** Distance in (log k, log E) to the nearest tested TIM-1 product: large means the GP extrapolates. */
export function distanceToProducts(d: Design): number {
  return Math.min(
    ...tim1Products.flatMap((p) => p.E.map((e) => Math.hypot(Math.log10(d.k1 / p.k), Math.log10(d.E1 / e) / 2))),
  )
}
