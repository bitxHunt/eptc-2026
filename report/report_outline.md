# Report outline (10 pages max)

The working outline for the EPTC 2026 TIM report, in the organisers' official section order (submission slide 3). Use exactly these 8 sections and this order. The organisers also send a docx template with page-by-page guidance to registered teams: when it arrives, follow its layout and keep this content.

Due Sun 1 Nov 2026, as a PDF inside `TeamName_EPTC2026_Submission.zip` (with the slides, and optionally the dashboard, the repo link and the results CSV).

`[TBD: …]` marks a number we don't have yet. Numbers below are from the full 144-run batch (finished Thu 29 Oct 23:23, 144 solved, 0 failed). Owners: **Robotics** (FEA model), **Lead** (automation, surrogate, optimisation, dashboard), **Comp eng** (materials, figures, layout).

## Where each judging criterion is earned

| Criterion | Weight | Earned mainly in |
|---|---|---|
| Technical quality of simulation | 25% | §4 Methodology, §5.1 Model checks |
| Innovation | 20% | §4.6 and 4.7 Batch and surrogate, §6 Discussion, the dashboard |
| Visualisation and communication | 20% | Every figure, §5.4 hot-spot maps, §6 trade-off and product map |
| Practical relevance | 15% | §6.2 Key drivers, §6.3 Real products |
| Accuracy and robustness | 10% | §5.1 Model checks, §5.5 Surrogate error, mesh check |
| Potential for industrial adoption | 10% | §6.5 Dashboard, §7 Recommendations |

## Sections and page budget

| § | Title | Owner | Pages | Figures and tables |
|---|---|---|---|---|
| 1 | Title page and team info | Comp eng | 1.0 | none |
| 2 | Abstract | Lead | 0.25 | none |
| 3 | Problem statement | Lead | 0.75 | F1 |
| 4 | Methodology | Robotics (4.1 to 4.5), Lead (4.6 to 4.8) | 3.0 | F2, F3, T1, T2, T3 |
| 5 | Results and analysis | Robotics (5.1, 5.4), Lead (5.2, 5.3, 5.5) | 2.5 | F4 to F7, T4 |
| 6 | Discussion and optimisation | Lead (6.1, 6.2, 6.4, 6.5), Comp eng (6.3) | 1.75 | F8, F9, F10, T5 |
| 7 | Conclusion and recommendations | Lead | 0.5 | none |
| 8 | References | Comp eng | 0.25 | none |
| | **Total** | | **10.0** | |

If the template says the title page does not count towards the 10, give the extra page to §5 and §6.

### 1. Title page and team info (1 page), Comp eng
Team name [TBD], members and roles [TBD], university (NUS), EPTC team ID [TBD]. Report title, for example "Simulation-driven selection of TIM-1 and TIM-2 for a 400 W flip-chip package".

### 2. Abstract (~200 words), Lead
Problem: two TIM layers in a 65 × 65 mm, 400 W flip-chip package, cooling against TIM stress. Method: coupled thermal and structural FEA in Ansys 2026 R1, 144 designs over 16 real TIM-1/TIM-2 product pairs run headless in batch, Gaussian process surrogate, NSGA-II, Sobol sensitivity. Key numbers: θJC 0.010 to 0.058 °C/W, surrogate hold-out error 0.1 % on θJC, main drivers (TIM-1 k for cooling, TIM-1 E for TIM-1 edge stress). Recommendation [TBD]. Write it last.

### 3. Problem statement (0.75 page), Lead
- **Package configuration.** 65 × 65 mm flip-chip BGA, 20 × 20 mm die at 400 W, lid (IHS), heat sink. F1: section view with the layers named (die, TIM-1, lid, TIM-2, heat sink, substrate).
- **TIMs.** TIM-1 sits between die and lid, TIM-2 between lid and heat sink. Say what each one does, and why a good TIM-1 has two jobs that pull against each other: high k to move heat, and low E so the die and lid can expand by different amounts without the layer cracking or delaminating.
- **Design objectives.** Minimise θJC. Minimise TIM edge shear stress (delamination starts at the edge). Report warpage and Tj. State that Tj is not used as a pass/fail limit: with the fixed 150 W/m²K heat sink every design sits at 114 to 137 °C, and most of that comes from the heat sink and TIM-2, not TIM-1 (Hu et al.: "the thermal module dominates").

### 4. Methodology: FEA setup (3 pages)
4.1 **Geometry** (Robotics). Layer thicknesses and footprints, T1. SolidWorks part, 7 bodies. F2: the meshed model, close-up of the TIM layers.

4.2 **Materials** (Robotics, with Comp eng). T2: fixed layers (die, lid, heat sink, substrate). T3: the 8 TIM products (4 TIM-1, 4 TIM-2) with k, E and CTE, and where each value came from: k from datasheets, CTE assumed, E swept over a range where the datasheet gives none. Say this plainly, since the judges include a materials supplier. Poisson's ratio 0.45 for all TIMs.

4.3 **Boundary conditions** (Robotics). 400 W as a heat flux on the die. Film coefficient 150 W/m²K to 22 °C on the heat sink. 3-2-1 support so the package can expand freely. Stress-free reference temperature 25 °C. Thermal result imported into the structural analysis.

4.4 **Solver and mesh** (Robotics). Ansys Workbench 2026 R1, steady-state thermal plus static structural, about 3.5 min per design. Elements through each TIM. Thin-layer BLT: the model keeps TIM-1 at 50 µm and TIM-2 at 150 µm, and a different BLT is applied by scaling k and E by t_model / t_real, which keeps the layer's thermal resistance and shear stiffness. [TBD: 2 to 3 real-geometry check runs, including one stiff TIM, to confirm it.] Mesh check: [TBD: edge shear change at half element size].

4.5 **Outputs and definitions** (Robotics). Tj = maximum die temperature. Tcase = lid top at the centre above the die. θJC = (Tj − Tcase) / 400 W. Edge shear = maximum shear on a 1 mm diagonal path 0.5 to 1.5 mm in from the TIM corner, at the TIM mid-plane. Starting 0.5 mm in skips the corner singularity, so the value does not grow with mesh refinement. Warpage = max − min vertical displacement of the substrate. Also the volume-average von Mises stress in each TIM.

4.6 **Design of experiments and batch runs** (Lead). 144 designs: 16 product pairs × 9 designs each, BLT 30, 40 or 50 µm for each TIM, and E swept where it is uncertain. 128 train, 16 hold-out (one per pair). A Python runner feeds the CSV to Workbench headless in chunks of 10, records a status for each row, and resumes after a stop. 144 designs in 5 h 38 min on one laptop (about 2.3 min per design including overhead), 0 failures. One short licence-server outage (HTTP 502) during the run did not cost any rows.

4.7 **Surrogate, optimisation and sensitivity** (Lead). One Gaussian process per output (Matérn 5/2, one length scale per input, stresses learned as log10). NSGA-II (pymoo) on the surrogate: minimise θJC and the worse TIM edge shear. First-order Sobol indices from 20,000 surrogate samples. Shorten `method_draft.md` to fit, and fix the stale points listed at the end of this file.

4.8 **Tools** (Lead). Ansys Workbench and Mechanical 2026 R1, SolidWorks, Python 3.12 (pandas, scikit-learn, pymoo), and an HTML dashboard. F3: pipeline diagram (CAD, Ansys model, batch runner, results CSV, surrogate, optimiser, dashboard).

### 5. Results and analysis (2.5 pages)
5.1 **Model checks** (Robotics). Heat balance: 400 W in and out, 0 % error on every run. A 1D hand calculation (BLT / (k · A_die) plus the die) gives θJC 0.0105, 0.048 and 0.050 °C/W for the three test designs, against FEA 0.0118, 0.0479 and 0.0494: within a few %. Against Hu et al. (EPTC 2019, measured 0.10 to 0.23 °C/W) our θJC is 3 to 7 times lower, because the model has perfect bonding and no contact resistance. [TBD: contact-resistance calibration on Hu TIMs A, B and D, if the θJC per TIM is available in time.] T4: these checks.

5.2 **Tj and thermal resistance** (Lead). θJC across all runs is 0.010 to 0.058 °C/W, and TIM-1 sets it: indium 0.010 to 0.011, silver paste 0.012 to 0.014, Shin-Etsu X23-8131 0.033 to 0.050, X23-7935-11 0.038 to 0.058. The TIM-2 product barely moves θJC (mean 0.0279 to 0.0282) but does move Tj (mean 121.8 °C with PTM7950, 124.6 °C with TC-5026), because TIM-2 sits on the path to the heat sink. F4: θJC by product pair.

5.3 **Stress and warpage** (Lead). TIM-1 edge shear spans 4 orders of magnitude and is set almost entirely by E1. TIM-2 stress is small. TIM-1 edge shear: indium 45 to 66 MPa, silver paste 0.009 to 20 MPa depending on E, the Shin-Etsu gels 0.005 to 0.33 MPa. Warpage 14 to 60 µm. F5: edge shear by product pair (log scale).

5.4 **Hot-spot maps** (Robotics). F6: temperature field and TIM-1 shear field for the recommended design, and for one high-stress design (indium) to contrast. Point out the stress concentration at the edge and corner.

5.5 **Surrogate accuracy** (Lead). F7: surrogate against Ansys on the 16 hold-out runs, with Mean error: θJC 0.11 %, Tj under 0.01 %, TIM-1 edge shear 0.44 %, TIM-2 edge shear 1.6 %, warpage 0.9 % (R² 0.98 to 1.00). Worst single run: θJC 0.37 %, TIM-1 edge shear 1.8 %, warpage 8 %, TIM-2 edge shear 18.5 % (one run, at very small stress, about 0.003 MPa). Say clearly that hold-out runs share the 16 product pairs with training, so this measures interpolation between tested designs, not prediction for new materials.

### 6. Discussion and optimisation (1.75 pages)
6.1 **Trade-offs** (Lead). F8: θJC against the worse TIM edge shear for every run, Pareto set marked. 35 of 144 runs are on the Pareto set, in three groups: indium (best cooling, θJC 0.0100 °C/W, but 45 to 54 MPa edge shear), silver paste at E 0.1 MPa (θJC 0.0116 to 0.0134 °C/W at 0.009 to 0.013 MPa) and Shin-Etsu X23-8131 (lowest stress, 0.006 to 0.008 MPa, but θJC 0.033 to 0.050). Silver paste at low E gives about 15 % worse θJC than indium for about 4,000 times less edge shear. Thinner TIM-1 (30 µm) is always better for θJC, and costs a little stress.

6.2 **Key drivers** (Lead). F9: Sobol indices. TIM-1 k explains 95 % of θJC and 90 % of Tj. TIM-1 E explains nearly all of TIM-1 edge shear and 82 % of warpage. TIM-2 E explains 46 % of TIM-2 shear (the rest is interaction between inputs). BLT and CTE matter little in the tested range. Practical message: choose TIM-1 by k first, then the softest grade with that k.

6.3 **Alternatives and real products** (Comp eng). F10: product map, k against E, with the best region (high k, low E) shaded. The surrogate's optimum asks for k around 60 W/mK at E around 0.04 MPa (predicted θJC 0.0094 °C/W at 0.07 MPa), which no tested product has: a target for material development (Heraeus) rather than a shelf product. T5: each product pair with its best θJC and stress.

6.4 **Limitations** (Lead). Linear elastic TIMs: indium gives 45 to 66 MPa edge shear, but real indium yields at a few MPa and creeps, so this is an upper bound. Next step: a bilinear plastic indium model for 1 or 2 check runs (the challenge asks for non-linear TIM properties). Also: perfect bonding (no contact resistance), steady state only, one cooling value, one geometry, and E for several products is a swept proxy, not a measured value. This matters most for the silver paste: its k of 30 W/mK is an upper-bound scenario and its E is a hypothetical sweep, so the recommendation depends on Heraeus confirming a soft grade near E 0.1 MPa.

6.5 **Dashboard** (Lead). One paragraph and a screenshot: design explorer (instant prediction from the surrogate), trade-off chart, product map, key drivers and accuracy, in the same views engineers know from optiSLang and Granta. It runs offline in a browser.

### 7. Conclusion and recommendations (0.5 page), Lead
Recommended pair [team to confirm]: TIM-1 = Heraeus silver paste, soft grade (E about 0.1 MPa), at 30 µm; TIM-2 = Bergquist TGR 4000 or Honeywell PTM7950. Run DOE-P14-03 (TGR 4000 at 30 µm): θJC 0.0118 °C/W, Tj 116.1 °C, TIM-1 edge shear 0.013 MPa, warpage 34 µm. Indium only if its real (plastic) stress is shown to be acceptable. Three findings in plain words, from 6.1 to 6.3. Industrial relevance: one overnight batch and a surrogate replace hundreds of separate FEA runs, and a new package needs only a new model and one more batch. Future work: contact resistance, plastic and creep TIM models, thermal cycling and fatigue, extra runs where the surrogate is least sure.

### 8. References (0.25 page), Comp eng
Hu et al., "High Power Large Size HFCBGA Thermal Characterization", EPTC 2019 (IEEE 9026583). TIM datasheets (Shin-Etsu X23-7935-11 and X23-8131, Dow DOWSIL TC-5026 and TC-5888, Bergquist TGR 4000, Honeywell PTM7950, Heraeus, Indium Corporation). Ansys 2026 R1 Mechanical documentation. Rasmussen and Williams, *Gaussian Processes for Machine Learning*, 2006. Deb et al., NSGA-II, IEEE Trans. Evol. Comput., 2002. Saltelli et al., *Global Sensitivity Analysis: The Primer*, 2008. Blank and Deb, pymoo, IEEE Access, 2020. Pedregosa et al., scikit-learn, JMLR, 2011.

## Figure checklist

| ID | Figure | § | Owner | Source |
|---|---|---|---|---|
| F1 | Package section with layer names | 3 | Robotics | SolidWorks or Ansys |
| F2 | Meshed model, close-up of the TIM layers | 4.1 | Robotics | Ansys |
| F3 | Pipeline diagram | 4.8 | Comp eng | draw |
| F4 | θJC by product pair | 5.2 | Lead | results CSV |
| F5 | TIM edge shear by product pair | 5.3 | Lead | results CSV |
| F6 | Temperature and shear fields | 5.4 | Robotics | Ansys |
| F7 | Surrogate parity on hold-out runs | 5.5 | Lead | `ml/out/figures/parity.png` or the dashboard |
| F8 | Trade-off, Pareto set marked | 6.1 | Lead | the dashboard |
| F9 | Sobol sensitivity | 6.2 | Lead | `ml/out/figures/sensitivity.png` or the dashboard |
| F10 | Product map, k against E | 6.3 | Comp eng | the dashboard |

One shared figure style, set by Comp eng.

## Where the old outline went

| Old § | New § |
|---|---|
| 0 Abstract | 2 |
| 1 Introduction and problem | 3 |
| 2 Finite element model | 4.1 to 4.5 |
| 3 Validation against Hu et al. | 5.1 |
| 4 Method | 4.6 to 4.8 |
| 5.1 Surrogate parity | 5.5 |
| 5.2 Pareto front | 6.1 |
| 5.3 Sensitivity | 6.2 |
| 5.4 Confirmation runs | 5.5, or dropped if there is no time (the hold-out runs already test the surrogate) |
| 5.5 Field plots | 5.4 |
| 6 Product mapping and recommendation | 6.3 and 7 |
| 7 Limitations and conclusion | 6.4 and 7 |

## Stale points in method_draft.md

Fix these when moving it into §4.6 and 4.7:
- It describes a 150 + 25 Latin hypercube. The run set is now the 144-run balanced design over 16 product pairs, with 16 hold-out rows.
- It uses average principal stress as the objective. The objective is now the edge max shear on the 0.5 to 1.5 mm path.
- It mentions a Tj constraint. There is none now (see §3).
- It says NSGA-II minimises three objectives. It minimises two: θJC and the worse TIM edge shear.
- It plans 5 to 10 confirmation runs and uses the GP uncertainty to pick extra runs. Keep this only if they are actually run.
