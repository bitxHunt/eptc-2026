"""Which inputs matter: first-order Sobol indices estimated on the surrogate.

For each input, S_i = Var(E[Y | X_i]) / Var(Y), estimated by binning a large
Monte Carlo sample of the surrogate into quantile bins of X_i. Cheap because it
never calls Ansys. Indices are computed on the unit cube, so k and E are
sampled on their log scale, as in the design.

Usage: python sensitivity.py [surrogate.joblib] [out_dir]
"""
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from contract import INPUT_COLS, INPUTS, stress_cols
from sample import to_physical
from surrogate import Surrogate

N_MC, N_BINS = 20_000, 25


def targets(sur):
    """theta_jc, Tj, the TIM stresses and warpage, as far as the surrogate has them."""
    wanted = ["theta_jc", "Tj"] + stress_cols(sur.outputs) + ["warpage"]
    return [t for t in wanted if t in sur.outputs]


def first_order(u, y, bins=N_BINS):
    var = y.var()
    s = []
    for j in range(u.shape[1]):
        idx = np.minimum((u[:, j] * bins).astype(int), bins - 1)
        means = pd.Series(y).groupby(idx).mean()
        s.append(means.var(ddof=0) / var)
    return np.array(s)


def main(model="out/surrogate.joblib", out_dir="out"):
    out = Path(out_dir)
    (out / "figures").mkdir(parents=True, exist_ok=True)
    sur = Surrogate.load(model)
    varied = [c for c, (_, _, scale) in INPUTS.items() if scale != "fixed"]
    u = np.random.default_rng(7).random((N_MC, len(INPUT_COLS)))
    pred = sur.predict(to_physical(u))
    u = u[:, [INPUT_COLS.index(c) for c in varied]]

    tgts = targets(sur)
    table = pd.DataFrame({t: first_order(u, np.log10(pred[t].values) if t in sur.log_cols
                                         else pred[t].values) for t in tgts},
                         index=varied)
    table.to_csv(out / "sensitivity.csv", float_format="%.4f")

    fig, axes = plt.subplots(1, len(tgts), figsize=(3 * len(tgts), 3.6), sharey=True)
    for ax, t in zip(axes, tgts):
        ax.barh(varied, table[t], color="#b05a2a")
        ax.set_title(t)
        ax.set_xlim(0, 1)
        ax.invert_yaxis() if ax is axes[0] else None
    axes[0].set_ylabel("Input")
    fig.supxlabel("First-order Sobol index (share of output variance)")
    fig.tight_layout()
    fig.savefig(out / "figures" / "sensitivity.png", dpi=160)
    plt.close(fig)
    print(table.to_string(float_format=lambda v: f"{v:.3f}"))
    return table


if __name__ == "__main__":
    main(*sys.argv[1:])
