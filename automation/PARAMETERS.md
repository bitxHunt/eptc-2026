# Workbench parameters in `model/eptc.wbpz`

Read from the archive as committed on 18 Oct (project saved 18 Oct 10:21 UTC, Workbench 2026 R1, build 26.1.175). Sources: `chip_package_test.wbpj` (the project index) and `session_files/journal4.wbjn` (the recorded journal that created P1 to P8).

Project unit system: Metric (kg, m, s, °C). `batch.wbjn` writes every input with its unit spelled out, so the unit system doesn't matter.

## What the model has

| ID | Name in Workbench | Belongs to | Value on DP 0 | Contract column |
|---|---|---|---|---|
| P1 | Young's Modulus | TIM 1 | 10000000 [Pa] | `E1` |
| P2 | Poisson's Ratio | TIM 1 | 0.45 | none. **Drop it** (untick P) |
| P3 | Coefficient of Thermal Expansion | TIM 1 | 0.0001 [C^-1] | `a1` |
| P4 | Thermal Conductivity | TIM 1 | 5 [W m^-1 C^-1] | `k1` |
| P5 | Young's Modulus | TIM 2 | 10000000 [Pa] | `E2` |
| P6 | Poisson's Ratio | TIM 2 | 0.45 | none. **Drop it** |
| P7 | Coefficient of Thermal Expansion | TIM 2 | 0.0001 [C^-1] | `a2` |
| P8 | Thermal Conductivity | TIM 2 | 5 [W m^-1 C^-1] | `k2` |
| P9 | Temperature scope Minimum | thermal | 603.97 [C] | `Tmin` (info only) |
| P10 | Temperature scope Maximum | thermal | 629.26 [C] | `Tj` |
| P11 | Maximum Principal Stress scope 1 Minimum | structural | 3.21 [MPa] | `tim1_s1_min` |
| P12 | Maximum Principal Stress scope 1 Maximum | structural | 26.27 [MPa] | `tim1_s1_max` |
| P13 | Maximum Principal Stress scope 2 Minimum | structural | -4.44 [MPa] | `tim2_s1_min` |
| P14 | Maximum Principal Stress scope 2 Maximum | structural | 31.61 [MPa] | `tim2_s1_max` |
| P15 | Shear Stress scope 1 Minimum | structural | -4.67 [MPa] | `tim1_shear_min` |
| P16 | Shear Stress scope 1 Maximum | structural | 4.73 [MPa] | `tim1_shear_max` |
| P17 | Shear Stress scope 2 Minimum | structural | -10.42 [MPa] | `tim2_shear_min` |
| P18 | Shear Stress scope 2 Maximum | structural | 10.51 [MPa] | `tim2_shear_max` |

P1 to P4 belong to TIM 1 because journal4 created them on the original `TIM` material and renamed it `TIM 1`. P5 to P8 are on its duplicate. The output values are the old 11 Oct baseline (629 °C chip), so they are stale.

There is one design point (DP 0). Design point updates are set to Foreground and run locally.

## Not checked from the files

- **Which bodies "scope 1" and "scope 2" are.** The scoping is in `SYS.mechdb`, which can't be read as text. The runner assumes scope 1 = TIM-1 and scope 2 = TIM-2. Check in Mechanical and swap the P numbers in `OUTPUT_MAP` in `batch.wbjn` if needed.
- **Which bodies "Temperature scope" covers.** For `Tj` it must be the Silicon Die body only (Ansys step 3 in the team plan).
- Shear stress has no component in its name. Check which one (XY, YZ, XZ) it is, since the TIM's in-plane shear is the useful one.

## Missing from the model (the contract needs these)

| Contract column | Status | What to add in Workbench |
|---|---|---|
| `Tcase` | **missing** | Temperature result on the IHS top face, Maximum ticked as P. Without it there is no `theta_jc`, so no validation against Hu et al. |
| `blt1`, `blt2` | **missing** | Thickness as `DS_BLT1` and `DS_BLT2` from SolidWorks, or a Discovery dimension. The model is fixed at TIM-1 50 µm and TIM-2 150 µm |
| `h` (film coefficient) | **missing** | Tick P on the heat sink Convection film coefficient. Still 10 W/m²K |
| `warpage` | **missing** | Total Deformation (or directional Y) on the package or substrate, Maximum ticked as P |
| Average TIM stress | **missing** | Tick Average as well as Maximum on the four stress results (the corner maximum depends on the mesh) |

Once one of these is added, put its P number in `INPUT_MAP` or `OUTPUT_MAP` at the top of `batch.wbjn`. For an input, also remove it from `NOT_IN_MODEL` in `run_batch.py`. Workbench numbers new parameters from P19 up.
