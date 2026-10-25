"""Gaussian process surrogate: one GP per output.

Inputs go to the unit cube (log10 first for k and E). Stress outputs are
learned as log10, since they span orders of magnitude. Only rows with
status == "solved" are used.

Usage: python surrogate.py <train_outputs.csv> <holdout_outputs.csv> [out_dir]
"""
import sys
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.exceptions import ConvergenceWarning
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import ConstantKernel, Matern, WhiteKernel
from sklearn.metrics import mean_squared_error, r2_score

from contract import INPUTS, INPUT_COLS, LOG_OUTPUTS, OUTPUT_COLS, STATUS_COL


def to_unit(X):
    """Physical inputs (DataFrame or array in INPUT_COLS order) -> unit cube."""
    X = np.asarray(X[INPUT_COLS] if isinstance(X, pd.DataFrame) else X, dtype=float)
    U = np.empty_like(X)
    for j, (lo, hi, scale) in enumerate(INPUTS.values()):
        if scale == "log":
            U[:, j] = (np.log10(X[:, j]) - np.log10(lo)) / (np.log10(hi) - np.log10(lo))
        elif scale == "fixed":
            U[:, j] = 0.0
        else:
            U[:, j] = (X[:, j] - lo) / (hi - lo)
    return U


class Surrogate:
    def __init__(self, outputs=None, seed=0):
        # None: every contract output that the training data actually has
        self.outputs = None if outputs is None else list(outputs)
        self.seed = seed
        self.gps = {}
        self.log_cols = set()

    def _kernel(self):
        d = len(INPUT_COLS)
        return (ConstantKernel(1.0, (1e-3, 1e3))
                * Matern(length_scale=np.ones(d), length_scale_bounds=(1e-2, 1e2), nu=2.5)
                + WhiteKernel(1e-3, (1e-8, 1e-1)))

    def fit(self, df):
        df = df[df[STATUS_COL] == "solved"]
        if self.outputs is None:
            self.outputs = [c for c in OUTPUT_COLS if c in df and df[c].notna().all()]
        U = to_unit(df)
        for col in self.outputs:
            y = df[col].values.astype(float)
            # log10 only when every value is positive (a principal stress can be negative)
            if col in LOG_OUTPUTS and (y > 0).all():
                self.log_cols.add(col)
                y = np.log10(y)
            gp = GaussianProcessRegressor(self._kernel(), normalize_y=True,
                                          n_restarts_optimizer=3, random_state=self.seed)
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", ConvergenceWarning)
                gp.fit(U, y)
            self.gps[col] = gp
        return self

    def predict(self, X, return_std=False):
        """Predictions in physical units. std is in the learned space (log10 for log_cols)."""
        U = to_unit(X)
        mean, std = {}, {}
        for col, gp in self.gps.items():
            m, s = gp.predict(U, return_std=True)
            mean[col] = 10 ** m if col in self.log_cols else m
            std[col] = s
        mean = pd.DataFrame(mean)
        return (mean, pd.DataFrame(std)) if return_std else mean

    def score(self, df):
        df = df[df[STATUS_COL] == "solved"]
        pred = self.predict(df)
        rows = []
        for col in self.outputs:
            y, p = df[col].values, pred[col].values
            rows.append({"output": col, "r2": r2_score(y, p),
                         "rmse": np.sqrt(mean_squared_error(y, p)),
                         "mape_pct": 100 * np.mean(np.abs((p - y) / y))})
        return pd.DataFrame(rows)

    def save(self, path):
        joblib.dump(self, path)

    @staticmethod
    def load(path):
        return joblib.load(path)


def main(train_csv, holdout_csv, out_dir="out"):
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    sur = Surrogate().fit(pd.read_csv(train_csv))
    report = sur.score(pd.read_csv(holdout_csv))
    report.to_csv(out / "surrogate_holdout.csv", index=False, float_format="%.4g")
    sur.save(out / "surrogate.joblib")
    print(report.to_string(index=False, float_format=lambda v: f"{v:.4g}"))
    return sur, report


if __name__ == "__main__":
    main(*sys.argv[1:])
