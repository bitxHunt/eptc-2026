# EPTC 2026: TIM selection for a 400 W flip-chip package

[![tests](https://github.com/bitxHunt/eptc/actions/workflows/tests.yml/badge.svg)](https://github.com/bitxHunt/eptc/actions/workflows/tests.yml)

Our entry for the EPTC 2026 thermal interface material (TIM) challenge. We look for the TIM-1 (die to lid) and TIM-2 (lid to heat sink) choice that best balances cooling against TIM stress in a 65 × 65 mm, 400 W flip-chip package.

## Results at a glance

| | |
|---|---|
| Designs simulated | 144 (16 real TIM-1/TIM-2 product pairs × 9 variants), all solved, 0 failed |
| Ansys time | 5 h 38 min headless on one 4-core laptop, about 2.3 min per design |
| Surrogate error on 16 held-out runs | θJC 0.11 %, Tj < 0.01 %, TIM-1 edge shear 0.44 %, warpage 0.9 % (mean) |
| What sets cooling | TIM-1 conductivity: 95 % of the variation in θJC |
| What sets stress | TIM-1 modulus: nearly all of the variation in TIM-1 edge shear |
| Key trade-off | Soft silver paste comes within about 15 % of indium's θJC with about 4,000 times less TIM-1 edge shear |

Open [`dashboard/index.html`](dashboard/index.html) in any browser to explore the results. It works offline.

## How it works

One Ansys solve takes about 2.5 minutes, too slow to search the design space directly. So:

1. **Model.** A coupled steady-state thermal and static structural model in Ansys Workbench 2026 R1 (`model/eptc.wbpz`).
2. **Batch.** `automation/run_batch.py` runs a CSV of designs through Workbench headless, in chunks, with resume and retry. Results land in `data/outputs/`.
3. **Surrogate.** `ml/` fits one Gaussian process per output on the results, checks it on held-out runs, searches it with NSGA-II for the θJC against stress trade-off, and ranks the inputs with Sobol indices.
4. **Dashboard.** `dashboard/` turns the results and the trained surrogate into one HTML page that predicts new designs in the browser.

```
model/eptc.wbpz       automation/          data/outputs/*.csv      ml/              dashboard/index.html
(Ansys project)  -->  (headless batch) --> (one row per design) --> (GP, NSGA-II, --> (explorer for judges
                                                                     Sobol)            and the team)
```

## Repository layout

| Path | Contents |
|---|---|
| `model/` | `eptc.wbpz`, the Workbench 2026 R1 project archive (Git LFS, lockable) |
| `cad/` | `EPTC_package.SLDPRT`, the SolidWorks part, 7 bodies (Git LFS, lockable) |
| `automation/` | Batch runner, Workbench journal, parameter map, tests. See [`automation/README.md`](automation/README.md) |
| `data/inputs/` | Design sets. `TIM_balanced_DOE_144.csv` is the one that was run. See [`data/inputs/README.md`](data/inputs/README.md) |
| `data/outputs/` | Results written by the runner. `TIM_balanced_DOE_144_outputs.csv` holds the 144 runs |
| `ml/` | Surrogate, optimisation, sensitivity. See [`ml/README.md`](ml/README.md) |
| `dashboard/` | Dashboard builder, template and the built page. See [`dashboard/README.md`](dashboard/README.md) |
| `report/` | Report outline (official 8 sections) and drafts |
| `docs/`, `materials/` | Empty for now |

## Getting started

Requirements: Python 3.12, Git with Git LFS. Running the Ansys batch also needs Windows and Ansys 2026 R1 with a Mechanical licence. Everything else runs on any OS.

```
git lfs install
git clone https://github.com/bitxHunt/eptc.git
cd eptc
python -m venv .venv
.venv\Scripts\activate            # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
```

### Reproduce the analysis from the committed results (no Ansys)

```
cd ml
python run_all.py ../data/inputs/TIM_balanced_DOE_144.csv ../data/outputs/TIM_balanced_DOE_144_outputs.csv
cd ..
python dashboard/build_dashboard.py
```

This retrains the surrogate, writes figures and tables to `ml/out/`, and rebuilds `dashboard/index.html`. It takes about a minute.

### Run designs through Ansys (Windows)

```
python automation/run_batch.py data/inputs/test_runs.csv --dry-run    # plan and time estimate
python automation/run_batch.py data/inputs/test_runs.csv              # 3 designs, about 8 min
```

Run the same command again to resume after a stop. Details and options: [`automation/README.md`](automation/README.md).

### Tests

```
python -m unittest automation/test_run_batch.py ml/test_load_runs.py dashboard/test_build_dashboard.py
```

No Ansys needed. GitHub Actions runs the same tests on every push.

## Modelling assumptions and limits

These are the points a reviewer should know before using the numbers:

- **Perfect bonding.** No contact resistance between layers, so θJC (0.010 to 0.058 °C/W) is 3 to 7 times below the values measured by Hu et al. (EPTC 2019, 0.10 to 0.23 °C/W). Rankings between TIMs hold. Absolute values are optimistic.
- **Linear elastic TIMs.** Indium shows 45 to 66 MPa edge shear, but real indium yields at a few MPa and creeps. Treat its stress as an upper bound.
- **Bond line by thin-layer equivalence.** TIM layers keep a fixed modelled thickness (TIM-1 50 µm, TIM-2 150 µm), and a different BLT is applied by scaling k and E by t_model / t_real. This is exact for conduction and approximate for shear stress. Real-geometry check runs are still to do.
- **Edge stress, not corner stress.** Stress is read on a 1 mm path 0.5 to 1.5 mm in from the TIM corner, at the mid-plane, to stay clear of the corner singularity. A mesh study on that path is still to do.
- **Material data.** k is from datasheets. CTE is assumed, and E is swept where datasheets give none. The silver paste uses an upper-bound k of 30 W/mK and a hypothetical E sweep. See the `*_property_basis` columns in the inputs CSV.
- **Fixed conditions.** Steady state, 400 W, heat sink film coefficient 150 W/m²K to 22 °C, stress-free at 25 °C, one geometry.
- **Surrogate scope.** Held-out runs share the 16 product pairs with training, so the reported error is for interpolation between tested designs, not for new materials far from them.

## Working on the Ansys model

Workbench files can't be merged, so the archive is locked while someone edits it:

1. `git pull`, then `git lfs lock model/eptc.wbpz`.
2. In Workbench, **File > Restore Archive** into `work/` (ignored by Git).
3. Edit and solve, then **File > Archive** over `model/eptc.wbpz` with *Imported files external to project directory* ticked.
4. If you added, removed or renumbered a parameter, update [`automation/PARAMETERS.md`](automation/PARAMETERS.md) and the maps at the top of `automation/batch.wbjn`, then run a 3-design test.
5. Commit, push, then `git lfs unlock model/eptc.wbpz`.

The unpacked project (`.wbpj`, `_files/`) and solver scratch files are never committed.

## Reference

Hu et al., "High Power Large Size HFCBGA Thermal Characterization", EPTC 2019 (IEEE 9026583).
