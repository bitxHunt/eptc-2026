"""End to end: Ansys results -> GP surrogate -> NSGA-II -> sensitivity.

Usage (from ml/):
    python run_all.py <inputs.csv> <outputs.csv>    # real Ansys results from the batch runner
    python run_all.py --demo                         # stand-in physics, no Ansys needed

Example:
    python run_all.py ../data/inputs/lhs_runs.csv ../data/outputs/lhs_runs_outputs.csv
"""
import argparse
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

import fake_physics
import load_runs
import optimise
import sample
import sensitivity
import surrogate
from contract import stress_cols

OUT = Path(__file__).parent / "out"


def parity_plot(sur, holdout, label):
    cols = ["Tj", "theta_jc"] + stress_cols(sur.outputs)
    cols = [c for c in cols if c in sur.outputs]
    pred = sur.predict(holdout)
    fig, axes = plt.subplots(1, len(cols), figsize=(3.2 * len(cols), 3.2))
    for ax, c in zip(axes, cols):
        y, p = holdout[c], pred[c]
        ax.scatter(y, p, s=14, color="#b05a2a")
        lo, hi = min(y.min(), p.min()), max(y.max(), p.max())
        ax.plot([lo, hi], [lo, hi], "k--", lw=0.8)
        if c in sur.log_cols:
            ax.set_xscale("log"); ax.set_yscale("log")
        ax.set_title(c); ax.set_xlabel("Simulated"); ax.set_ylabel("Surrogate")
    fig.suptitle(f"Surrogate vs held-out runs ({label})")
    fig.tight_layout()
    fig.savefig(OUT / "figures" / "parity.png", dpi=160)
    plt.close(fig)


def demo_data():
    print("1. Stand-in physics: sanity check against Hu et al. (0.10 to 0.23 C/W)")
    fake_physics.sanity_check()
    print("2. Latin hypercube and stand-in runs")
    train_in, test_in = sample.main(150, 25, OUT)
    fake_physics.run(train_in, seed=1).to_csv(OUT / "outputs_train.csv", index=False,
                                              float_format="%.6g")
    fake_physics.run(test_in, seed=2).to_csv(OUT / "outputs_holdout.csv", index=False,
                                             float_format="%.6g")


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    p.add_argument("inputs", nargs="?", help="inputs CSV given to the batch runner")
    p.add_argument("outputs", nargs="?", help="results CSV written by the batch runner")
    p.add_argument("--demo", action="store_true", help="use the stand-in physics instead of Ansys")
    a = p.parse_args(argv)
    if not a.demo and not (a.inputs and a.outputs):
        p.error("give the inputs and outputs CSVs, or --demo")

    (OUT / "figures").mkdir(parents=True, exist_ok=True)
    if a.demo:
        demo_data()
        label = "stand-in physics"
    else:
        print("1-2. Loading Ansys results")
        load_runs.main(a.inputs, a.outputs, OUT)
        label = "Ansys"

    print("3. GP surrogate, held-out error")
    sur, _ = surrogate.main(OUT / "outputs_train.csv", OUT / "outputs_holdout.csv", OUT)
    parity_plot(sur, pd.read_csv(OUT / "outputs_holdout.csv"), label)

    print("4. NSGA-II on the surrogate")
    optimise.main(OUT / "surrogate.joblib", OUT)

    print("5. Sensitivity (first-order Sobol)")
    sensitivity.main(OUT / "surrogate.joblib", OUT)
    print(f"Done. Figures in {OUT / 'figures'}")


if __name__ == "__main__":
    main()
