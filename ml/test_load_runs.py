"""Tests for load_runs.py that need no Ansys: python -m unittest ml/test_load_runs.py"""

import sys
import tempfile
import unittest
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
import load_runs  # noqa: E402

INPUTS = {
    "run_id": ["A", "B", "C"], "dataset_role": ["train", "holdout", "train"],
    "tim1_k_W_mK": [2.5, 30, 82], "tim1_E_Pa": [3e5, 1e8, 1.274e10], "tim1_CTE_per_K": [1.8e-4, 6e-5, 2.5e-5],
    "tim1_BLT_um": [30, 40, 50], "tim2_k_W_mK": [2.9, 4, 8.5], "tim2_E_Pa": [1e4, 1e4, 1e6],
    "tim2_CTE_per_K": [1.5e-4] * 3, "tim2_BLT_um": [30, 40, 50],
}


class LoadRunsTest(unittest.TestCase):
    def load(self, outputs):
        tmp = Path(tempfile.mkdtemp())
        pd.DataFrame(INPUTS).to_csv(tmp / "in.csv", index=False)
        pd.DataFrame(outputs).to_csv(tmp / "out.csv", index=False)
        return load_runs.load(tmp / "in.csv", tmp / "out.csv")

    def test_units_split_and_last_attempt(self):
        # C failed first, then solved on a retry: the last row counts
        train, holdout = self.load({
            "run_id": ["A", "B", "C", "C"], "status": ["solved", "solved", "failed", "solved"],
            "Tj_C": [130, 116, None, 115], "theta_jc_C_W": [0.05, 0.012, None, 0.010],
            "warpage_um": [40, 30, None, 20]})
        self.assertEqual(list(train.run_id), ["A", "C"])
        self.assertEqual(list(holdout.run_id), ["B"])
        self.assertAlmostEqual(train.E1[0], 0.3)        # Pa to MPa
        self.assertAlmostEqual(train.a1[0], 180.0)      # 1/K to ppm/K
        self.assertEqual(train.Tj[1], 115)

    def test_failed_runs_dropped(self):
        train, holdout = self.load({"run_id": ["A", "B", "C"], "status": ["solved", "failed", "solved"],
                                    "Tj_C": [130, None, 115]})
        self.assertEqual(list(train.run_id), ["A", "C"])
        self.assertTrue(holdout.empty)


if __name__ == "__main__":
    unittest.main()
