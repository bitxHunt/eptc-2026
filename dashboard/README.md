# dashboard/: TIM Explorer

A web dashboard for the judges and the team: what the 144 Ansys runs found, plus a design explorer that predicts any TIM choice in the browser with the trained surrogate.

React 19, Vite, TypeScript, shadcn/ui (Base UI), Tailwind 4, TanStack Router and Table, Recharts. pnpm.

| Page | Shows |
|---|---|
| Overview | Key numbers, the trade-off chart, the recommended design, the main drivers |
| Trade-off | All runs, θJC against edge shear, filter by TIM-2, the Pareto set as a table |
| Materials | Conductivity against modulus for the 8 products, and how each performed |
| Key drivers | Sobol sensitivity for each output |
| Design explorer | Pick products, modulus and bond lines; instant prediction, thermal path, position among the runs |
| Accuracy | Surrogate against Ansys on the 16 hold-out runs, and the error of every output |
| All runs | Sortable, searchable table of the 144 runs; a row opens it in the explorer |
| Method and limits | Setup, assumptions and limits, definitions |

## Run it

```
cd dashboard
pnpm install
pnpm dev          # http://localhost:5173
pnpm build        # static site in dist/
pnpm preview      # serve dist/
```

URLs use a hash (`#/trade-off`), so the build works on any static host without rewrite rules.

## Deploy (Vercel)

Import the GitHub repo (`bitxHunt/eptc-2026`) on vercel.com and set **Root Directory** to `dashboard`. `vercel.json` sets the rest (pnpm install, `pnpm build`, output `dist`). Every push to `main` redeploys; pull requests get preview links.

## Data

The app reads `src/data/dashboard.json`, which is committed so the app builds without Python. Regenerate it after new Ansys results or a retrained surrogate:

```
cd ml && python run_all.py ../data/inputs/TIM_balanced_DOE_144.csv ../data/outputs/TIM_balanced_DOE_144_outputs.csv && cd ..
python dashboard/scripts/export_data.py
```

The JSON holds the runs, products, hold-out scores, Sobol indices, the NSGA-II front, and each Gaussian process's training inputs, weights and kernel settings. `src/lib/gp.ts` evaluates the GP mean from these. The export recomputes the same prediction in NumPy and stops if it differs from scikit-learn's by more than 1e-6, which catches a scikit-learn upgrade changing the internals the export reads. Tests: `python -m unittest dashboard/scripts/test_export_data.py` from the repo root.

## Layout

| Path | Contents |
|---|---|
| `src/routes/` | One file per page (TanStack Router, file-based). `routeTree.gen.ts` is generated |
| `src/components/charts/` | Trade-off, product map, sensitivity and parity charts |
| `src/components/ui/` | shadcn/ui components, as generated |
| `src/lib/` | Data types, GP prediction, formatting, materials and explorer state |
| `scripts/` | `export_data.py` and its tests |

## Design notes

- Chart colour encodes TIM-1 class (silver paste, indium solder, polymer gel): three hues that stay apart under colour-vision deficiency. Shape tells the two Shin-Etsu gels apart, so identity never depends on colour alone.
- Pareto runs are filled; other runs are outlines, because designs that differ only in TIM-2 land on top of each other.
- Light by default (laptops and projectors in lit rooms), dark on request or from the OS setting.
- Product context lives in `PRODUCT.md` at the repo root.
