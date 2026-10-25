"""Latin hypercube designs in the data/inputs CSV format.

Training and held-out rows are separate hypercubes, so the held-out rows are
not just leftovers of the training design.

Usage: python sample.py [n_train] [n_test] [out_dir]
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import qmc

from contract import INPUTS, INPUT_COLS

SEED = 2026


def to_physical(u):
    """Map unit-cube points to the input ranges (log or linear per input)."""
    cols = {}
    for j, (name, (lo, hi, scale)) in enumerate(INPUTS.items()):
        if scale == "log":
            cols[name] = 10 ** (np.log10(lo) + u[:, j] * (np.log10(hi) - np.log10(lo)))
        elif scale == "fixed":
            cols[name] = np.full(len(u), lo)
        else:
            cols[name] = lo + u[:, j] * (hi - lo)
    return pd.DataFrame(cols)[INPUT_COLS]


def lhs(n, prefix, seed):
    u = qmc.LatinHypercube(d=len(INPUTS), optimization="random-cd", seed=seed).random(n)
    df = to_physical(u)
    df.insert(0, "run_id", [f"{prefix}{i + 1:04d}" for i in range(n)])
    return df


def main(n_train=150, n_test=25, out_dir="out"):
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    train, test = lhs(n_train, "T", SEED), lhs(n_test, "H", SEED + 1)
    train.to_csv(out / "inputs_train.csv", index=False, float_format="%.6g")
    test.to_csv(out / "inputs_holdout.csv", index=False, float_format="%.6g")
    print(f"  {n_train} training rows, {n_test} held-out rows -> {out}")
    return train, test


if __name__ == "__main__":
    a = sys.argv[1:]
    main(int(a[0]) if a else 150, int(a[1]) if len(a) > 1 else 25, a[2] if len(a) > 2 else "out")
