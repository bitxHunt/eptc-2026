"""Stand-in for Ansys: hand formulas that return the same columns as a real run.

Only for building and testing the pipeline before real data exists. Nothing
here is a result for the report.

Thermal: 1D resistance stack from die to air, with a fixed contact resistance
at each TIM face and a rough spreading term in the lid.
Stress: Volkersen shear-lag for the TIM shear between its two neighbours, plus
an in-plane stress from the TIM's own CTE, combined into a max principal stress.

Usage: python fake_physics.py <inputs.csv> <outputs.csv>
"""
import sys

import numpy as np
import pandas as pd

from contract import H_SINK, INPUT_COLS, NU_TIM, OUTPUT_COLS, POWER_W, T_AMB

# Geometry (m) and materials, from the teammate's Workbench model
A_DIE = 0.020 ** 2            # die and TIM-1 footprint
A_PKG = 0.065 ** 2            # IHS and TIM-2 footprint
T_DIE, K_SI, E_SI, A_SI = 0.5e-3, 148.0, 130e9, 2.6e-6
T_LID, K_CU, E_CU, A_CU = 2.0e-3, 401.0, 110e9, 18e-6    # lid plate over the cavity
T_HSB, E_AL, A_AL = 5.0e-3, 71e9, 23e-6                  # heat sink base (assumed)
A_SINK = 74_880e-6            # heat sink wetted area
R_CONTACT = 1.0e-5            # m2K/W per TIM face (assumed, typical 1e-6 to 1e-5)
R_SPREAD_LID = 0.010          # K/W, die-sized source into the 65 mm lid (rough)
NOISE = 0.01                  # 1% multiplicative noise, stands in for mesh noise


def shear_lag(G, blt, L, Ea, ta, Eb, tb, d_alpha, dT):
    """Volkersen joint: max and mean shear (Pa) over a bond of length L."""
    beta = np.sqrt(G / blt * (1 / (Ea * ta) + 1 / (Eb * tb)))
    x = beta * L / 2
    tau0 = G * d_alpha * dT / (beta * blt)
    tau_max = tau0 * np.tanh(x)
    tau_avg = tau0 * (np.cosh(x) - 1) / (x * np.cosh(x))
    return tau_max, tau_avg


def principal(sigma, tau):
    return sigma / 2 + np.sqrt((sigma / 2) ** 2 + tau ** 2)


def run(df, seed=0):
    rng = np.random.default_rng(seed)
    k1, k2 = df.k1.values, df.k2.values
    E1, E2 = df.E1.values * 1e6, df.E2.values * 1e6
    a1, a2 = df.a1.values * 1e-6, df.a2.values * 1e-6
    b1, b2 = df.blt1.values * 1e-6, df.blt2.values * 1e-6

    # Thermal
    r_die = T_DIE / (K_SI * A_DIE)
    r_tim1 = b1 / (k1 * A_DIE) + 2 * R_CONTACT / A_DIE
    r_tim2 = b2 / (k2 * A_PKG) + 2 * R_CONTACT / A_PKG
    r_sink = 1 / (H_SINK * A_SINK)
    t_case = T_AMB + POWER_W * (r_tim2 + r_sink)
    tj = t_case + POWER_W * (r_die + r_tim1 + R_SPREAD_LID)
    theta = (tj - t_case) / POWER_W

    # Structural, reference temperature T_AMB
    G1, G2 = E1 / (2 * (1 + NU_TIM)), E2 / (2 * (1 + NU_TIM))
    dT1 = (tj + t_case) / 2 - T_AMB
    dT2 = t_case - T_AMB
    t1max, t1avg = shear_lag(G1, b1, 0.020, E_SI, T_DIE, E_CU, T_LID, A_CU - A_SI, dT1)
    t2max, t2avg = shear_lag(G2, b2, 0.065, E_CU, T_LID, E_AL, T_HSB, A_AL - A_CU, dT2)
    s1 = E1 / (1 - NU_TIM) * np.abs(a1 - (A_SI + A_CU) / 2) * dT1
    s2 = E2 / (1 - NU_TIM) * np.abs(a2 - (A_CU + A_AL) / 2) * dT2
    corner = 1.6   # max vs mean of the in-plane stress at the free edge

    # Warpage: die/lid bimetal, coupled more as TIM-1 gets stiffer
    coupling = G1 / (G1 + 50e6)
    warp = 3e-6 + 25e-6 * coupling * (dT1 / 60)

    out = pd.DataFrame({
        "Tj": tj, "Tcase": t_case, "theta_jc": theta,
        "tim1_s1_max": principal(corner * s1, t1max) / 1e6,
        "tim1_s1_avg": principal(s1, t1avg) / 1e6,
        "tim1_tau_max": t1max / 1e6, "tim1_tau_avg": t1avg / 1e6,
        "tim2_s1_max": principal(corner * s2, t2max) / 1e6,
        "tim2_s1_avg": principal(s2, t2avg) / 1e6,
        "tim2_tau_max": t2max / 1e6, "tim2_tau_avg": t2avg / 1e6,
        "warpage": warp * 1e6,
    })
    out *= rng.normal(1, NOISE, out.shape)
    out["theta_jc"] = (out.Tj - out.Tcase) / POWER_W
    result = df[["run_id"] + INPUT_COLS].reset_index(drop=True)
    result[OUTPUT_COLS] = out[OUTPUT_COLS]
    result["status"] = "solved"
    return result


def sanity_check():
    """Hu et al. measured 0.10 to 0.23 C/W junction to case for 3.8 to 40 W/mK."""
    rows = pd.DataFrame({"run_id": ["k3.8", "k40"], "k1": [3.8, 40.0], "E1": [10.0, 10.0],
                         "a1": [100.0, 100.0], "blt1": [50.0, 50.0], "k2": [5.0, 5.0],
                         "E2": [10.0, 10.0], "a2": [100.0, 100.0], "blt2": [150.0, 150.0]})
    res = run(rows)
    for _, r in res.iterrows():
        ok = "in" if 0.10 <= r.theta_jc <= 0.23 else "OUT OF"
        print(f"  k1 = {r.k1:>4} W/mK: theta_jc = {r.theta_jc:.3f} C/W, Tj = {r.Tj:.1f} C "
              f"({ok} the 0.10-0.23 range)")
    return res


if __name__ == "__main__":
    if len(sys.argv) == 3:
        run(pd.read_csv(sys.argv[1])).to_csv(sys.argv[2], index=False)
    else:
        sanity_check()
