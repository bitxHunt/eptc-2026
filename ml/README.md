# ml/: surrogate, optimisation and sensitivity

Takes the table of Ansys runs, trains a Gaussian process for each output, searches it with NSGA-II for the trade-off between cooling and TIM stress, and ranks which inputs matter.

## Run it

From `ml/`, on the results of a batch run:

```
python run_all.py ../data/inputs/TIM_balanced_DOE_144.csv ../data/outputs/TIM_balanced_DOE_144_outputs.csv
```

The first file is the design set given to the batch runner, the second is the results file it wrote. Only solved runs are used, and for a run that was retried only its last row. Rows with `dataset_role = holdout` are held out to test the surrogate and never used in training (older sets: `pair_id` containing `HOLDOUT`; with neither column, a seeded 15 % is held out).

To try the pipeline without Ansys, `python run_all.py --demo` uses a simple analytical model of the package instead (a 1D thermal resistance stack plus a shear-lag stress estimate). Its numbers are for testing the code only.

Results go to `ml/out/`:

| File | Contents |
|---|---|
| `outputs_train.csv`, `outputs_holdout.csv` | The runs in the units below, split into training and held-out sets |
| `surrogate.joblib`, `surrogate_holdout.csv` | The trained Gaussian processes and their R², RMSE and mean percentage error on the held-out runs |
| `figures/parity.png` | Surrogate against Ansys on the held-out runs |
| `pareto.csv`, `figures/pareto.png` | NSGA-II front: θJC against the worse of the two TIMs' edge max shear |
| `sensitivity.csv`, `figures/sensitivity.png` | First-order Sobol indices for each input |

## Method

- **Inputs** (`contract.py`): conductivity `k`, modulus `E`, CTE `a` and bond line thickness `blt` for TIM-1 and TIM-2. The ranges span the real products in `data/inputs/TIM_pair_simulation_runs.csv`. Conductivity and modulus are on a log scale.
- **Surrogate** (`surrogate.py`): one Gaussian process per output, Matern 5/2 kernel with a separate length scale per input, plus a white-noise term. Inputs are mapped to the unit cube, and stresses are learned as log10 when they are all positive.
- **Optimisation** (`optimise.py`): NSGA-II (pymoo) on the surrogate. Minimise θJC and the worse of the two TIMs' edge max shear (the 0.5 to 1.5 mm path, which avoids the corner singularity). No Tj limit: with the fixed 150 W/m²K heat sink every design sits at 114 to 137 °C, mostly because of the heat sink, so `TJ_LIMIT` is `None`. Set a number there to bring the constraint back.
- **Search box, not products.** NSGA-II searches k and E independently over the whole range, so its front can ask for combinations no product has (high k with very low E). Compare it with the real runs in the dashboard's product map before recommending anything.
- **Sensitivity** (`sensitivity.py`): first-order Sobol indices from 20,000 surrogate samples. The binned estimator can return slightly above 1 (for example 1.002); read that as 1.
- **Accuracy caveat.** In the 144-run set each held-out run shares its product pair with 8 training runs, so the held-out error measures interpolation between tested designs, not prediction for new materials.

## Files

| File | Does |
|---|---|
| `contract.py` | Input ranges and scales, fixed values and output column names, in one place |
| `load_runs.py` | Joins the batch runner's results to their inputs and converts units |
| `sample.py` | Latin hypercube designs |
| `surrogate.py`, `optimise.py`, `sensitivity.py` | The three steps above, each runnable on its own |
| `fake_physics.py` | The analytical stand-in used by `--demo` |
| `run_all.py` | Everything above, in order |
| `test_load_runs.py` | Tests for the loader (units, hold-out split, retried runs). `python -m unittest ml/test_load_runs.py` from the repo root |

Units throughout: k in W/mK, E in MPa, CTE in ppm/K, BLT in µm, temperature in °C, stress in MPa, warpage in µm.
