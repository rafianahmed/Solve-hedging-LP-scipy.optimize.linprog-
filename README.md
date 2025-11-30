Problem statement

We have d assets and m possible future states.

p ∈ R^d are asset prices today.

S ∈ R^{m×d} where S[i,j] is the payoff of asset j in state i.

X ∈ R^m is a contingent obligation: if state i occurs we must pay X[i].
Choose holdings θ ∈ R^d to minimize current cost pᵀ θ while ensuring payoffs cover the obligation in every state:

minimize   p^T θ
subject to S θ >= X   (componentwise)


This is a linear program (LP).

Converting to scipy.optimize.linprog

linprog expects constraints in the form A_ub x <= b_ub and equalities A_eq x = b_eq.
To represent S θ >= X use -S θ <= -X:

Set c = p (minimize c^T θ).

Set A_ub = -S.

Set b_ub = -X.

Call linprog(c, A_ub=A_ub, b_ub=b_ub, method='highs').

Dual LP (economic interpretation)

The dual variables u ∈ R^m are state prices (nonnegative). Dual LP:

maximize   X^T u
subject to S^T u = p
           u >= 0


Interpretation: find nonnegative state-price vector u consistent with observed asset prices so that the cost X^T u (expected cost under these prices) is maximized. Strong duality guarantees the minimal hedging cost equals this maximal arbitrage-free price.

Example (numbers)

p = [2, 3]

S = [[1,0], [0,2], [1,1]]

X = [1,2,1]

Results:

Optimal holdings θ* = [1, 1].

Minimal cost pᵀ θ* = 5.

Optimal state prices u* = [2.0, 1.5, 0.0].

Dual value Xᵀ u* = 5 (matches primal by strong duality).

S θ* = [1, 2, 2] >= X (feasible).

Complementary slackness: u_i * (S θ - X)_i = 0 for all states (here all zero), indicating which constraints are tight: first two constraints tight, third slack (since payoff exceeds obligation in state 3 and u_3 = 0).

How to interpret the state prices u

u[i] is the implied price today of a unit payoff in state i.

S^T u = p shows asset prices equal the present value (state-price weighted payoffs).

The hedging cost of X equals X^T u for any such u; the dual maximizes over all admissible u.

Practical notes & edge cases

If primal infeasible: no hedging portfolio can cover the obligation; linprog will report infeasible.

If primal unbounded: arbitrage exists — infinite profit/negative cost can be found (rare if prices sensible).

Numerical stability: use method='highs' (recommended) and check feasibility tolerances.

To recover dual variables from solver internals: scipy may expose them in the result object (depending on solver). Solving the dual explicitly (as shown) gives full control.
