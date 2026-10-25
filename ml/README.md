# ml/: surrogate, optimisation and sensitivity

Takes the table of Ansys runs, trains a Gaussian process for each output, searches it with NSGA-II for the trade-off between cooling and TIM stress, and ranks which inputs matter.

## Run it

From `ml/`, on the results of a batch run:

```
python run_all.py ../data/inputs/lhs_runs.csv ../data/outputs/lhs_runs_outputs.csv
```

The first file is the design set given to the batch runner, the second is the results file it wrote. Only solved runs are used. Rows with `pair_id = LHS-HOLDOUT` are held out to test the surrogate and never used in training.

To try the pipeline without Ansys, `python run_all.py --demo` uses a simple analytical model of the package instead (a 1D thermal resistance stack plus a shear-lag stress estimate). Its numbers are for testing the code only.

Results go to `ml/out/`:

| File | Contents |
|---|---|
| `outputs_train.csv`, `outputs_holdout.csv` | The runs in the units below, split into training and held-out sets |
| `surrogate.joblib`, `surrogate_holdout.csv` | The trained Gaussian processes and their R², RMSE and mean percentage error on the held-out runs |
| `figures/parity.png` | Surrogate against Ansys on the held-out runs |
| `pareto.csv`, `figures/pareto.png` | NSGA-II front: θJC against the worse of the two TIMs' principal stress |
| `sensitivity.csv`, `figures/sensitivity.png` | First-order Sobol indices for each input |

## Method

- **Inputs** (`contract.py`): conductivity `k`, modulus `E`, CTE `a` and bond line thickness `blt` for TIM-1 and TIM-2. The ranges span the real products in `data/inputs/TIM_pair_simulation_runs.csv`. Conductivity and modulus are on a log scale.
- **Surrogate** (`surrogate.py`): one Gaussian process per output, Matern 5/2 kernel with a separate length scale per input, plus a white-noise term. Inputs are mapped to the unit cube, and stresses are learned as log10 when they are all positive.
- **Optimisation** (`optimise.py`): NSGA-II (pymoo) on the surrogate. Minimise θJC and the worse TIM principal stress, subject to Tj ≤ 105 °C. The stress average is used when the model provides it, since the corner maximum depends on the mesh.
- **Sensitivity** (`sensitivity.py`): first-order Sobol indices from 20,000 surrogate samples.

## Files

| File | Does |
|---|---|
| `contract.py` | Input ranges and scales, fixed values and output column names, in one place |
| `load_runs.py` | Joins the batch runner's results to their inputs and converts units |
| `sample.py` | Latin hypercube designs |
| `surrogate.py`, `optimise.py`, `sensitivity.py` | The three steps above, each runnable on its own |
| `fake_physics.py` | The analytical stand-in used by `--demo` |
| `run_all.py` | Everything above, in order |

Units throughout: k in W/mK, E in MPa, CTE in ppm/K, BLT in µm, temperature in °C, stress in MPa, warpage in µm.
