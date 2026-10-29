# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + Vite + TypeScript, shadcn/ui, TanStack Router, pnpm (user's choice). Lives in `dashboard/` of this repo. Data comes from the Python pipeline (`ml/`) as a JSON export. Delivered as a hosted link only, a static build on Vercel; no offline single-file build.

## Users

- **Judges** of the EPTC 2026 TIM challenge (engineers from Ansys and Heraeus), opening the link on their own while scoring the submission. They know FEA, θJC, TIM materials, optiSLang and Granta. They have minutes, not hours.
- **The team presenting live**: one member drives it on a projector during the 10-minute presentation.
- **The team itself** (Finite Boys, 3 members: lead on AI and automation, one robotics, one computer engineering) to understand and check results while writing the report.

## Product Purpose

Let someone see in under a minute what 144 coupled thermal–structural Ansys simulations found about choosing TIM-1 and TIM-2 for a 65 × 65 mm, 400 W flip-chip package, and let them try their own TIM choice and get an instant prediction from the trained surrogate. Success: a judge understands the trade-off (cooling against TIM edge stress) and the recommended pair, and trusts the numbers because accuracy and limits are visible.

## Positioning

Not a static results page: a surrogate trained on the team's own Ansys runs predicts any TIM design in the browser in milliseconds (θJC hold-out error 0.11 %), next to the real runs it was trained on. It speaks the same language as optiSLang (Pareto front, coefficient of prognosis, sensitivity) and Granta (property-vs-property product map).

## Operating Context

- Judged with weights: technical quality 25, innovation 20, visualisation and communication 20, practical relevance 15, accuracy 10, industrial adoption 10.
- Submission due Sun 1 Nov 2026 (report PDF max 10 pages, slides, optional dashboard link). Finalists 9 Nov, finals 4 Dec.
- Shown on laptops and projectors; desktop first, must still work on a phone.

## Capabilities and Constraints

- Data: 144 runs (16 real TIM-1/TIM-2 product pairs × 9), 128 train / 16 hold-out, all solved. Outputs per run: Tj, Tcase, θJC, TIM-1 and TIM-2 edge max shear and von Mises, warpage.
- Surrogate: one Gaussian process per output (Matérn 5/2), exported to JSON and evaluated in the browser; must match scikit-learn within 1e-6.
- Pages: overview, design explorer, trade-off (Pareto), materials map (k vs E), sensitivity (Sobol), model accuracy, runs table.
- Terms: θJC, Tj, Tcase, TIM-1 (die to lid), TIM-2 (lid to heat sink), BLT, edge shear, warpage, Pareto set, surrogate, hold-out.

## Brand Commitments

- Team name: **Finite Boys**. No logo yet.
- Event: EPTC 2026 TIM challenge.

## Evidence on Hand

- `data/outputs/TIM_balanced_DOE_144_outputs.csv`, `data/inputs/TIM_balanced_DOE_144.csv`, `ml/out/` (surrogate, hold-out scores, Pareto, Sobol).
- Validation reference: Hu et al., EPTC 2019 (measured θJC 0.10–0.23 °C/W).
- No customer quotes, no industry adoption, no measured data of our own. Do not fabricate any.

## Product Principles

1. Numbers first, words on demand: values and charts carry the page; definitions live in tooltips.
2. Show the limits next to the claims: hold-out error, perfect bonding, linear-elastic indium, scenario material data.
3. Real products before ideal ones: the surrogate's optimum is shown, but recommendations come from real product pairs.
4. Every number traceable to a run ID.

## Accessibility & Inclusion

Readable on a projector (contrast, size), colour never the only encoding in charts, keyboard reachable controls.
