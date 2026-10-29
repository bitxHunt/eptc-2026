// TIM-1 classes drive chart colour (3 hues pass the all-pairs colour-vision check);
// shape tells the two polymer gels apart, so identity never rests on colour alone.
import { data, type Run } from "@/lib/data"

export type Tim1Class = "solder" | "silver" | "gel"
export type MarkShape = "circle" | "square" | "triangle" | "diamond"

export const CLASS_LABEL: Record<Tim1Class, string> = {
  silver: "Silver paste",
  solder: "Indium solder",
  gel: "Polymer gel",
}

// CSS variables defined in index.css, with light and dark steps
export const CLASS_COLOR: Record<Tim1Class, string> = {
  silver: "var(--series-1)",
  solder: "var(--series-2)",
  gel: "var(--series-3)",
}

export function tim1Class(name: string): Tim1Class {
  if (name.startsWith("Indium")) return "solder"
  if (name.includes("Ag")) return "silver"
  return "gel"
}

const SHAPE_BY_TIM1: Record<string, MarkShape> = {
  "Heraeus Ag paste": "circle",
  "Indium (solder)": "diamond",
  "Shin-Etsu X23-8131": "triangle",
  "Shin-Etsu X23-7935-11": "square",
}

export function tim1Shape(name: string): MarkShape {
  return SHAPE_BY_TIM1[name] ?? "circle"
}

export const tim1Products = data.tim1
export const tim2Products = data.tim2

/**
 * The recommended design: among Pareto runs with edge shear under 1 MPa, those within 5 % of
 * the best θJC, and of those the one with the lowest Tj (TIM-2 sets most of the Tj difference).
 */
export const recommended: Run = (() => {
  const lowStress = data.runs.filter((r) => r.pareto && r.stress_obj < 1)
  const best = Math.min(...lowStress.map((r) => r.theta_jc))
  return lowStress
    .filter((r) => r.theta_jc <= best * 1.05)
    .reduce((a, b) => (b.Tj < a.Tj ? b : a))
})()

export const bestCooling: Run = data.runs.reduce((a, b) => (b.theta_jc < a.theta_jc ? b : a))
