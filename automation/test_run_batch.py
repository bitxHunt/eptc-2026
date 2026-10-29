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
                              "tim1_vm_avg": "827170 [Pa]", "tim2_vm_avg": "0.18 [MPa]"}, 2)
        self.assertEqual(row["theta_jc_C_W"], "0.1")
        self.assertEqual(row["tim1_vm_avg_MPa"], "0.82717")
        self.assertEqual(row["tim2_vm_avg_MPa"], "0.18")
        self.assertEqual(row["Tcase_C"], "60")

    def test_theta_uses_heat_out_and_warpage(self):
        # V2 baseline values from 29 Oct
        row = rb.convert_row({"run_id": "R1", "status": "solved", "Tj": "131.04 [C]", "Tcase": "117.9 [C]",
                              "Q_out": "-380 [W]", "warp_y_max": "7.5081E-06 [m]",
                              "warp_y_min": "-1.8739E-05 [m]"}, 1)
        self.assertEqual(row["theta_jc_C_W"], "%.6g" % (13.14 / 380))
        self.assertEqual(row["heat_balance_rel_error"], "0.05")
        self.assertEqual(row["warpage_um"], "26.2471")

    def test_thin_layer_equivalence(self):
        row = rb.thin_layer({"run_id": "R1", "k1": 4.0, "E1": 1e6, "blt1": 25.0, "k2": 5.0, "E2": 1e4, "blt2": 50.0})
        self.assertAlmostEqual(row["k1"], 8.0)      # half the thickness = twice the conductance
        self.assertAlmostEqual(row["E1"], 2e6)
        self.assertAlmostEqual(row["k2"], 15.0)     # modelled TIM-2 is 150 um
        self.assertAlmostEqual(row["E2"], 3e4)
        self.assertEqual(row["blt1"], 25.0)         # the real BLT is kept for the AI side

    def test_no_theta_without_tcase(self):
        row = rb.convert_row({"run_id": "R1", "status": "solved", "Tj": "629.255249023438 [C]"}, 1)
        self.assertEqual(row["theta_jc_C_W"], "")

    def test_bad_quantity_marks_failed(self):
        row = rb.convert_row({"run_id": "R1", "status": "solved", "Tj": "n/a"}, 1)
        self.assertEqual(row["status"], "failed")

    def test_blt_is_not_ignored(self):
        found = rb.ignored_inputs(rb.read_inputs(self.write_inputs()))
        self.assertNotIn("blt1", found)   # handled by thin-layer equivalence
        self.assertNotIn("h", found)

    def test_dry_run_resumes(self):
        inputs = self.write_inputs()
        out = self.tmp / "out.csv"
        rb.append_outputs(out, [rb.convert_row({"run_id": "R1", "status": "solved", "Tj": "90 [C]"}, 1)])
        self.assertEqual(rb.main([str(inputs), "--out", str(out), "--dry-run", "--chunk", "1"]), 0)

    def test_failed_designs_retried_once(self):
        # R2 fails on the first pass (say, a licence outage) and solves on the retry
        calls = []

        def fake_chunk(n, rows, args, work):
            calls.append([r["run_id"] for r in rows])
            first = len(calls) <= 2
            return [rb.convert_row({"run_id": r["run_id"], "Tj": "90 [C]",
                                    "status": "failed" if first and r["run_id"] == "R2" else "solved"}, n)
                    for r in rows]

        inputs, out = self.write_inputs(), self.tmp / "out.csv"
        fake_exe = self.tmp / "RunWB2.exe"
        fake_exe.write_text("")
        real = rb.run_chunk
        rb.run_chunk = fake_chunk
        try:
            rb.main([str(inputs), "--out", str(out), "--chunk", "2", "--runwb2", str(fake_exe),
                     "--archive", str(fake_exe), "--work", str(self.tmp / "work")])
        finally:
            rb.run_chunk = real
        self.assertEqual(calls, [["R1", "R2"], ["R3"], ["R2"]])
        self.assertEqual(rb.done_ids(out), {"R1", "R2", "R3"})


if __name__ == "__main__":
    unittest.main()
