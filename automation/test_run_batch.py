"""Tests for run_batch.py that need no Ansys: python -m unittest automation/test_run_batch.py"""

import csv
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import run_batch as rb  # noqa: E402


class RunBatchTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())

    def write_inputs(self):
        path = self.tmp / "in.csv"
        with open(path, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["run_id", "tim1_k_W_mK", "tim1_E_Pa", "tim1_CTE_per_K", "tim1_BLT_um", "tim2_k_W_mK", "notes"])
            w.writerow(["R1", "2.5", "300000", "8e-05", "30", "2.9", "x"])
            w.writerow(["R2", "30", "1e9", "3e-05", "50", "4", "y"])
            w.writerow(["R3", "82", "1.274e10", "2.48e-05", "40", "8.5", "z"])
        return path

    def test_aliases_map_to_contract(self):
        rows = rb.read_inputs(self.write_inputs())
        self.assertEqual(rows[0], {"run_id": "R1", "k1": 2.5, "E1": 300000.0, "a1": 8e-05, "blt1": 30.0, "k2": 2.9})

    def test_resume_skips_solved_and_retries_failed(self):
        out = self.tmp / "out.csv"
        rb.append_outputs(out, [rb.convert_row({"run_id": "R1", "status": "solved", "Tj": "90 [C]"}, 1),
                                rb.convert_row({"run_id": "R2", "status": "failed", "error_message": "boom"}, 1)])
        self.assertEqual(rb.done_ids(out), {"R1"})
        self.assertEqual(rb.done_ids(out, retry_failed=False), {"R1", "R2"})

    def test_units_and_theta_jc(self):
        row = rb.convert_row({"run_id": "R1", "status": "solved", "Tj": "100 [C]", "Tcase": "60 [C]",
                              "tim1_s1_max": "26273441.7 [Pa]", "tim2_s1_max": "31.6 [MPa]"}, 2)
        self.assertEqual(row["theta_jc_C_W"], "0.1")
        self.assertEqual(row["tim1_s1_max_MPa"], "26.2734")
        self.assertEqual(row["tim2_s1_max_MPa"], "31.6")
        self.assertEqual(row["Tcase_C"], "60")

    def test_no_theta_without_tcase(self):
        row = rb.convert_row({"run_id": "R1", "status": "solved", "Tj": "629.255249023438 [C]"}, 1)
        self.assertEqual(row["theta_jc_C_W"], "")

    def test_bad_quantity_marks_failed(self):
        row = rb.convert_row({"run_id": "R1", "status": "solved", "Tj": "n/a"}, 1)
        self.assertEqual(row["status"], "failed")

    def test_ignored_inputs_warns_on_blt(self):
        found = rb.ignored_inputs(rb.read_inputs(self.write_inputs()))
        self.assertIn("blt1", found)
        self.assertNotIn("h", found)

    def test_dry_run_resumes(self):
        inputs = self.write_inputs()
        out = self.tmp / "out.csv"
        rb.append_outputs(out, [rb.convert_row({"run_id": "R1", "status": "solved", "Tj": "90 [C]"}, 1)])
        self.assertEqual(rb.main([str(inputs), "--out", str(out), "--dry-run", "--chunk", "1"]), 0)


if __name__ == "__main__":
    unittest.main()
