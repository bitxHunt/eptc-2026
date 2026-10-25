# Design sets

Every file here has one row per design and the same 26 columns as `TIM_pair_simulation_runs.csv`, so each can go straight to the batch runner.

| File | Rows | Purpose |
|---|---|---|
| `test_runs.csv` | 3 | Pipeline check: TIM-1 conductivity of 2.5, 30 and 82 W/mK |
| `validation_products.csv` | 16 | One design per real product pair: both BLTs at 40 µm and the median TIM-1 modulus of that pair |
| `validation_hu2019.csv` | 5 | The five TIMs measured by Hu et al. (EPTC 2019) as TIM-1, for comparison with the measured junction-to-case resistance of 0.10 to 0.23 °C/W |
| `lhs_runs.csv`, `pair_id = LHS-TRAIN` | 150 | Latin hypercube sample used to train the surrogate |
| `lhs_runs.csv`, `pair_id = LHS-HOLDOUT` | 25 | A separate Latin hypercube, used only to test the surrogate |
| `TIM_pair_simulation_runs.csv` | 1,530 | Full grid of 16 real product pairs crossed with modulus and BLT sweeps. The source of the property ranges above |

At about 4 minutes per design, the validation and Latin hypercube sets together take about 13 hours, against about 100 hours for the full grid.

## How the Latin hypercube was built

`make_batch_v2.py` generates the two validation files and `lhs_runs.csv`. It is seeded, so re-running it gives the same rows:

```
python data/inputs/make_batch_v2.py
```

Seven inputs vary, each across the minimum and maximum of the real products in the grid. Conductivity and modulus are sampled on a log scale. The sample uses SciPy's Latin hypercube with centred-discrepancy optimisation, seed 2026 for training and 2027 for the held-out set.

| Input | Range | Scale |
|---|---|---|
| `tim1_k_W_mK` | 2.5 to 82 | log |
| `tim1_E_Pa` | 4e4 to 1.274e10 | log |
| `tim1_CTE_per_K` | 2.48e-5 to 1.8e-4 | linear |
| `tim1_BLT_um` | 30 to 50 | linear |
| `tim2_k_W_mK` | 2.9 to 8.5 | log |
| `tim2_E_Pa` | 1e4 to 1e6 | log |
| `tim2_BLT_um` | 30 to 50 | linear |
| `tim2_CTE_per_K` | fixed at 1.5e-4 | |
