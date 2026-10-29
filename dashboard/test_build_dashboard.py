"""Tests for build_dashboard.py: python -m unittest dashboard/test_build_dashboard.py

Trains a small surrogate on made-up data, so no Ansys and no ml/out/ are needed.
"""

import sys
import unittest
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_dashboard as bd  # noqa: E402
from contract import INPUT_COLS  # noqa: E402  (ml/ is on the path via build_dashboard)
from sample import to_physical  # noqa: E402
from surrogate import Surrogate  # noqa: E402


class ExportTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        x = to_physical(np.random.default_rng(0).random((30, len(INPUT_COLS))))
        df = x.assign(status="solved", theta_jc=0.4 / x.k1 + 0.01,
                      tim1_edge_tau_max=0.002 * x.E1 ** 0.9, tim2_edge_tau_max=0.01 * x.E2)
        cls.sur = Surrogate(outputs=["theta_jc", "tim1_edge_tau_max", "tim2_edge_tau_max"]).fit(df)
        cls.x = to_physical(np.random.default_rng(1).random((10, len(INPUT_COLS))))

    def test_export_matches_sklearn(self):
        bd.check_export(self.sur, bd.gp_export(self.sur), self.x)

    def test_check_export_catches_a_wrong_export(self):
        gps = bd.gp_export(self.sur)
        gps["theta_jc"]["ys"] *= 1.01
        with self.assertRaises(RuntimeError):
            bd.check_export(self.sur, gps, self.x)

    def test_pareto_mask(self):
        a = np.array([1.0, 2.0, 3.0, 2.0])
        b = np.array([3.0, 2.0, 1.0, 3.0])     # the last point is beaten by (2, 2)
        self.assertEqual(list(bd.pareto_mask(a, b)), [True, True, True, False])


if __name__ == "__main__":
    unittest.main()
