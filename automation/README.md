# automation/: batch runner

Runs a CSV of TIM designs through the Workbench model without opening the GUI, and writes one result row per design.

| File | Does |
|---|---|
| `run_batch.py` | Splits the inputs CSV into chunks, starts one headless Workbench session per chunk, collects the results, and retries failed designs. Resumes after an interruption. Standard library only |
| `batch.wbjn` | The Workbench journal each session runs. It sets the inputs on design point 0, updates the model, reads the outputs and writes a row, one design at a time. A failed design is logged and the next one continues |
| `PARAMETERS.md` | How the Workbench parameters (P1, P2 …) map to the CSV columns |
| `test_run_batch.py` | Tests for the CSV, unit, thin-layer, resume and retry logic. No Ansys needed |

## Run it

From the repo root, on Windows with Ansys 2026 R1:

```
python automation/run_batch.py data/inputs/test_runs.csv --dry-run    # shows the chunks and a time estimate
python automation/run_batch.py data/inputs/test_runs.csv              # runs it
```

`test_runs.csv` holds 3 designs with TIM-1 conductivity of 2.5, 30 and 82 W/mK: a quick check that inputs reach the solver, since the three chip temperatures must differ.

For a long batch, run it in a window you won't close by accident, and keep the PC awake. The 144-design batch ran this way from a PowerShell script that set `SetThreadExecutionState` before starting the runner.

## Inputs and outputs

- **Inputs:** a CSV with a `run_id` column and the TIM columns, either as named in `data/inputs/` (`tim1_k_W_mK`, `tim1_E_Pa`, `tim1_CTE_per_K`, `tim1_BLT_um` and the same for `tim2`) or the contract names (`k1, E1, a1, blt1, k2, E2, a2, blt2`) in W/mK, Pa, 1/K and µm. Other columns are ignored.
- **Bond line:** the model keeps TIM-1 at 50 µm and TIM-2 at 150 µm. A row's BLT is applied by scaling its k and E by t_model / t_real before they reach Workbench (`thin_layer()`).
- **Outputs:** `data/outputs/<inputs name>_outputs.csv`. Temperatures in °C, stresses in MPa, deformation and warpage in µm. Derived columns:
  - `theta_jc_C_W = (Tj − Tcase) / |Q_out|`, using the heat that actually leaves (P21), not the nominal 400 W.
  - `heat_balance_rel_error = | |Q_out| − 400 | / 400`. Should be about 0.
  - `warpage_um` = max − min vertical displacement of the substrate.
  - `status` (solved or failed), `error_message`, `solve_time_s`, `chunk`, `finished_at`.

## Resume and retry

- Failed designs are retried once at the end of the session (`--retries 1`, the default). This covers short outages such as the Ansys licence server returning HTTP 502.
- Running the same command again skips solved designs and retries failed ones. `--no-retry-failed` skips failed ones too.
- Each attempt appends a row, so a retried design appears twice. `ml/load_runs.py` keeps the last row per `run_id`.

## Options

| Option | Default | |
|---|---|---|
| `--chunk` | 10 | Designs per Workbench session. Smaller loses less work on a crash, larger saves start-up time (about 30 s per session) |
| `--limit N` | all | Run at most N designs |
| `--timeout` | 900 | Seconds allowed per design before the session is killed |
| `--retries` | 1 | Extra passes over designs that failed in this session |
| `--out` | `data/outputs/<name>_outputs.csv` | Results file |
| `--work` | `work/batch` | Scratch folder, ignored by Git. Each chunk keeps its files and `runwb2.log` in `chunk_NNN/` |
| `--archive` | `model/eptc.wbpz` | Restored once into `work/batch/project/`, and again whenever the archive is newer |
| `--runwb2` | `%AWP_ROOT261%\Framework\bin\Win64\RunWB2.exe` | Set by the Ansys installer |

## Timing

On a 4-core laptop the 144-design batch took 5 h 38 min, about 2.3 min per design including Workbench start-up. The solver runs 4 processes and uses about 5 GB of RAM, so close other heavy programs during a batch.
