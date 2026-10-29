"""NSGA-II on the surrogate: the trade-off between cooling and TIM stress.

Objective 1: theta_jc (junction to case, C/W).
Objective 2: the worse of the two TIMs' stress from contract.stress_cols (edge
max shear for Ansys runs).
Constraint: Tj <= TJ_LIMIT, only when TJ_LIMIT is set.

Usage: python optimise.py [surrogate.joblib] [out_dir]
"""
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from pymoo.algorithms.moo.nsga2 import NSGA2
from pymoo.core.problem import Problem
from pymoo.optimize import minimize

from contract import INPUT_COLS, stress_cols
from sample import to_physical
from surrogate import Surrogate

# No Tj limit for the V2 runs: with 150 W/m2K every design sits at 115-132 C,
# and most of that comes from the heat sink, not the TIM (Hu et al.: "the
# thermal module dominates"). The ranking uses theta_jc, which does not depend
# on the cooling choice. Set a number here to bring the constraint back.
TJ_LIMIT = None


class TimProblem(Problem):
    """Decision variables live on the unit cube, mapped to physical units like the sampler."""

    def __init__(self, sur):
        n_constr = 0 if TJ_LIMIT is None else 1
        super().__init__(n_var=len(INPUT_COLS), n_obj=2, n_ieq_constr=n_constr, xl=0.0, xu=1.0)
        self.sur = sur
        self.stress = stress_cols(sur.outputs)

    def _evaluate(self, u, out, *args, **kwargs):
        p = self.sur.predict(to_physical(u))
        out["F"] = np.column_stack([p.theta_jc, p[self.stress].max(axis=1)])
        if TJ_LIMIT is not None:
            out["G"] = (p.Tj - TJ_LIMIT).values[:, None]


def main(model="out/surrogate.joblib", out_dir="out"):
    out = Path(out_dir)
    (out / "figures").mkdir(parents=True, exist_ok=True)
    sur = Surrogate.load(model)
    problem = TimProblem(sur)
    res = minimize(problem, NSGA2(pop_size=100), ("n_gen", 150), seed=1, verbose=False)

    front = to_physical(res.X)
    pred = sur.predict(front)
    front[pred.columns] = pred.values
    front["stress_obj"] = pred[problem.stress].max(axis=1)
    kind = ("edge max shear" if "edge" in problem.stress[0]
            else "average principal" if problem.stress[0].endswith("avg") else "maximum principal")
    front = front.sort_values("theta_jc").reset_index(drop=True)
    front.to_csv(out / "pareto.csv", index=False, float_format="%.5g")

    fig, ax = plt.subplots(figsize=(6, 4.2))
    sc = ax.scatter(front.theta_jc, front.stress_obj, c=front.k1, cmap="viridis",
                    norm=matplotlib.colors.LogNorm(), s=22)
    fig.colorbar(sc, label="TIM-1 conductivity k1 (W/mK)")
    ax.set_xlabel("Junction-to-case resistance θJC (°C/W)")
    ax.set_ylabel(f"Worse TIM {kind} stress (MPa)")
    if (front.stress_obj > 0).all():
        ax.set_yscale("log")
    ax.set_title("Pareto front on the surrogate")
    fig.tight_layout()
    fig.savefig(out / "figures" / "pareto.png", dpi=160)
    plt.close(fig)
    print(f"  {len(front)} Pareto designs, theta_jc {front.theta_jc.min():.3f} to "
          f"{front.theta_jc.max():.3f} C/W, stress {front.stress_obj.min():.3g} to "
          f"{front.stress_obj.max():.3g} MPa")
    return front


if __name__ == "__main__":
    main(*sys.argv[1:])
