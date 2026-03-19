# Hybrid Hedging Optimizer

A browser-based LP/MILP hedging optimizer for GitHub Pages.

## What it does

This app lets a user input:
- portfolio factor exposures
- target exposures
- factor importance weights
- available hedge instruments
- instrument costs, bounds, prior positions, and fixed activation costs
- optional budget and max-instrument constraints
- tiered transaction cost settings

It then builds and solves a linear or mixed-integer linear optimization problem in the browser using `glpk.js`.

## Nonlinear features handled through linearization

This project supports practical nonlinear-to-linear reformulations such as:
- absolute residual exposure penalties
- absolute turnover penalties
- tiered / piecewise transaction costs
- instrument activation logic with binary variables
- max number of instruments used

It does **not** claim to convert every nonlinear model exactly into a linear one. It supports common hedging structures that can be reformulated into LP/MILP-compatible form.

## Parameter counts shown in the UI

The app reports how many parameters it is using to optimize and analyze, including:
- number of factors
- number of instruments
- number of exposure coefficients
- factor-side input parameters
- instrument-side input parameters
- total analysis parameters
- decision variables
- binary variables
- total constraints
- optimization parameters

## Files

- `index.html` - main app UI
- `styles.css` - styling
- `app.js` - model builder, solver logic, UI rendering

## Local run

You can simply open `index.html` in a browser, though some browsers may prefer a local server.

Example with Python:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy to GitHub Pages

1. Create a new GitHub repository.
2. Upload `index.html`, `styles.css`, `app.js`, and `README.md` to the root of the repo.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and the `/root` folder.
6. Save.
7. GitHub Pages will provide a live URL for your app.

## Suggested project title

**Hybrid Multi-Factor Hedging Optimizer with LP/MILP Reformulation**

## Resume / LinkedIn description

Built a browser-based multi-factor hedging optimizer that reformulates common nonlinear portfolio hedging features into LP/MILP-compatible form using auxiliary variables, binary activation logic, and piecewise transaction cost approximation. The system optimizes hedge allocations under exposure, budget, turnover, and cardinality constraints while reporting parameter counts, model complexity, and residual factor risk.

## Important note

This is a static front-end optimizer for portfolio hedging and exposure control. It is **not** a forecasting engine by default. If you want a prediction layer later, you can add:
- factor exposure estimation from returns
- volatility forecasting
- scenario generation
- hedge effectiveness backtesting
