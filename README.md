# EPTC 2026: TIM optimisation

Our entry for the EPTC 2026 thermal interface material (TIM) challenge. We look for the TIM-1 and TIM-2 designs that best balance chip temperature and TIM stress in a 65 × 65 mm, 400 W flip-chip package.

## What the project does

A finite element model in Ansys takes about 4 minutes per TIM design, which is too slow to search thousands of designs directly. So we:

1. Run a sampled set of designs through the coupled thermal and structural Ansys model.
2. Train a Gaussian process surrogate on the results. It predicts temperature and stress in milliseconds.
3. Search the surrogate with NSGA-II for the best trade-off between cooling (θJC) and TIM stress.
4. Confirm the chosen designs in Ansys and map them to real TIM products.

```
Ansys model  →  sampled runs (CSV)  →  surrogate  →  Pareto front  →  confirmation runs
  model/        automation/, data/        ml/            ml/            automation/
```

The model is validated against the junction-to-case resistance measured by Hu et al., "High Power Large Size HFCBGA Thermal Characterization", EPTC 2019.

## Repository layout

| Folder | Contents |
|---|---|
| `model/` | `eptc.wbpz`, the Ansys Workbench 2026 R1 project archive |
| `cad/` | `EPTC_package.SLDPRT`, the SolidWorks part (7 bodies) |
| `automation/` | `run_batch.py` and `batch.wbjn`, which run a CSV of designs through Workbench headless |
| `data/inputs/` | Design sets, one row per design (see below) |
| `data/outputs/` | Results written back by the runner, one row per design |
| `ml/` | Sampling, surrogate, optimisation, sensitivity analysis and figures |
| `materials/` | TIM property ranges and real product data |
| `report/` | Report and slides |

### Design sets

| File | Rows | Purpose |
|---|---|---|
| `test_runs.csv` | 3 | Quick check of the pipeline (TIM-1 k = 2.5, 30 and 82 W/mK) |
| `validation_runs.csv` | 21 | One run per real product pair, plus the TIMs from Hu et al. |
| `lhs_runs.csv` | 175 | Latin hypercube sample: 150 to train the surrogate, 25 held out to test it |
| `TIM_pair_simulation_runs.csv` | 1,530 | Full grid of real product pairs. Kept as a reference, not run in full |

## Getting started

Requirements: Windows, Ansys 2026 R1, Git with Git LFS, Python 3.12.

```
git lfs install
git clone https://github.com/bitxHunt/eptc.git
cd eptc
git lfs pull
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Run a design set through Ansys (start with the 3-row test):

```
python automation/run_batch.py data/inputs/test_runs.csv --dry-run
python automation/run_batch.py data/inputs/test_runs.csv
```

Results go to `data/outputs/test_runs_outputs.csv`. Running the same command again resumes where it stopped. Options and details: `automation/README.md`.

Train the surrogate on the results and run the optimiser:

```
cd ml
python run_all.py ../data/inputs/lhs_runs.csv ../data/outputs/lhs_runs_outputs.csv
```

Figures and the Pareto front go to `ml/out/`. `python run_all.py --demo` runs the same pipeline on an analytical stand-in, without Ansys. Details: `ml/README.md`, and `data/inputs/README.md` for how the design sets were built.

## Working on the model

Workbench files can't be merged, so the archive is locked while someone edits it:

1. `git pull`, then `git lfs lock model/eptc.wbpz`.
2. In Workbench, **File > Restore Archive** into `work/` (ignored by Git).
3. Edit and solve, then **File > Archive** over `model/eptc.wbpz` with *Imported files external to project directory* ticked.
4. Commit, push, then `git lfs unlock model/eptc.wbpz`.

The unpacked project (`.wbpj`, `_files`) and solver scratch files are never committed.
