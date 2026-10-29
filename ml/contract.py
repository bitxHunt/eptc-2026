"""Data contract for one run: input ranges and the output columns.

Shared by every script in ml/, so the column names live in one place.
Units: k in W/mK, E in MPa, CTE in ppm/K, BLT in um, temperatures in C,
stresses in MPa, warpage in um.
"""

# name: (low, high, scale). Matches the design space of data/inputs/lhs_runs.csv,
# which spans the real products in TIM_pair_simulation_runs.csv. A "fixed" input
# is held at `low` and is not searched.
INPUTS = {
    "k1":   (2.5, 82.0, "log"),
    "E1":   (0.04, 12_740.0, "log"),
    "a1":   (24.8, 180.0, "lin"),
    "blt1": (30.0, 50.0, "lin"),
    "k2":   (2.9, 8.5, "log"),
    "E2":   (0.01, 1.0, "log"),
    "a2":   (150.0, 150.0, "fixed"),
    "blt2": (30.0, 50.0, "lin"),
}
INPUT_COLS = list(INPUTS)

# Fixed for every run
POWER_W = 400.0
NU_TIM = 0.45
H_SINK = 150.0      # W/m2K, film coefficient on the heat sink
T_AMB = 22.0        # C, air temperature
T_REF = 25.0        # C, stress-free reference temperature of the V2 model

# Outputs of the V2 Ansys model (automation/run_batch.py, loaded by load_runs.py)
ANSYS_OUTPUT_COLS = [
    "Tj", "Tcase", "Tcase_avg", "theta_jc",
    "tim1_vm_avg", "tim1_vm_max", "tim2_vm_avg", "tim2_vm_max",
    "tim1_edge_tau_max", "tim1_edge_tau_avg", "tim2_edge_tau_max", "tim2_edge_tau_avg",
    "warpage",
]
# Outputs of the stand-in physics (fake_physics.py, --demo only)
DEMO_OUTPUT_COLS = [
    "Tj", "Tcase", "theta_jc",
    "tim1_s1_max", "tim1_s1_avg", "tim1_tau_max", "tim1_tau_avg",
    "tim2_s1_max", "tim2_s1_avg", "tim2_tau_max", "tim2_tau_avg",
    "warpage",
]
# The surrogate trains on whichever of these the data has
OUTPUT_COLS = ANSYS_OUTPUT_COLS + [c for c in DEMO_OUTPUT_COLS if c not in ANSYS_OUTPUT_COLS]
# Outputs that span orders of magnitude: the surrogate learns log10 of these
LOG_OUTPUTS = [c for c in OUTPUT_COLS if c.startswith("tim")]
STATUS_COL = "status"


def stress_cols(outputs):
    """TIM-1 and TIM-2 stress used as the stress objective (the worse of the two).

    Ansys runs: max shear on the edge path, 0.5 to 1.5 mm in from the corner.
    Delamination starts at the edge, and starting 0.5 mm in skips the corner
    singularity, so the value does not climb with mesh refinement.
    Demo runs: average principal stress, then the maximum.
    """
    for cols in (["tim1_edge_tau_max", "tim2_edge_tau_max"],
                 ["tim1_s1_avg", "tim2_s1_avg"], ["tim1_s1_max", "tim2_s1_max"]):
        if all(c in outputs for c in cols):
            return cols
    raise ValueError("no TIM stress outputs available")
