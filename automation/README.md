# automation/: batch runner

Runs a CSV of TIM designs through the Workbench model without opening the GUI, and writes one result row per design.

| File | Does |
|---|---|
| `run_batch.py` | Splits the inputs CSV into chunks, starts one headless Workbench session per chunk, and collects the results. Resumes after an interruption. Standard library only |
| `batch.wbjn` | The Workbench journal each session runs. It sets the inputs on the design point, updates the model, reads the outputs and writes a row, one design at a time. A failed design is logged and the next one continues |
| `PARAMETERS.md` | How the Workbench parameters (P1, P2 …) map to the CSV columns |
| `test_run_batch.py` | Tests for the CSV, unit and resume logic. No Ansys needed: `python automation/test_run_batch.py` |

## Run it

From the repo root, on Windows with Ansys 2026 R1:

```
python automation/run_batch.py data/inputs/test_runs.csv --dry-run    # shows the chunks and a time estimate
python automation/run_batch.py data/inputs/test_runs.csv              # runs it
```

`test_runs.csv` holds 3 designs with TIM-1 conductivity of 2.5, 30 and 82 W/mK, a quick check that inputs reach the solver: the three chip temperatures should differ.

- **Inputs:** a CSV with a `run_id` column and the TIM columns, either the contract names (`k1, E1, a1, blt1, k2, E2, a2, blt2, h`, in W/mK, Pa, 1/K, µm and W/m²K) or the names used in `data/inputs/` (`tim1_k_W_mK` and so on).
- **Outputs:** `data/outputs/<inputs name>_outputs.csv`, with temperatures in °C, stresses in MPa, warpage in mm, `theta_jc_C_W = (Tj − Tcase) / 400`, the solve time, and a `status` of solved or failed with the error.
- **Resume:** run the same command again. Solved designs are skipped and failed ones are retried (`--no-retry-failed` skips those too).
- **Options:** `--chunk 10` (designs per Workbench session), `--limit N`, `--timeout 900` (seconds per design), `--out`, `--work` (default `work/batch`, ignored by Git).
- The project is restored from `model/eptc.wbpz` once and reused, and restored again whenever the archive is newer.
- Each chunk keeps its files and `runwb2.log` in `work/batch/chunk_NNN/`.
- The runner warns when an input varies in the CSV but is not a parameter in the model.

One design takes about 4 minutes on a 4-core laptop (thermal 47 s, structural 188 s), so a 175-design set runs in about 12 hours.
