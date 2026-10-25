"""Run a CSV of TIM designs through Ansys Workbench in batch mode.

    python automation/run_batch.py data/inputs/<batch>.csv            # run
    python automation/run_batch.py data/inputs/<batch>.csv --dry-run  # only print the plan
    python automation/run_batch.py data/inputs/<batch>.csv --limit 3  # first test

Each chunk of rows is one headless Workbench session (RunWB2.exe -B -R batch.wbjn).
Results are appended to data/outputs/<batch>_outputs.csv as each chunk finishes.
Running the same command again skips run_ids already solved, so an interrupted
batch resumes where it stopped. Standard library only.
"""

import argparse
import csv
import os
import re
import shutil
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
RUNWB2 = r"C:\Program Files\ANSYS Inc\v261\Framework\bin\Win64\RunWB2.exe"
POWER_W = 400.0

# Contract input columns, in contract units: k W/mK, E Pa, a 1/K, blt um, h W/m2K.
INPUT_COLS = ["k1", "E1", "a1", "blt1", "k2", "E2", "a2", "blt2", "h"]
# Contract inputs the model can't vary yet (see PARAMETERS.md). Keep in step with
# the None entries in INPUT_MAP in batch.wbjn.
NOT_IN_MODEL = {"blt1": 50.0, "blt2": 150.0, "h": 10.0}

# Column names used in data/inputs/TIM_pair_simulation_runs.csv, mapped to the contract.
ALIASES = {
    "tim1_k_W_mK": "k1", "tim1_E_Pa": "E1", "tim1_CTE_per_K": "a1", "tim1_BLT_um": "blt1",
    "tim2_k_W_mK": "k2", "tim2_E_Pa": "E2", "tim2_CTE_per_K": "a2", "tim2_BLT_um": "blt2",
}

# Raw output columns from batch.wbjn, and the unit each is stored in here.
RAW_OUTPUTS = {
    "Tj": "C", "Tmin": "C", "Tcase": "C",
    "tim1_s1_max": "MPa", "tim1_s1_min": "MPa", "tim2_s1_max": "MPa", "tim2_s1_min": "MPa",
    "tim1_shear_max": "MPa", "tim1_shear_min": "MPa", "tim2_shear_max": "MPa", "tim2_shear_min": "MPa",
    "warpage": "mm",
}
TO_BASE = {"C": 1.0, "MPa": 1e6, "Pa": 1.0, "kPa": 1e3, "GPa": 1e9, "mm": 1e-3, "m": 1.0, "um": 1e-6}

OUTPUT_HEADER = (["run_id", "status"]
                 + ["%s_%s" % (c, u) for c, u in RAW_OUTPUTS.items()]
                 + ["theta_jc_C_W", "solve_time_s", "chunk", "finished_at", "error_message"])


def log(msg):
    print("[%s] %s" % (datetime.now().strftime("%H:%M:%S"), msg), flush=True)


def read_inputs(path):
    """Read an inputs CSV into contract rows: run_id plus the contract columns present."""
    with open(path, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    out = []
    for r in rows:
        row = {"run_id": r["run_id"]}
        for key, value in r.items():
            col = ALIASES.get(key, key)
            if col in INPUT_COLS and value not in ("", None):
                row[col] = float(value)
        out.append(row)
    return out


def done_ids(out_path, retry_failed=True):
    """run_ids already in the outputs file. Failed ones are retried unless retry_failed is False."""
    if not out_path.exists():
        return set()
    with open(out_path, newline="", encoding="utf-8") as f:
        return {r["run_id"] for r in csv.DictReader(f)
                if r["status"] == "solved" or not retry_failed}


def ignored_inputs(rows):
    """Contract inputs that vary in the rows but are not parameters in the model yet."""
    found = {}
    for col, model_value in NOT_IN_MODEL.items():
        values = {r[col] for r in rows if col in r}
        if values - {model_value}:
            found[col] = (sorted(values), model_value)
    return found


def parse_quantity(text, unit):
    """'629.25 [C]' or '26.27 [MPa]' -> float in `unit`. Bare numbers are taken as `unit`."""
    text = (text or "").strip()
    if not text:
        return None
    m = re.match(r"^\s*([-+0-9.eE]+)\s*(?:\[\s*([^\]]+?)\s*\])?\s*$", text)
    if not m:
        raise ValueError("can't parse quantity %r" % text)
    value, src = float(m.group(1)), (m.group(2) or unit)
    if src == unit:
        return value
    if src not in TO_BASE or unit not in TO_BASE:
        raise ValueError("unknown unit %r in %r" % (src, text))
    return value * TO_BASE[src] / TO_BASE[unit]


def convert_row(raw, chunk):
    """One raw row from batch.wbjn -> one row in OUTPUT_HEADER order."""
    row = {"run_id": raw["run_id"], "status": raw["status"], "chunk": chunk,
           "solve_time_s": raw.get("solve_time_s", ""),
           "finished_at": datetime.now().isoformat(timespec="seconds"),
           "error_message": raw.get("error_message", "")}
    for col, unit in RAW_OUTPUTS.items():
        try:
            v = parse_quantity(raw.get(col, ""), unit)
        except ValueError as e:
            v, row["status"] = None, "failed"
            row["error_message"] = str(e)
        row["%s_%s" % (col, unit)] = "" if v is None else "%.6g" % v
    tj, tc = row["Tj_C"], row["Tcase_C"]
    row["theta_jc_C_W"] = "%.6g" % ((float(tj) - float(tc)) / POWER_W) if tj and tc else ""
    return row


def append_outputs(out_path, rows):
    new = not out_path.exists()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=OUTPUT_HEADER)
        if new:
            w.writeheader()
        w.writerows(rows)


def read_raw(path):
    if not path.exists():
        return []
    lines = [l.rstrip("\r\n") for l in open(path, encoding="utf-8", errors="replace") if l.strip()]
    if not lines:
        return []
    header = lines[0].split("\t")
    return [dict(zip(header, l.split("\t"))) for l in lines[1:]]


def run_chunk(n, rows, args, work):
    """Write the chunk files, run Workbench once, return converted output rows."""
    chunk_dir = work / ("chunk_%03d" % n)
    chunk_dir.mkdir(parents=True, exist_ok=True)
    inputs, raw_out, job = chunk_dir / "inputs.tsv", chunk_dir / "outputs.tsv", chunk_dir / "job.txt"
    cols = ["run_id"] + [c for c in INPUT_COLS if any(c in r for r in rows)]
    with open(inputs, "w", encoding="utf-8") as f:
        f.write("\t".join(cols) + "\n")
        for r in rows:
            f.write("\t".join(str(r.get(c, "")) for c in cols) + "\n")
    if raw_out.exists():
        raw_out.unlink()
    with open(job, "w", encoding="utf-8") as f:
        f.write("archive=%s\nproject=%s\ninputs=%s\noutputs=%s\n"
                % (args.archive.resolve(), (work / "project" / "eptc.wbpj").resolve(), inputs, raw_out))

    cmd = [args.runwb2, "-B", "-R", str(REPO / "automation" / "batch.wbjn")]
    start = time.time()
    try:
        proc = subprocess.run(cmd, env=dict(os.environ, EPTC_JOB=str(job)), cwd=chunk_dir,
                              capture_output=True, text=True, timeout=args.timeout * len(rows))
        (chunk_dir / "runwb2.log").write_text(proc.stdout + "\n--- stderr ---\n" + proc.stderr, encoding="utf-8")
        exit_note = "Workbench exited with code %d" % proc.returncode
    except subprocess.TimeoutExpired:
        exit_note = "Workbench timed out after %d s" % (args.timeout * len(rows))
    log("chunk %d: Workbench session took %.0f s (%s)" % (n, time.time() - start, exit_note))

    got = {r["run_id"]: convert_row(r, n) for r in read_raw(raw_out)}
    # Rows Workbench never reached (crash or timeout) are recorded as failed and retried next time.
    for r in rows:
        if r["run_id"] not in got:
            got[r["run_id"]] = convert_row({"run_id": r["run_id"], "status": "failed",
                                            "error_message": "no result: " + exit_note}, n)
    return [got[r["run_id"]] for r in rows]


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("inputs", type=Path, help="inputs CSV with a run_id column")
    p.add_argument("--out", type=Path, help="outputs CSV (default data/outputs/<inputs name>_outputs.csv)")
    p.add_argument("--chunk", type=int, default=10, help="designs per Workbench session (default 10)")
    p.add_argument("--limit", type=int, help="run at most this many designs")
    p.add_argument("--archive", type=Path, default=REPO / "model" / "eptc.wbpz")
    p.add_argument("--work", type=Path, default=REPO / "work" / "batch", help="scratch folder (gitignored)")
    p.add_argument("--runwb2", default=RUNWB2)
    p.add_argument("--timeout", type=int, default=900, help="seconds allowed per design (default 900)")
    p.add_argument("--no-retry-failed", action="store_true", help="skip failed run_ids instead of retrying them")
    p.add_argument("--dry-run", action="store_true", help="print the plan, run nothing")
    args = p.parse_args(argv)

    out = args.out or REPO / "data" / "outputs" / (args.inputs.stem + "_outputs.csv")
    rows = read_inputs(args.inputs)
    skip = done_ids(out, retry_failed=not args.no_retry_failed)
    todo = [r for r in rows if r["run_id"] not in skip]
    if args.limit:
        todo = todo[:args.limit]
    chunks = [todo[i:i + args.chunk] for i in range(0, len(todo), args.chunk)]

    log("%d designs in %s, %d already done, %d to run in %d chunks of up to %d"
        % (len(rows), args.inputs.name, len(rows) - len([r for r in rows if r["run_id"] not in skip]),
           len(todo), len(chunks), args.chunk))
    log("estimate at 4 min per design: %.1f h" % (len(todo) * 4 / 60))
    for col, (values, model_value) in ignored_inputs(todo).items():
        log("WARNING: %s varies (%s) but is not a parameter in the model yet; every run uses %g"
            % (col, ", ".join("%g" % v for v in values[:6]) + (" ..." if len(values) > 6 else ""), model_value))
    log("outputs -> %s" % out)

    if args.dry_run:
        for n, c in enumerate(chunks, 1):
            print("  chunk %d: %s ... %s (%d designs)" % (n, c[0]["run_id"], c[-1]["run_id"], len(c)))
        print("  command per chunk: \"%s\" -B -R %s   (EPTC_JOB=<work>\\chunk_NNN\\job.txt)"
              % (args.runwb2, REPO / "automation" / "batch.wbjn"))
        return 0

    if not Path(args.runwb2).exists():
        sys.exit("RunWB2.exe not found at %s" % args.runwb2)
    if not args.archive.exists():
        sys.exit("archive not found: %s" % args.archive)
    # The restored project is reused across chunks and runs. Restore again if the archive is newer.
    project = args.work / "project"
    wbpj = project / "eptc.wbpj"
    if wbpj.exists() and args.archive.stat().st_mtime > wbpj.stat().st_mtime:
        log("archive is newer than the restored project, restoring again")
        shutil.rmtree(project)
    project.mkdir(parents=True, exist_ok=True)
    start = time.time()
    for n, chunk in enumerate(chunks, 1):
        results = run_chunk(n, chunk, args, args.work)
        append_outputs(out, results)
        ok = sum(r["status"] == "solved" for r in results)
        elapsed = time.time() - start
        left = sum(len(c) for c in chunks[n:])
        log("chunk %d/%d: %d solved, %d failed. %.0f min so far, about %.0f min left"
            % (n, len(chunks), ok, len(results) - ok, elapsed / 60,
               elapsed / sum(len(c) for c in chunks[:n]) * left / 60))
    return 0


if __name__ == "__main__":
    sys.exit(main())
