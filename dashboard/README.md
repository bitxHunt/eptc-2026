# dashboard/: TIM design explorer

One HTML page for the judges and the team. It opens offline in any browser, so `index.html` can go in the submission ZIP as it is.

| Panel | Shows |
|---|---|
| Design explorer | Pick TIM products, modulus and bond line; the surrogate predicts θJC, Tj, edge shear and warpage instantly |
| Trade-off | Every solved run, θJC against the worse TIM edge shear, Pareto set filled. Click a point to load it |
| Product map | TIM products by k and E, with the best region and the surrogate's optimum |
| What matters most | First-order Sobol indices |
| Accuracy | Surrogate against Ansys on the hold-out runs, and the error table |
| All runs | The data as a sortable table |

## Build

After `ml/run_all.py` has trained the surrogate:

```
python dashboard/build_dashboard.py
```

It reads `ml/out/` and the 144-run inputs and results CSVs, and writes `dashboard/index.html` from `template.html`. Other files: `python dashboard/build_dashboard.py <inputs.csv> <outputs.csv>`.

The page runs the Gaussian process mean itself (training inputs, weights and kernel settings are embedded). The build recomputes that prediction in NumPy and stops if it differs from scikit-learn's by more than 1e-6, which catches a scikit-learn upgrade changing the internals the export reads. Edit `template.html`, never `index.html`.

`index.html` is committed on purpose, so the page opens straight from the repo or the submission ZIP. Rebuild and commit it whenever the results change.

Tests: `python -m unittest dashboard/test_build_dashboard.py` from the repo root.
