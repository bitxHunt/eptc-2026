// The design explorer's logic, checked against the 144 real runs and random designs.
import { describe, expect, it } from "vitest"

import { data, type Design } from "@/lib/data"
import {
  CUSTOM,
  fromSlider,
  matchingRun,
  nearestRun,
  snapValue,
  span,
  stateFromRun,
  testedValues,
  toDesign,
  toSlider,
  type DesignState,
} from "@/lib/design"
import { predict } from "@/lib/gp"
import { tim1Products, tim2Products } from "@/lib/materials"

const rel = (a: number, b: number) => Math.abs(a - b) / Math.abs(b)

describe("loading a run", () => {
  it("rebuilds every run's design exactly, so the explorer recognises it", () => {
    for (const r of data.runs) {
      const d = toDesign(stateFromRun(r))
      for (const c of data.input_cols) expect(rel(d[c], r[c])).toBeLessThan(1e-9)
      const m = matchingRun(d)
      expect(m).toBeDefined()
      for (const c of data.input_cols) expect(rel(m![c], r[c])).toBeLessThan(1e-3)
    }
  })

  it("predicts the training runs within 1 % and the hold-out runs within 2 % on θJC", () => {
    for (const r of data.runs) {
      const p = predict(toDesign(stateFromRun(r)))
      expect(rel(p.theta_jc, r.theta_jc)).toBeLessThan(r.role === "train" ? 0.01 : 0.02)
      expect(rel(p.Tj, r.Tj)).toBeLessThan(0.01)
    }
  })
})

describe("closest run", () => {
  it("only compares runs with the same TIM-1 and TIM-2 products", () => {
    for (const r of data.runs) {
      const s: DesignState = { ...stateFromRun(r), E1: r.E1 * 1.7, blt2: r.blt2 === 50 ? 40 : 50 }
      const n = nearestRun(toDesign(s), s)
      expect(n.tim1).toBe(r.tim1)
      expect(n.tim2).toBe(r.tim2)
    }
  })

  it("falls back to every run for a custom TIM-1, keeping the TIM-2 product", () => {
    const s: DesignState = { ...stateFromRun(data.runs[0]), tim1: CUSTOM, k1: 50, E1: 0.05 }
    expect(nearestRun(toDesign(s), s).tim2).toBe(s.tim2)
  })
})

describe("sliders", () => {
  it("map values to positions and back", () => {
    for (const t1 of tim1Products) {
      const s = { ...stateFromRun(data.runs.find((r) => r.tim1 === t1.name)!) }
      for (const key of ["E1", "a1"] as const) {
        const sp = span(s, key)
        for (const v of testedValues(s, key)) {
          if (sp[0] === sp[1]) continue
          expect(rel(fromSlider(toSlider(v, sp), sp), v)).toBeLessThan(0.02)
        }
      }
    }
  })

  it("snap onto every tested value from nearby positions, and not from far away", () => {
    for (const t1 of tim1Products) {
      const s = stateFromRun(data.runs.find((r) => r.tim1 === t1.name)!)
      for (const key of ["E1", "a1"] as const) {
        const sp = span(s, key)
        if (sp[0] === sp[1]) continue
        const snaps = testedValues(s, key)
        for (const v of snaps) {
          const pos = toSlider(v, sp)
          for (const off of [-20, -5, 0, 5, 20]) {
            if (pos + off < 0 || pos + off > 1000) continue
            expect(snapValue(pos + off, sp, snaps)).toBe(v)
          }
        }
        // Halfway between two tested values is far from both: no snap
        if (snaps.length > 1) {
          const mid = (toSlider(snaps[0], sp) + toSlider(snaps[1], sp)) / 2
          expect(snaps).not.toContain(snapValue(mid, sp, snaps))
        }
      }
    }
  })

  it("land exactly on a run when every input is snapped to a tested combination", () => {
    // What a user gets by dragging each slider onto the dots of an existing run
    for (const r of data.runs) {
      const s = stateFromRun(r)
      const snapped: DesignState = {
        ...s,
        E1: span(s, "E1")[0] === span(s, "E1")[1] ? s.E1 : snapValue(toSlider(r.E1, span(s, "E1")) + 3, span(s, "E1"), testedValues(s, "E1")),
        a1: span(s, "a1")[0] === span(s, "a1")[1] ? s.a1 : snapValue(toSlider(r.a1, span(s, "a1")) - 3, span(s, "a1"), testedValues(s, "a1")),
      }
      expect(matchingRun(toDesign(snapped))?.run_id).toBeDefined()
    }
  })
})

describe("predictions over the whole design box", () => {
  it("stay finite and physically ordered for 3,000 random designs", () => {
    let seed = 7
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 3000; i++) {
      const t2 = tim2Products[i % tim2Products.length]
      const x: Design = {} as Design
      for (const c of data.input_cols) {
        const [lo, hi, scale] = data.inputs[c]
        const u = rand()
        x[c] = scale === "log" ? 10 ** (Math.log10(lo) + u * (Math.log10(hi) - Math.log10(lo))) : scale === "fixed" ? lo : lo + u * (hi - lo)
      }
      x.k2 = t2.k
      const p = predict(x)
      for (const v of Object.values(p)) expect(Number.isFinite(v)).toBe(true)
      expect(p.theta_jc).toBeGreaterThan(0)
      expect(p.Tj).toBeGreaterThan(p.Tcase)
      expect(p.Tcase).toBeGreaterThan(data.t_amb_c)
      expect(p.tim1_edge_tau_max).toBeGreaterThan(0)
      expect(p.warpage).toBeGreaterThan(0)
    }
  })
})
