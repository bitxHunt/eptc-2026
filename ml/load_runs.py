"""Turn a batch runner results file into the contract table the surrogate trains on.

The runner (automation/run_batch.py) writes data/outputs/<batch>_outputs.csv with
results only. This joins it back to the inputs CSV on run_id, renames the columns
and converts units to the ones in contract.py.

Rows whose pair_id contains "HOLDOUT" (as in data/inputs/lhs_runs.csv) form the
held-out set. Without a pair_id column, a seeded 15% of rows is held out.

Usage: python load_runs.py <inputs.csv> <outputs.csv> [out_dir]
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

from contract import INPUT_COLS, STATUS_COL

# inputs CSV column -> (contract column, factor to contract units)
INPUT_MAP = {
    "tim1_k_W_mK": ("k1", 1.0), "tim1_E_Pa": ("E1", 1e-6),
    "tim1_CTE_per_K": ("a1", 1e6), "tim1_BLT_um": ("blt1", 1.0),
    "tim2_k_W_mK": ("k2", 1.0), "tim2_E_Pa": ("E2", 1e-6),
    "tim2_CTE_per_K": ("a2", 1e6), "tim2_BLT_um": ("blt2", 1.0),
}
# runner output column -> (contract column, factor to contract units)
OUTPUT_MAP = {
    "Tj_C": ("Tj", 1.0), "Tcase_C": ("Tcase", 1.0), "Tcase_avg_C": ("Tcase_avg", 1.0),
    "theta_jc_C_W": ("theta_jc", 1.0),
    "tim1_vm_avg_MPa": ("tim1_vm_avg", 1.0), "tim1_vm_max_MPa": ("tim1_vm_max", 1.0),
    "tim2_vm_avg_MPa": ("tim2_vm_avg", 1.0), "tim2_vm_max_MPa": ("tim2_vm_max", 1.0),
    "tim1_edge_shear_max_MPa": ("tim1_edge_tau_max", 1.0),
    "tim1_edge_shear_avg_MPa": ("tim1_edge_tau_avg", 1.0),
    "tim2_edge_shear_max_MPa": ("tim2_edge_tau_max", 1.0),
    "tim2_edge_shear_avg_MPa": ("tim2_edge_tau_avg", 1.0),
    "warpage_um": ("warpage", 1.0),
}
HOLDOUT_FRACTION, SEED = 0.15, 2026


def _convert(df, mapping):
    out = pd.DataFrame(index=df.index)
    for src, (dst, factor) in mapping.items():
        if src in df:
            out[dst] = pd.to_numeric(df[src], errors="coerce") * factor
    return out


def load(inputs_csv, outputs_csv):
    """Return (train, holdout) DataFrames in contract columns and units, solved rows only."""
    ins = pd.read_csv(inputs_csv, encoding="utf-8-sig")
    outs = pd.read_csv(outputs_csv)
    # The contract names (k1, E1 ...) are accepted as they are
    x = pd.concat([ins[["run_id"]], _convert(ins, INPUT_MAP),
                   ins[[c for c in INPUT_COLS if c in ins]]], axis=1)
    missing = [c for c in INPUT_COLS if c not in x]
    if missing:
        raise ValueError(f"inputs CSV has no column for {missing}")
    if "dataset_role" in ins:
        # TIM_balanced_DOE_144.csv: one holdout row per TIM pair
        x["holdout"] = ins["dataset_role"].astype(str).str.lower().eq("holdout")
    elif "pair_id" in ins:
        x["holdout"] = ins["pair_id"].astype(str).str.contains("HOLDOUT")
    else:
        x["holdout"] = np.random.default_rng(SEED).random(len(ins)) < HOLDOUT_FRACTION

    # Keep the last attempt of each run_id (a failed run that was retried appears twice)
    outs = outs.drop_duplicates("run_id", keep="last")
    y = pd.concat([outs[["run_id", STATUS_COL]], _convert(outs, OUTPUT_MAP)], axis=1)

    df = x.merge(y, on="run_id", how="inner")
    df = df[df[STATUS_COL] == "solved"]
    train = df[~df.holdout].drop(columns="holdout").reset_index(drop=True)
    holdout = df[df.holdout].drop(columns="holdout").reset_index(drop=True)
    return train, holdout


def main(inputs_csv, outputs_csv, out_dir="out"):
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    train, holdout = load(inputs_csv, outputs_csv)
    train.to_csv(out / "outputs_train.csv", index=False, float_format="%.6g")
    holdout.to_csv(out / "outputs_holdout.csv", index=False, float_format="%.6g")
    print(f"  {len(train)} training rows, {len(holdout)} held-out rows (solved only) -> {out}")
    return train, holdout


if __name__ == "__main__":
    main(*sys.argv[1:])
