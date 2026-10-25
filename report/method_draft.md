# 4. Method

Each finite element evaluation of the package takes about four minutes (a coupled steady-state thermal and static structural solve). That is too slow to search the TIM design space directly. We therefore run the FEA model at a planned set of designs, fit a statistical surrogate to the results, search the surrogate for the best trade-offs, and confirm the chosen designs with the FEA model.

## 4.1 Design variables and outputs

Each design is described by the properties of the two interface layers: thermal conductivity *k*, Young's modulus *E*, coefficient of thermal expansion *α* and bond line thickness (BLT), for TIM-1 (die to lid) and TIM-2 (lid to heat sink). Poisson's ratio is held at 0.45, because TIMs fall in a narrow band (0.45 to 0.49) and varying it adds a dimension with little effect. Die power (400 W) and heat sink cooling are fixed. The ranges cover the real products in our materials table, from soft gels to indium solder.

For each design the model returns the maximum die temperature *T*j, the maximum lid-top temperature *T*case, the junction-to-case resistance θJC = (*T*j − *T*case) / 400 W, the maximum principal and shear stress in each TIM layer, and the package warpage. The layers are perfectly bonded, so the stress at a TIM's free corner is singular and keeps rising as the mesh is refined. We therefore report the average stress over each TIM layer alongside the maximum, and we quantify the maximum's mesh dependence with one refinement study (Section 2.4).

## 4.2 Sampling

The training designs are a Latin hypercube of 150 points over the design variables. Conductivity and modulus span two to five orders of magnitude, so they are sampled uniformly in log10. Otherwise almost every point would land at the stiff, conductive end of the range. The hypercube is optimised for centred discrepancy so the points fill the space evenly. A second, independent hypercube of 25 points is held out and never used in fitting, so the surrogate's accuracy is measured on designs it has not seen. Each design is written as one row of an input CSV. A Python runner passes the rows to Ansys Workbench in batch mode as design points, and records the outputs and a solve status for each row, so a failed design is logged and the batch continues.

## 4.3 Surrogate model

We fit one Gaussian process (GP) regression model per output, on log-transformed conductivity and modulus and min–max scaled inputs. Each GP uses a constant mean and an anisotropic Matérn 5/2 kernel with a white-noise term, and its hyperparameters are found by maximising the marginal likelihood with several restarts. We chose a GP over a neural network or tree ensemble for two reasons. It is accurate with a few hundred points or fewer, and it returns a predictive uncertainty with each prediction. That uncertainty is used twice: to flag Pareto designs where the surrogate is unsure, and to choose where extra FEA runs would help most. The fitted length-scales also give a first ranking of input importance, which we check with variance-based (Sobol) sensitivity indices computed on the surrogate.

Surrogate accuracy is reported on the 25 held-out designs as the coefficient of determination (R²) and the mean and maximum absolute error for each output.

## 4.4 Multi-objective optimisation

The design problem has competing objectives: low θJC (or *T*j) and low stress in each TIM layer. We search the surrogate with the NSGA-II genetic algorithm (pymoo), minimising θJC, TIM-1 stress and TIM-2 stress within the variable bounds. Because a surrogate evaluation takes microseconds, the search can afford a large population and many generations. The result is a Pareto front, the set of designs where no objective can improve without another getting worse. Real TIM products are placed on the same axes, which shows how far each is from the achievable trade-off.

## 4.5 Validation

The method is checked at two levels.

1. **FEA against measurement.** The five TIMs of Hu et al. (EPTC 2019), a 65 × 65 mm, 400 W flip-chip package with measured θJC of 0.10 to 0.23 °C/W, are run through our model as TIM-1. Simulated and measured θJC are compared (Section 3).
2. **Surrogate against FEA.** Besides the held-out error (Section 4.3), five to ten designs chosen from the Pareto front are re-run in Ansys, and their FEA results are compared with the surrogate's predictions (Section 5.4). The recommendation is made only from designs that pass this check.
