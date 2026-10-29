# Design sets

One row per design. Every file can go straight to the batch runner (`automation/run_batch.py`).

## The set that was run: `TIM_balanced_DOE_144.csv`

144 designs, run on 29 Oct 2026 with the V2 model (`model_config_id = V2_H150_321SUPPORT_TREF25_THINLAYER_BLT`). Results: `data/outputs/TIM_balanced_DOE_144_outputs.csv`, all 144 solved.

- **16 product pairs × 9 designs.** 4 TIM-1 products (Shin-Etsu X23-7935-11 and X23-8131, Heraeus silver paste, indium) crossed with 4 TIM-2 products (Dowsil TC-5026 and TC-5888, Bergquist TGR 4000, Honeywell PTM7950).
- **Within a pair**, BLT (30, 40 or 50 µm for each TIM) varies, and so do TIM-1 modulus and CTE where the datasheet doesn't fix them (not for indium) and the PTM7950 modulus. The values are picked by a stratified orthogonal-array Latin hypercube (`sampling_method = pair_stratified_discrete_OA_LHS`, seed in `sampling_seed`). Each row's `source_run_id` points to the row of `TIM_pair_simulation_runs.csv` it came from.
- **`dataset_role`:** 8 `train` rows and 1 `holdout` row per pair, so 128 and 16. `ml/load_runs.py` uses this column for the split.
- **Where each property comes from:** `tim1_property_basis` and `tim2_property_basis`. For example `k_from_source;CTE_assumed;E_derived_proxy_sweep`: k is from the datasheet, CTE is assumed, E is a swept proxy. The silver paste's k of 30 W/mK is an upper-bound scenario. Read these columns before quoting a product's result as fact.
- The result columns to the right of `run_status` are blank here. The runner writes results to `data/outputs/` instead.

This file was built by the team from the product grid. Its generator is not in the repo.

## Earlier sets (not run)

These were made before the 144-run set and keep the 26 columns of `TIM_pair_simulation_runs.csv`.

| File | Rows | Purpose |
|---|---|---|
| `test_runs.csv` | 3 | Pipeline check: TIM-1 conductivity of 2.5, 30 and 82 W/mK. Use this after any model change |
| `validation_products.csv` | 16 | One design per real product pair: both BLTs at 40 µm and the median TIM-1 modulus of that pair |
| `validation_hu2019.csv` | 5 | The five TIMs measured by Hu et al. (EPTC 2019) as TIM-1, for comparison with the measured junction-to-case resistance of 0.10 to 0.23 °C/W |
| `lhs_runs.csv`, `pair_id = LHS-TRAIN` | 150 | Latin hypercube sample used to train the surrogate |
| `lhs_runs.csv`, `pair_id = LHS-HOLDOUT` | 25 | A separate Latin hypercube, used only to test the surrogate |
| `TIM_pair_simulation_runs.csv` | 1,530 | Full grid of 16 real product pairs crossed with modulus and BLT sweeps. The source of the property ranges above |

At about 2.5 minutes per design, the full grid would take about 64 hours.

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
