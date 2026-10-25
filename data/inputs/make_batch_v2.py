"""Build validation_runs.csv and lhs_runs.csv from TIM_pair_simulation_runs.csv.

Both files keep the exact column layout of the original grid. The train / held-out
split is carried in pair_id (LHS-TRAIN / LHS-HOLDOUT), so no column is added.

Run from the repo root:  .venv/Scripts/python data/inputs/make_batch_v2.py
"""
import csv
import statistics
from pathlib import Path

import numpy as np
from scipy.stats import qmc

HERE = Path(__file__).parent
GRID = HERE / "TIM_pair_simulation_runs.csv"
SEED = 2026
N_TRAIN, N_HOLD = 150, 25

rows = list(csv.DictReader(open(GRID, encoding="utf-8")))
cols = list(rows[0].keys())


def g(x):
    return f"{x:.4g}"


def blank(r):
    out = dict(r)
    for c in cols[cols.index("run_status"):]:
        out[c] = ""
    out["run_status"] = "not_run"
    return out


# Validation set 1: one row per real product pair, BLT 40/40 um, median TIM-1 E
val = []
for pid in dict.fromkeys(r["pair_id"] for r in rows):
    pr = [r for r in rows if r["pair_id"] == pid]
    e1 = statistics.median_low(sorted({float(r["tim1_E_Pa"]) for r in pr}))
    state = sorted({r["tim2_state_case"] for r in pr})[0]
    pick = next(r for r in pr if float(r["tim1_E_Pa"]) == e1 and r["tim2_state_case"] == state
                and r["tim1_BLT_um"] == "40" and r["tim2_BLT_um"] == "40")
    v = blank(pick)
    v["run_id"] = f"VAL-{pid}"
    val.append(v)

# Validation set 2: Hu et al. EPTC 2019 TIMs as TIM-1. Only the k range (3.8 to 40 W/mK,
# graphite sheet = 40) is known. Middle k, E and CTE are placeholders until the paper is read.
hu_k = [3.8, None, None, None, 40.0]
tmpl = val[0]
for i, k in enumerate(hu_k, 1):
    v = dict(tmpl)
    v.update({
        "run_id": f"VAL-HU{i}", "pair_id": f"HU{i}",
        "tim1_material": f"Hu et al. EPTC 2019 TIM {i} (UNCERTAIN: fill from paper)",
        "tim2_material": "Model baseline TIM-2 (k 5, E 10 MPa, CTE 100 ppm)",
        "tim1_k_W_mK": g(k) if k else "",
        "tim1_CTE_per_K": "", "tim1_E_Pa": "",
        "tim1_BLT_um": "", "tim1_BLT_m": "",
        "tim2_k_W_mK": "5", "tim2_CTE_per_K": "0.0001", "tim2_E_Pa": "10000000",
        "tim2_BLT_um": "150", "tim2_BLT_m": "0.00015",
        "tim2_state_case": "model_baseline",
        "tim1_property_basis": "UNCERTAIN;k_endpoint_from_plan" if k else "UNCERTAIN;all_values_missing_read_Hu_et_al",
        "tim2_property_basis": "model_baseline_eptc_wbpz",
    })
    val.append(blank(v))

# LHS: span the grid's own min/max. k and E on log scale. TIM-2 CTE is a single value
# in the grid (150 ppm), so it stays fixed.
def span(c):
    vals = [float(r[c]) for r in rows]
    return min(vals), max(vals)

dims = [  # column, log scale
    ("tim1_k_W_mK", True), ("tim1_E_Pa", True), ("tim1_CTE_per_K", False), ("tim1_BLT_um", False),
    ("tim2_k_W_mK", True), ("tim2_E_Pa", True), ("tim2_BLT_um", False),
]
lo = np.array([np.log10(span(c)[0]) if lg else span(c)[0] for c, lg in dims])
hi = np.array([np.log10(span(c)[1]) if lg else span(c)[1] for c, lg in dims])


def lhs(n, seed, label, prefix):
    u = qmc.LatinHypercube(d=len(dims), optimization="random-cd", seed=seed).random(n)
    x = qmc.scale(u, lo, hi)
    out = []
    for i, xi in enumerate(x, 1):
        r = dict(tmpl)
        for (c, lg), v in zip(dims, xi):
            r[c] = g(10 ** v if lg else v)
        r.update({
            "run_id": f"{prefix}-{i:04d}", "pair_id": label,
            "tim1_material": "LHS synthetic TIM-1", "tim2_material": "LHS synthetic TIM-2",
            "tim2_CTE_per_K": tmpl["tim2_CTE_per_K"],
            "tim1_BLT_m": g(float(r["tim1_BLT_um"]) * 1e-6),
            "tim2_BLT_m": g(float(r["tim2_BLT_um"]) * 1e-6),
            "tim2_state_case": "lhs_sample",
            "tim1_property_basis": "lhs_sample;grid_min_max;k_E_log",
            "tim2_property_basis": "lhs_sample;grid_min_max;k_E_log;CTE_fixed",
        })
        out.append(blank(r))
    return out


lhs_rows = lhs(N_TRAIN, SEED, "LHS-TRAIN", "LHS-T") + lhs(N_HOLD, SEED + 1, "LHS-HOLDOUT", "LHS-H")

for name, data in [("validation_runs.csv", val), ("lhs_runs.csv", lhs_rows)]:
    with open(HERE / name, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols, quoting=csv.QUOTE_NONNUMERIC)
        w.writeheader()
        w.writerows(data)
    print(name, len(data))
print("LHS bounds:", {c: span(c) for c, _ in dims})
