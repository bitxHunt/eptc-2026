# Workbench parameters in `model/eptc.wbpz`

The V2 model (archived 29 Oct 2026, Workbench 2026 R1, build 26.1.175). The maps at the top of `batch.wbjn` (`INPUT_MAP`, `FIXED`, `OUTPUT_MAP`) must match this table. If the model changes, update both and run `data/inputs/test_runs.csv` before a long batch.

Project unit system: Metric (kg, m, s, °C). `batch.wbjn` writes every input with its unit spelled out, so the unit system doesn't matter.

## Inputs

| ID | Workbench parameter | Material | CSV column | Note |
|---|---|---|---|---|
| P1 | Young's Modulus | TIM 1 | `E1` | Thin-layer scaled for BLT |
| P2 | Poisson's Ratio | TIM 1 | none | Pinned to 0.45 every run |
| P3 | Coefficient of Thermal Expansion | TIM 1 | `a1` | |
| P4 | Thermal Conductivity | TIM 1 | `k1` | Thin-layer scaled for BLT |
| P5 | Young's Modulus | TIM 2 | `E2` | Thin-layer scaled for BLT |
| P6 | Poisson's Ratio | TIM 2 | none | Pinned to 0.45 every run |
| P7 | Coefficient of Thermal Expansion | TIM 2 | `a2` | |
| P8 | Thermal Conductivity | TIM 2 | `k2` | Thin-layer scaled for BLT |

BLT and the heat sink film coefficient are not parameters. BLT reaches the model through k and E (see `automation/README.md`). The film coefficient is fixed at 150 W/m²K.

## Outputs

| ID | Workbench result | Scope | CSV column |
|---|---|---|---|
| P9 | Temperature, Minimum | Silicon die | `Tmin` |
| P10 | Temperature, Maximum | Silicon die | `Tj` |
| P19 | Temperature, Maximum | Lid top face, above the die | `Tcase` |
| P20 | Temperature, Average | Lid top face | `Tcase_avg` |
| P21 | Convection heat (negative = leaving) | Heat sink | `Q_out` |
| P22 | Equivalent (von Mises) stress, Average | TIM-1 body | `tim1_vm_avg` |
| P23 | Equivalent (von Mises) stress, Maximum | TIM-1 body | `tim1_vm_max` |
| P24 | Equivalent (von Mises) stress, Maximum | TIM-2 body | `tim2_vm_max` |
| P25 | Equivalent (von Mises) stress, Average | TIM-2 body | `tim2_vm_avg` |
| P26 | Total deformation, Maximum | All bodies | `deform_total_max` |
| P27 | Directional deformation Y, Maximum | Substrate | `warp_y_max` |
| P28 | Directional deformation Y, Minimum | Substrate | `warp_y_min` |
| P29 | Maximum shear stress on path, Maximum | TIM-1 edge path | `tim1_edge_shear_max` |
| P30 | Maximum shear stress on path, Average | TIM-1 edge path | `tim1_edge_shear_avg` |
| P31 | Maximum shear stress on path, Maximum | TIM-2 edge path | `tim2_edge_shear_max` |
| P32 | Maximum shear stress on path, Average | TIM-2 edge path | `tim2_edge_shear_avg` |

P11 to P18 are left over from V1 (principal and shear stress on bodies that were never checked) and are not read.

**Edge paths.** A 1 mm straight path along the diagonal, from 0.5 to 1.5 mm in from the TIM corner, at the TIM mid-plane: TIM-1 at y = 0.003125 m, TIM-2 at y = 0.005225 m. Starting 0.5 mm in avoids the stress singularity at the free corner of a perfectly bonded layer. The mid-plane heights don't change with BLT, because BLT is not a geometry change.

## V2 baseline (TIM-1 and TIM-2 at k 5 W/mK, E 10 MPa, BLT 50 / 150 µm)

Tj 131.0 °C, Tcase 117.9 °C, heat out 400 W, θJC 0.033 °C/W, warpage 26 µm, TIM-1 edge shear 0.69 MPa, TIM-2 edge shear 0.19 MPa.
