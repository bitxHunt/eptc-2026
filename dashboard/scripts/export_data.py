"""Export the batch results and the trained surrogate for the dashboard app.

Writes dashboard/src/data/dashboard.json, which the React app imports at build
time. The GP mean is exported (training inputs, alpha, kernel settings) so the
app predicts new designs in the browser; check_export() stops the export if
that no longer reproduces scikit-learn.

Run from the repo root after ml/run_all.py:
    python dashboard/scripts/export_data.py
    python dashboard/scripts/export_data.py <inputs.csv> <outputs.csv>
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ml"))

from contract import INPUTS, INPUT_COLS, POWER_W, T_AMB, stress_cols  # noqa: E402
from load_runs import load  # noqa: E402
from surrogate import Surrogate, to_unit  # noqa: E402

ML_OUT = ROOT / "ml" / "out"
INPUTS_CSV = ROOT / "data" / "inputs" / "TIM_balanced_DOE_144.csv"
OUTPUTS_CSV = ROOT / "data" / "outputs" / "TIM_balanced_DOE_144_outputs.csv"
OUT = ROOT / "dashboard" / "src" / "data" / "dashboard.json"

# Outputs shown on the page, in display order
SHOWN = ["Tj", "theta_jc", "tim1_edge_tau_max", "tim2_edge_tau_max", "warpage", "Tcase"]


def clean(name):
    """Material names as written in the CSV, with the Windows-1252 debris fixed."""
    return (str(name).replace("™", "").replace("—", "-").replace("–", "-")
            .replace("�", "-").strip())


def short(name):
    for key, label in [("indium", "Indium (solder)"), ("silver", "Heraeus Ag paste"),
                       ("7935", "Shin-Etsu X23-7935-11"), ("8131", "Shin-Etsu X23-8131"),
                       ("TGR", "Bergquist TGR 4000"), ("5026", "Dowsil TC-5026"),
                       ("5888", "Dowsil TC-5888"), ("PTM", "Honeywell PTM7950")]:
        if key.lower() in name.lower():
            return label
    return name


def products(ins, t):
    rows = []
    for name, g in ins.groupby(f"{t}_material"):
        rows.append({
            "name": short(clean(name)), "full": clean(name),
            "k": float(g[f"{t}_k_W_mK"].iloc[0]),
            "E": sorted(float(v) * 1e-6 for v in g[f"{t}_E_Pa"].unique()),
            "cte": sorted(float(v) * 1e6 for v in g[f"{t}_CTE_per_K"].unique()),
            "basis": str(g[f"{t}_property_basis"].iloc[0]),
        })
    return sorted(rows, key=lambda r: r["k"])


def gp_export(sur):
    out = {}
    for col, gp in sur.gps.items():
        prod = gp.kernel_.k1          # ConstantKernel * Matern (the WhiteKernel adds nothing off the diagonal)
        out[col] = {
            "c": float(prod.k1.constant_value),
            "ls": [float(v) for v in np.atleast_1d(prod.k2.length_scale)],
            "X": [[float(v) for v in row] for row in gp.X_train_],
            "alpha": [float(v) for v in gp.alpha_],
            # Private attributes of GaussianProcessRegressor: check_export() catches a change
            "ym": float(gp._y_train_mean), "ys": float(gp._y_train_std),
            "log": col in sur.log_cols,
        }
    return out


def export_predict(g, U):
    """The app's prediction (src/lib/gp.ts) in NumPy, for one exported GP."""
    d = np.sqrt((((U[:, None, :] - np.asarray(g["X"])[None]) / np.asarray(g["ls"])) ** 2).sum(-1))
    k = g["c"] * (1 + np.sqrt(5) * d + 5 / 3 * d ** 2) * np.exp(-np.sqrt(5) * d)
    y = k @ np.asarray(g["alpha"]) * g["ys"] + g["ym"]
    return 10 ** y if g["log"] else y


def check_export(sur, gps, X, tol=1e-6):
    """Stop the build if the exported GPs no longer reproduce sklearn's predictions."""
    ref, U = sur.predict(X), to_unit(X)
    for col, g in gps.items():
        err = np.max(np.abs(export_predict(g, U) - ref[col].values) / np.abs(ref[col].values))
        if err > tol:
            raise RuntimeError(f"exported GP for {col} is off by {err:.2e} (sklearn version change?)")


def pareto_mask(a, b):
    """Non-dominated rows when minimising both a and b."""
    keep = np.ones(len(a), bool)
    for i in range(len(a)):
        keep[i] = not np.any((a <= a[i]) & (b <= b[i]) & ((a < a[i]) | (b < b[i])))
    return keep


def main(inputs_csv=INPUTS_CSV, outputs_csv=OUTPUTS_CSV):
    ins = pd.read_csv(inputs_csv, encoding="utf-8-sig")
    train, holdout = load(inputs_csv, outputs_csv)
    train["role"], holdout["role"] = "train", "holdout"
    runs = pd.concat([train, holdout], ignore_index=True)
    meta = ins.set_index("run_id")[["pair_id", "tim1_material", "tim2_material"]]
    runs = runs.join(meta, on="run_id")
    runs["tim1"] = runs.tim1_material.map(lambda s: short(clean(s)))
    runs["tim2"] = runs.tim2_material.map(lambda s: short(clean(s)))

    sur = Surrogate.load(ML_OUT / "surrogate.joblib")
    gps = gp_export(sur)
    check_export(sur, gps, runs)
    stress = stress_cols(sur.outputs)
    runs["stress_obj"] = runs[stress].max(axis=1)
    runs["pareto"] = pareto_mask(runs.theta_jc.values, runs.stress_obj.values)

    hp = sur.predict(holdout)
    holdout_pred = [{"run_id": r, **{c: float(hp[c].iloc[i]) for c in SHOWN if c in hp}}
                    for i, r in enumerate(holdout.run_id)]
    scores = pd.read_csv(ML_OUT / "surrogate_holdout.csv")
    sens = pd.read_csv(ML_OUT / "sensitivity.csv", index_col=0)
    front = pd.read_csv(ML_OUT / "pareto.csv")

    run_cols = ["run_id", "pair_id", "role", "tim1", "tim2", *INPUT_COLS,
                *[c for c in SHOWN if c in runs], "stress_obj", "pareto"]
    data = {
        "power_w": POWER_W, "t_amb_c": T_AMB,
        "n_total": int(len(ins)), "n_solved": int(len(runs)),
        "n_train": int(len(train)), "n_holdout": int(len(holdout)),
        "inputs": {k: list(v) for k, v in INPUTS.items()}, "input_cols": INPUT_COLS,
        "stress_cols": stress,
        "tim1": products(ins, "tim1"), "tim2": products(ins, "tim2"),
        "runs": json.loads(runs[run_cols].to_json(orient="records", double_precision=6)),
        "holdout_pred": holdout_pred,
        "scores": json.loads(scores.to_json(orient="records", double_precision=6)),
        "sensitivity": {"inputs": list(sens.index),
                        **{c: [float(v) for v in sens[c]] for c in sens.columns}},
        "front": json.loads(front[[*INPUT_COLS, "theta_jc", "stress_obj"]]
                            .to_json(orient="records", double_precision=5)),
        "gp": gps,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(data, separators=(",", ":"))
    OUT.write_text(text, encoding="utf-8")
    print(f"  {len(runs)} solved runs ({len(train)} train, {len(holdout)} holdout) -> "
          f"{OUT} ({len(text) / 1024:.0f} KB)")


if __name__ == "__main__":
    main(*sys.argv[1:])
