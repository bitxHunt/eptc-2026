# Report outline (10 pages max)

The working outline for the EPTC 2026 TIM report. Page targets add up to 10, including figures. `[TBD: …]` marks a number we don't have yet. Owners: **Robotics** (FEA model), **Lead** (automation, surrogate, optimisation), **Comp eng** (materials, figures, layout).

| Criterion | Weight | Earned mainly in |
|---|---|---|
| Technical quality of simulation | 25% | §2 Model, §3 Validation |
| Innovation | 20% | §4 Method, §6 Discussion |
| Visualisation and communication | 20% | Every figure, §5 Results |
| Practical relevance | 15% | §5.3 Sensitivity, §6 Product mapping |
| Accuracy and robustness | 10% | §3 Validation, §5.1 Surrogate error, mesh check |
| Potential for industrial adoption | 10% | §6 Recommendation, §7 Conclusion |

| § | Title | Owner | Pages | Figures and tables |
|---|---|---|---|---|
| 0 | Abstract | Lead | 0.25 | none |
| 1 | Introduction and problem | Lead | 0.5 | none |
| 2 | Finite element model | Robotics | 2.0 | F1, T1, T2 |
| 3 | Validation against Hu et al. | Robotics | 1.0 | F2, T3 |
| 4 | Method | Lead | 1.25 | F3 |
| 5 | Results | Lead | 2.5 | F4–F7, T4 |
| 6 | Product mapping and recommendation | Comp eng | 1.25 | T5, F8 |
| 7 | Limitations and conclusion | Lead | 0.75 | none |
| | References | Comp eng | 0.5 | |

### 0. Abstract (0.25 page)
Problem; method (FEA → about 150-run Latin hypercube → Gaussian process → NSGA-II); validation θJC [TBD: x to y] °C/W against 0.10 to 0.23 measured; surrogate error [TBD: R² / MAE on 25 held-out runs]; the recommended TIM-1 / TIM-2 pair.

### 1. Introduction (0.5 page)
400 W, 65 × 65 mm flip-chip package; cooling against TIM survival; BLT, k, E, CTE for TIM-1 and TIM-2; contribution: validated FEA-driven exploration in place of physical testing.

### 2. Finite element model (2 pages), Robotics
2.1 Geometry: F1 exploded or section view, T1 layer table. 2.2 Materials: T2 fixed layers. 2.3 Loads and boundary conditions: 400 W, film coefficient [TBD: 150 W/m²K proposed] to 22 °C, 3-corner support, thermal result imported at 22 °C reference. 2.4 Mesh and solver: [TBD: nodes], elements through each TIM, [TBD: s per design]; mesh check, max stress changes [TBD: %] at half element size, which justifies the average. 2.5 Outputs: Tj, Tcase, θJC, TIM stresses (max and average), warpage.

### 3. Validation against Hu et al. EPTC 2019 (1 page), Robotics
Five TIMs as TIM-1. F2: θJC parity plot. T3: TIM, k, measured, simulated, error. Graphite (40 W/mK): perfect bonding can't reproduce its poor coverage, a known limitation and future work. Headline: [TBD: MAE °C/W and %].

### 4. Method (1.25 pages), Lead
See method_draft.md. F3: pipeline diagram (Ansys ↔ CSV ↔ runner → GP → NSGA-II → confirmation runs).

### 5. Results (2.5 pages), Lead
5.1 F4: held-out parity for Tj, θJC, TIM-1 stress, TIM-2 stress [TBD errors]. 5.2 F5: Pareto front, θJC against TIM-1 stress, coloured by E1, real products overlaid; the headline figure, half a page. 5.3 F6: Sobol or length-scale ranking of the inputs. 5.4 T4: 5 to 10 confirmation runs, surrogate against Ansys. 5.5 F7: temperature and stress fields of the recommended design.

### 6. Product mapping and recommendation (1.25 pages), Comp eng
T5: real TIMs (Heraeus first) with properties, predicted θJC and stress, and distance from the front. F8: products against the front. Recommendation: "TIM-1 = [TBD] at [TBD] µm, TIM-2 = [TBD] at [TBD] µm".

### 7. Limitations and conclusion (0.75 page), Lead
Linear elastic TIM, steady state only, perfect bonding, cooling fixed at one value, one geometry. Adoption: millisecond screening before ordering samples, retrains for a new package from about 150 runs overnight. Future work: coverage, the thermal cycle and fatigue, active learning.

## Figure checklist
| ID | Figure | Owner |
|---|---|---|
| F1 | Package stack | Robotics |
| F2 | θJC parity against Hu et al. | Robotics + Lead |
| F3 | Pipeline diagram | Comp eng |
| F4 | Surrogate parity | Lead |
| F5 | Pareto front with products | Lead |
| F6 | Sensitivity | Lead |
| F7 | Field plots | Robotics |
| F8 | Products against the front | Comp eng |

One shared figure style, set by Comp eng.
