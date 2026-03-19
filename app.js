const sampleScenario = {
  scenarioName: "Sample Hedging Case",
  solverMode: "auto",
  lambdaResidual: 80,
  gammaTurnover: 1,
  activationPenalty: 0.25,
  budgetLimit: 200,
  maxInstruments: 3,
  pieceSegments: 2,
  factors: [
    { name: "delta", current: 15, target: 0, weight: 2, exact: false },
    { name: "vega", current: -8, target: 0, weight: 3, exact: false },
    { name: "beta", current: 12, target: 0, weight: 1.5, exact: false },
    { name: "fx", current: 20, target: 0, weight: 2.5, exact: true }
  ],
  instruments: [
    { name: "ES_Futures", cost: 2, lower: -100, upper: 100, prev: 5, lot: 1, fixedCost: 0.8, piece1Cap: 20, piece1Cost: 2, piece2Cost: 2.8, loadings: { delta: -0.2, vega: 0, beta: -1.1, fx: 0 } },
    { name: "SPY_Put", cost: 4.5, lower: 0, upper: 50, prev: 2, lot: 1, fixedCost: 1.5, piece1Cap: 10, piece1Cost: 4.5, piece2Cost: 6, loadings: { delta: -0.6, vega: 0.5, beta: -0.4, fx: 0 } },
    { name: "USDKRW_Forward", cost: 1.2, lower: -200, upper: 200, prev: 0, lot: 1, fixedCost: 0.4, piece1Cap: 50, piece1Cost: 1.2, piece2Cost: 1.5, loadings: { delta: 0, vega: 0, beta: 0, fx: -1 } },
    { name: "VIX_Call", cost: 3, lower: 0, upper: 40, prev: 1, lot: 1, fixedCost: 0.9, piece1Cap: 10, piece1Cost: 3, piece2Cost: 4.2, loadings: { delta: 0, vega: 1.1, beta: -0.1, fx: 0 } }
  ]
};

const ui = {};

document.addEventListener("DOMContentLoaded", async () => {
  wireUi();
  renderScenario(sampleScenario);
  setStatus("Waiting for input", "idle");
  try {
    window.glpk = await glpk();
  } catch (err) {
    setStatus(`GLPK failed to load: ${err.message}`, "bad");
  }
});

function wireUi() {
  ui.scenarioName = document.getElementById("scenarioName");
  ui.solverMode = document.getElementById("solverMode");
  ui.lambdaResidual = document.getElementById("lambdaResidual");
  ui.gammaTurnover = document.getElementById("gammaTurnover");
  ui.activationPenalty = document.getElementById("activationPenalty");
  ui.budgetLimit = document.getElementById("budgetLimit");
  ui.maxInstruments = document.getElementById("maxInstruments");
  ui.pieceSegments = document.getElementById("pieceSegments");

  ui.factorsTableWrap = document.getElementById("factorsTableWrap");
  ui.instrumentsTableWrap = document.getElementById("instrumentsTableWrap");
  ui.uploadInput = document.getElementById("uploadInput");

  document.getElementById("loadSampleBtn").addEventListener("click", () => renderScenario(sampleScenario));
  document.getElementById("addFactorBtn").addEventListener("click", addFactorRow);
  document.getElementById("addInstrumentBtn").addEventListener("click", addInstrumentRow);
  document.getElementById("optimizeBtn").addEventListener("click", optimizeScenario);
  document.getElementById("downloadBtn").addEventListener("click", downloadScenario);
  ui.uploadInput.addEventListener("change", handleUpload);
}

function renderScenario(scenario) {
  ui.scenarioName.value = scenario.scenarioName ?? "New Scenario";
  ui.solverMode.value = scenario.solverMode ?? "auto";
  ui.lambdaResidual.value = scenario.lambdaResidual ?? 80;
  ui.gammaTurnover.value = scenario.gammaTurnover ?? 1;
  ui.activationPenalty.value = scenario.activationPenalty ?? 0.25;
  ui.budgetLimit.value = scenario.budgetLimit ?? "";
  ui.maxInstruments.value = scenario.maxInstruments ?? "";
  ui.pieceSegments.value = scenario.pieceSegments ?? 2;
  renderFactorsTable(scenario.factors ?? []);
  renderInstrumentsTable(scenario.instruments ?? [], scenario.factors ?? []);
}

function renderFactorsTable(factors) {
  const rows = factors.map((factor, idx) => `
    <tr>
      <td><input data-role="factor-name" value="${escapeHtml(factor.name)}" /></td>
      <td><input data-role="factor-current" type="number" step="0.01" value="${factor.current ?? 0}" /></td>
      <td><input data-role="factor-target" type="number" step="0.01" value="${factor.target ?? 0}" /></td>
      <td><input data-role="factor-weight" type="number" step="0.01" value="${factor.weight ?? 1}" /></td>
      <td class="checkbox-cell"><input data-role="factor-exact" type="checkbox" ${factor.exact ? "checked" : ""} /></td>
      <td><button class="small-btn" onclick="deleteFactorRow(${idx})">Delete</button></td>
    </tr>
  `).join("");

  ui.factorsTableWrap.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Current</th>
            <th>Target</th>
            <th>Weight</th>
            <th>Exact Hedge</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function renderInstrumentsTable(instruments, factors) {
  const factorNames = factors.map(f => f.name);
  const loadingHeaders = factorNames.map(name => `<th>${escapeHtml(name)}</th>`).join("");
  const loadingCells = (instrument) => factorNames.map(name => `
      <td><input data-role="loading-${escapeAttr(name)}" type="number" step="0.01" value="${instrument.loadings?.[name] ?? 0}" /></td>
  `).join("");

  const rows = instruments.map((instrument, idx) => `
    <tr>
      <td><input data-role="inst-name" value="${escapeHtml(instrument.name)}" /></td>
      <td><input data-role="inst-cost" type="number" step="0.01" value="${instrument.cost ?? 0}" /></td>
      <td><input data-role="inst-fixedCost" type="number" step="0.01" value="${instrument.fixedCost ?? 0}" /></td>
      <td><input data-role="inst-lower" type="number" step="0.01" value="${instrument.lower ?? 0}" /></td>
      <td><input data-role="inst-upper" type="number" step="0.01" value="${instrument.upper ?? 0}" /></td>
      <td><input data-role="inst-prev" type="number" step="0.01" value="${instrument.prev ?? 0}" /></td>
      <td><input data-role="inst-lot" type="number" step="0.01" value="${instrument.lot ?? 1}" /></td>
      <td><input data-role="inst-piece1Cap" type="number" step="0.01" value="${instrument.piece1Cap ?? Math.max(0, instrument.upper ?? 0)}" /></td>
      <td><input data-role="inst-piece1Cost" type="number" step="0.01" value="${instrument.piece1Cost ?? instrument.cost ?? 0}" /></td>
      <td><input data-role="inst-piece2Cost" type="number" step="0.01" value="${instrument.piece2Cost ?? instrument.cost ?? 0}" /></td>
      ${loadingCells(instrument)}
      <td><button class="small-btn" onclick="deleteInstrumentRow(${idx})">Delete</button></td>
    </tr>
  `).join("");

  ui.instrumentsTableWrap.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Cost</th>
            <th>Fixed Cost</th>
            <th>Lower</th>
            <th>Upper</th>
            <th>Prev</th>
            <th>Lot</th>
            <th>Tier 1 Cap</th>
            <th>Tier 1 Cost</th>
            <th>Tier 2 Cost</th>
            ${loadingHeaders}
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function collectScenario() {
  const factorRows = [...ui.factorsTableWrap.querySelectorAll("tbody tr")];
  const factors = factorRows.map(row => ({
    name: row.querySelector('[data-role="factor-name"]').value.trim(),
    current: toNumber(row.querySelector('[data-role="factor-current"]').value),
    target: toNumber(row.querySelector('[data-role="factor-target"]').value),
    weight: toNumber(row.querySelector('[data-role="factor-weight"]').value, 1),
    exact: row.querySelector('[data-role="factor-exact"]').checked
  })).filter(f => f.name);

  const factorNames = factors.map(f => f.name);
  const instRows = [...ui.instrumentsTableWrap.querySelectorAll("tbody tr")];
  const instruments = instRows.map(row => {
    const loadings = {};
    factorNames.forEach(name => {
      loadings[name] = toNumber(row.querySelector(`[data-role="loading-${cssEscape(name)}"]`)?.value);
    });
    return {
      name: row.querySelector('[data-role="inst-name"]').value.trim(),
      cost: toNumber(row.querySelector('[data-role="inst-cost"]').value),
      fixedCost: toNumber(row.querySelector('[data-role="inst-fixedCost"]').value),
      lower: toNumber(row.querySelector('[data-role="inst-lower"]').value),
      upper: toNumber(row.querySelector('[data-role="inst-upper"]').value),
      prev: toNumber(row.querySelector('[data-role="inst-prev"]').value),
      lot: Math.max(0.0001, toNumber(row.querySelector('[data-role="inst-lot"]').value, 1)),
      piece1Cap: toNumber(row.querySelector('[data-role="inst-piece1Cap"]').value),
      piece1Cost: toNumber(row.querySelector('[data-role="inst-piece1Cost"]').value),
      piece2Cost: toNumber(row.querySelector('[data-role="inst-piece2Cost"]').value),
      loadings
    };
  }).filter(i => i.name);

  return {
    scenarioName: ui.scenarioName.value.trim() || "Untitled Scenario",
    solverMode: ui.solverMode.value,
    lambdaResidual: toNumber(ui.lambdaResidual.value, 80),
    gammaTurnover: toNumber(ui.gammaTurnover.value, 1),
    activationPenalty: toNumber(ui.activationPenalty.value, 0.25),
    budgetLimit: readOptional(ui.budgetLimit.value),
    maxInstruments: readOptionalInt(ui.maxInstruments.value),
    pieceSegments: Math.max(1, parseInt(ui.pieceSegments.value || "2", 10)),
    factors,
    instruments
  };
}

async function optimizeScenario() {
  try {
    if (!window.glpk) throw new Error("GLPK is not loaded yet.");
    const scenario = collectScenario();
    validateScenario(scenario);
    const compiled = buildOptimizationModel(scenario);
    const result = solveModel(compiled.model);
    renderResult(scenario, compiled, result);
  } catch (err) {
    setStatus(err.message, "bad");
    clearOutputs();
  }
}

function validateScenario(scenario) {
  if (scenario.factors.length === 0) throw new Error("Add at least one factor.");
  if (scenario.instruments.length === 0) throw new Error("Add at least one hedge instrument.");
  scenario.factors.forEach(f => {
    if (!f.name) throw new Error("Factor name cannot be empty.");
  });
  scenario.instruments.forEach(inst => {
    if (!inst.name) throw new Error("Instrument name cannot be empty.");
    if (inst.upper < inst.lower) throw new Error(`Upper bound must be >= lower bound for ${inst.name}.`);
    if (inst.piece1Cap < 0) throw new Error(`Tier 1 cap must be non-negative for ${inst.name}.`);
  });
  if (scenario.maxInstruments !== null && scenario.maxInstruments <= 0) throw new Error("Max instruments must be positive when provided.");
}

function buildOptimizationModel(scenario) {
  const GLP = window.glpk;
  const vars = [];
  const binaries = [];
  const subjectTo = [];
  const bounds = [];
  const objectiveVars = [];
  const notes = [];
  const summaryLines = [];

  const factorNames = scenario.factors.map(f => f.name);
  const instrumentNames = scenario.instruments.map(i => i.name);
  const useMilp = scenario.solverMode === "milp" || scenario.maxInstruments !== null || scenario.instruments.some(i => i.fixedCost > 0 || i.lot > 1e-9) || scenario.solverMode === "auto";

  notes.push("Absolute residuals and absolute turnover are linearized with auxiliary variables.");
  summaryLines.push(`Scenario: ${scenario.scenarioName}`);
  summaryLines.push(`Factors (${factorNames.length}): ${factorNames.join(", ")}`);
  summaryLines.push(`Instruments (${instrumentNames.length}): ${instrumentNames.join(", ")}`);

  for (const inst of scenario.instruments) {
    const x = `x_${slug(inst.name)}`;
    const xPos = `xpos_${slug(inst.name)}`;
    const xNeg = `xneg_${slug(inst.name)}`;
    const absX = `absx_${slug(inst.name)}`;
    const turnPos = `tpos_${slug(inst.name)}`;
    const turnNeg = `tneg_${slug(inst.name)}`;
    const absTurn = `absturn_${slug(inst.name)}`;
    const useVar = `use_${slug(inst.name)}`;
    const seg1 = `seg1_${slug(inst.name)}`;
    const seg2 = `seg2_${slug(inst.name)}`;

    vars.push(x, xPos, xNeg, absX, turnPos, turnNeg, absTurn, seg1, seg2);
    if (useMilp) binaries.push(useVar);
    else vars.push(useVar);

    bounds.push({ name: xPos, type: GLP.GLP_LO, lb: 0, ub: 0 });
    bounds.push({ name: xNeg, type: GLP.GLP_LO, lb: 0, ub: 0 });
    bounds.push({ name: absX, type: GLP.GLP_LO, lb: 0, ub: 0 });
    bounds.push({ name: turnPos, type: GLP.GLP_LO, lb: 0, ub: 0 });
    bounds.push({ name: turnNeg, type: GLP.GLP_LO, lb: 0, ub: 0 });
    bounds.push({ name: absTurn, type: GLP.GLP_LO, lb: 0, ub: 0 });
    bounds.push({ name: seg1, type: GLP.GLP_DB, lb: 0, ub: Math.max(0, Math.min(inst.piece1Cap, Math.max(Math.abs(inst.lower), Math.abs(inst.upper)))) });
    bounds.push({ name: seg2, type: GLP.GLP_LO, lb: 0, ub: 0 });

    if (useMilp) {
      bounds.push({ name: useVar, type: GLP.GLP_DB, lb: 0, ub: 1 });
      notes.push(`Instrument activation for ${inst.name} uses a binary variable.`);
    } else {
      bounds.push({ name: useVar, type: GLP.GLP_DB, lb: 0, ub: 1 });
    }

    subjectTo.push({ name: `decomp_${slug(inst.name)}`, vars: [{ name: x, coef: 1 }, { name: xPos, coef: -1 }, { name: xNeg, coef: 1 }], bnds: { type: GLP.GLP_FX, lb: 0, ub: 0 } });
    subjectTo.push({ name: `absx_${slug(inst.name)}`, vars: [{ name: absX, coef: 1 }, { name: xPos, coef: -1 }, { name: xNeg, coef: -1 }], bnds: { type: GLP.GLP_FX, lb: 0, ub: 0 } });
    subjectTo.push({ name: `turn_${slug(inst.name)}`, vars: [{ name: x, coef: 1 }, { name: turnPos, coef: -1 }, { name: turnNeg, coef: 1 }], bnds: { type: GLP.GLP_FX, lb: inst.prev, ub: inst.prev } });
    subjectTo.push({ name: `absturn_${slug(inst.name)}`, vars: [{ name: absTurn, coef: 1 }, { name: turnPos, coef: -1 }, { name: turnNeg, coef: -1 }], bnds: { type: GLP.GLP_FX, lb: 0, ub: 0 } });
    subjectTo.push({ name: `tier_${slug(inst.name)}`, vars: [{ name: absX, coef: 1 }, { name: seg1, coef: -1 }, { name: seg2, coef: -1 }], bnds: { type: GLP.GLP_FX, lb: 0, ub: 0 } });

    if (useMilp) {
      const magnitude = Math.max(Math.abs(inst.lower), Math.abs(inst.upper));
      subjectTo.push({ name: `use_link_pos_${slug(inst.name)}`, vars: [{ name: xPos, coef: 1 }, { name: useVar, coef: -magnitude }], bnds: { type: GLP.GLP_UP, lb: 0, ub: 0 } });
      subjectTo.push({ name: `use_link_neg_${slug(inst.name)}`, vars: [{ name: xNeg, coef: 1 }, { name: useVar, coef: -magnitude }], bnds: { type: GLP.GLP_UP, lb: 0, ub: 0 } });
      if (inst.lot > 1.000001) {
        notes.push(`Lot size for ${inst.name} is handled approximately by scaling activation and bounds; exact integer lot sizing would require more binaries.`);
      }
    }

    bounds.push({ name: x, type: GLP.GLP_DB, lb: inst.lower, ub: inst.upper });

    objectiveVars.push({ name: seg1, coef: inst.piece1Cost });
    objectiveVars.push({ name: seg2, coef: inst.piece2Cost });
    objectiveVars.push({ name: absTurn, coef: scenario.gammaTurnover });
    objectiveVars.push({ name: useVar, coef: (inst.fixedCost || 0) + scenario.activationPenalty });
  }

  for (const factor of scenario.factors) {
    const res = `res_${slug(factor.name)}`;
    const pos = `rpos_${slug(factor.name)}`;
    const neg = `rneg_${slug(factor.name)}`;
    const abs = `absres_${slug(factor.name)}`;
    vars.push(res, pos, neg, abs);
    bounds.push({ name: pos, type: GLP.GLP_LO, lb: 0, ub: 0 });
    bounds.push({ name: neg, type: GLP.GLP_LO, lb: 0, ub: 0 });
    bounds.push({ name: abs, type: GLP.GLP_LO, lb: 0, ub: 0 });
    bounds.push({ name: res, type: GLP.GLP_FR, lb: 0, ub: 0 });

    const eqVars = [{ name: res, coef: 1 }, { name: pos, coef: -1 }, { name: neg, coef: 1 }];
    scenario.instruments.forEach(inst => {
      eqVars.push({ name: `x_${slug(inst.name)}`, coef: -(inst.loadings?.[factor.name] ?? 0) });
    });
    subjectTo.push({
      name: `factor_balance_${slug(factor.name)}`,
      vars: eqVars,
      bnds: { type: GLP.GLP_FX, lb: factor.current - factor.target, ub: factor.current - factor.target }
    });
    subjectTo.push({ name: `factor_abs_${slug(factor.name)}`, vars: [{ name: abs, coef: 1 }, { name: pos, coef: -1 }, { name: neg, coef: -1 }], bnds: { type: GLP.GLP_FX, lb: 0, ub: 0 } });
    objectiveVars.push({ name: abs, coef: scenario.lambdaResidual * factor.weight });
    if (factor.exact) {
      subjectTo.push({ name: `factor_exact_${slug(factor.name)}`, vars: [{ name: res, coef: 1 }], bnds: { type: GLP.GLP_FX, lb: 0, ub: 0 } });
      notes.push(`Exact hedge enforced for factor ${factor.name}.`);
    }
  }

  if (scenario.maxInstruments !== null) {
    subjectTo.push({
      name: "max_instruments",
      vars: scenario.instruments.map(inst => ({ name: `use_${slug(inst.name)}`, coef: 1 })),
      bnds: { type: GLP.GLP_UP, lb: 0, ub: scenario.maxInstruments }
    });
    notes.push(`Cardinality constraint enabled: at most ${scenario.maxInstruments} instruments.`);
  }

  if (scenario.budgetLimit !== null) {
    const costVars = [];
    scenario.instruments.forEach(inst => {
      costVars.push({ name: `seg1_${slug(inst.name)}`, coef: inst.piece1Cost });
      costVars.push({ name: `seg2_${slug(inst.name)}`, coef: inst.piece2Cost });
      costVars.push({ name: `use_${slug(inst.name)}`, coef: (inst.fixedCost || 0) + scenario.activationPenalty });
    });
    subjectTo.push({ name: "budget_limit", vars: costVars, bnds: { type: GLP.GLP_UP, lb: 0, ub: scenario.budgetLimit } });
    notes.push(`Budget limit enabled at ${scenario.budgetLimit}.`);
  }

  summaryLines.push(`Variables: ${vars.length + binaries.length}`);
  summaryLines.push(`Binary variables: ${binaries.length}`);
  summaryLines.push(`Constraints: ${subjectTo.length}`);
  summaryLines.push(`Model class: ${useMilp ? "MILP" : "LP"}`);

  const uniqueVars = Array.from(new Set(vars));
  const uniqueBinaries = Array.from(new Set(binaries));
  const model = {
    name: scenario.scenarioName,
    objective: {
      direction: GLP.GLP_MIN,
      name: "obj",
      vars: objectiveVars
    },
    subjectTo,
    bounds,
    binaries: uniqueBinaries,
    generals: []
  };

  const parameterCounts = {
    factorCount: scenario.factors.length,
    instrumentCount: scenario.instruments.length,
    exposureParameters: scenario.factors.length * scenario.instruments.length,
    factorInputParameters: scenario.factors.length * 4,
    instrumentInputParameters: scenario.instruments.length * 9,
    decisionVariables: uniqueVars.length + uniqueBinaries.length,
    binaryVariables: uniqueBinaries.length,
    constraints: subjectTo.length,
    analysisParameters: scenario.factors.length * scenario.instruments.length + scenario.factors.length * 3 + scenario.instruments.length * 7,
    optimizationParameters: objectiveVars.length + subjectTo.length
  };

  return {
    model,
    notes: Array.from(new Set(notes)),
    summary: summaryLines.join("\n"),
    parameterCounts,
    metadata: { useMilp, factorNames, instrumentNames }
  };
}

function solveModel(model) {
  const GLP = window.glpk;
  const options = {
    msglev: GLP.GLP_MSG_OFF,
    presol: true,
    tmlim: 15_000
  };
  return window.glpk.solve(model, options);
}

function renderResult(scenario, compiled, result) {
  const status = result.result?.status;
  const z = result.result?.z;
  const vars = result.result?.vars || {};
  const acceptable = [window.glpk.GLP_OPT, window.glpk.GLP_FEAS].includes(status);

  if (!acceptable) {
    setStatus(`Solver finished with status code ${status}. Check bounds or relax constraints.`, "warn");
  } else {
    setStatus(`Optimization complete for ${scenario.scenarioName}.`, "good");
  }

  document.getElementById("modelUsed").textContent = compiled.metadata.useMilp ? "MILP" : "LP";
  document.getElementById("objectiveValue").textContent = formatNumber(z);

  let totalCost = 0;
  const positionsRows = scenario.instruments.map(inst => {
    const key = `x_${slug(inst.name)}`;
    const pos = vars[key] ?? 0;
    const absPos = vars[`absx_${slug(inst.name)}`] ?? Math.abs(pos);
    const active = (vars[`use_${slug(inst.name)}`] ?? 0) > 0.5 ? "Yes" : "No";
    const tier1 = vars[`seg1_${slug(inst.name)}`] ?? 0;
    const tier2 = vars[`seg2_${slug(inst.name)}`] ?? 0;
    const cost = tier1 * inst.piece1Cost + tier2 * inst.piece2Cost + (vars[`use_${slug(inst.name)}`] ?? 0) * ((inst.fixedCost || 0) + scenario.activationPenalty);
    totalCost += cost;
    return `<tr>
      <td>${escapeHtml(inst.name)}</td>
      <td>${formatNumber(pos)}</td>
      <td>${formatNumber(absPos)}</td>
      <td>${formatNumber(vars[`absturn_${slug(inst.name)}`] ?? 0)}</td>
      <td>${active}</td>
      <td>${formatNumber(cost)}</td>
    </tr>`;
  }).join("");

  const residualRows = scenario.factors.map(f => {
    const res = vars[`res_${slug(f.name)}`] ?? 0;
    return `<tr>
      <td>${escapeHtml(f.name)}</td>
      <td>${formatNumber(f.current)}</td>
      <td>${formatNumber(f.target)}</td>
      <td>${formatNumber(res)}</td>
      <td>${f.exact ? "Yes" : "No"}</td>
    </tr>`;
  }).join("");

  document.getElementById("positionsTable").innerHTML = tableHtml(["Instrument", "Position", "Absolute", "Turnover", "Active", "Cost"], positionsRows);
  document.getElementById("residualsTable").innerHTML = tableHtml(["Factor", "Current", "Target", "Residual", "Exact"], residualRows);

  document.getElementById("totalCost").textContent = formatNumber(totalCost);
  document.getElementById("activeInstruments").textContent = scenario.instruments.filter(inst => (vars[`use_${slug(inst.name)}`] ?? 0) > 0.5).length.toString();

  renderParameterCounts(compiled.parameterCounts);
  renderNotes(compiled.notes);
  renderObjectiveBreakdown(scenario, vars);
  document.getElementById("modelSummary").textContent = compiled.summary;
}

function renderParameterCounts(counts) {
  const entries = [
    ["Factors", counts.factorCount],
    ["Instruments", counts.instrumentCount],
    ["Exposure Parameters", counts.exposureParameters],
    ["Factor Input Parameters", counts.factorInputParameters],
    ["Instrument Input Parameters", counts.instrumentInputParameters],
    ["Analysis Parameters", counts.analysisParameters],
    ["Decision Variables", counts.decisionVariables],
    ["Binary Variables", counts.binaryVariables],
    ["Constraints", counts.constraints],
    ["Optimization Parameters", counts.optimizationParameters]
  ];
  document.getElementById("parameterCounts").innerHTML = `<div class="kv-grid">${entries.map(([k, v]) => `<div class="kv-item"><span>${k}</span><strong>${v}</strong></div>`).join("")}</div>`;
}

function renderNotes(notes) {
  document.getElementById("optimizationNotes").innerHTML = notes.map(n => `<li>${escapeHtml(n)}</li>`).join("");
}

function renderObjectiveBreakdown(scenario, vars) {
  let residualPenalty = 0;
  let turnoverPenalty = 0;
  let tieredCost = 0;
  let activationCost = 0;

  scenario.factors.forEach(f => {
    residualPenalty += (vars[`absres_${slug(f.name)}`] ?? 0) * scenario.lambdaResidual * f.weight;
  });
  scenario.instruments.forEach(inst => {
    turnoverPenalty += (vars[`absturn_${slug(inst.name)}`] ?? 0) * scenario.gammaTurnover;
    tieredCost += (vars[`seg1_${slug(inst.name)}`] ?? 0) * inst.piece1Cost + (vars[`seg2_${slug(inst.name)}`] ?? 0) * inst.piece2Cost;
    activationCost += (vars[`use_${slug(inst.name)}`] ?? 0) * ((inst.fixedCost || 0) + scenario.activationPenalty);
  });

  const rows = `
    <tr><td>Residual Penalty</td><td>${formatNumber(residualPenalty)}</td></tr>
    <tr><td>Turnover Penalty</td><td>${formatNumber(turnoverPenalty)}</td></tr>
    <tr><td>Tiered Variable Cost</td><td>${formatNumber(tieredCost)}</td></tr>
    <tr><td>Activation / Fixed Cost</td><td>${formatNumber(activationCost)}</td></tr>
    <tr><td>Total Objective (approx.)</td><td>${formatNumber(residualPenalty + turnoverPenalty + tieredCost + activationCost)}</td></tr>
  `;
  document.getElementById("objectiveBreakdown").innerHTML = tableHtml(["Component", "Value"], rows);
}

function tableHtml(headers, rows) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function setStatus(message, mode) {
  const el = document.getElementById("statusBanner");
  el.className = `status-banner ${mode}`;
  el.textContent = message;
}

function clearOutputs() {
  ["modelUsed", "objectiveValue", "totalCost", "activeInstruments"].forEach(id => document.getElementById(id).textContent = "-");
  ["parameterCounts", "optimizationNotes", "positionsTable", "residualsTable", "objectiveBreakdown", "modelSummary"].forEach(id => document.getElementById(id).innerHTML = "");
}

function addFactorRow() {
  const scenario = collectScenarioSafe();
  scenario.factors.push({ name: `factor_${scenario.factors.length + 1}`, current: 0, target: 0, weight: 1, exact: false });
  renderFactorsTable(scenario.factors);
  renderInstrumentsTable(scenario.instruments, scenario.factors);
}

function addInstrumentRow() {
  const scenario = collectScenarioSafe();
  const loadings = {};
  scenario.factors.forEach(f => loadings[f.name] = 0);
  scenario.instruments.push({ name: `instrument_${scenario.instruments.length + 1}`, cost: 1, fixedCost: 0, lower: -10, upper: 10, prev: 0, lot: 1, piece1Cap: 5, piece1Cost: 1, piece2Cost: 1.3, loadings });
  renderInstrumentsTable(scenario.instruments, scenario.factors);
}

window.deleteFactorRow = function(idx) {
  const scenario = collectScenarioSafe();
  scenario.factors.splice(idx, 1);
  scenario.instruments.forEach(inst => delete inst.loadings?.[scenario.factors[idx]?.name]);
  renderFactorsTable(scenario.factors);
  renderInstrumentsTable(scenario.instruments, scenario.factors);
};

window.deleteInstrumentRow = function(idx) {
  const scenario = collectScenarioSafe();
  scenario.instruments.splice(idx, 1);
  renderInstrumentsTable(scenario.instruments, scenario.factors);
};

function collectScenarioSafe() {
  try {
    return collectScenario();
  } catch {
    return structuredClone(sampleScenario);
  }
}

function downloadScenario() {
  const scenario = collectScenarioSafe();
  const blob = new Blob([JSON.stringify(scenario, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${slug(scenario.scenarioName)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function handleUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      renderScenario(parsed);
      setStatus(`Loaded ${file.name}`, "good");
    } catch (err) {
      setStatus(`Could not parse JSON: ${err.message}`, "bad");
    }
  };
  reader.readAsText(file);
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readOptional(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function readOptionalInt(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "-";
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function slug(text) {
  return String(text).trim().replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "var";
}

function cssEscape(text) {
  return String(text).replace(/(["\\])/g, "\\$1");
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(text) {
  return String(text ?? "").replace(/"/g, "&quot;");
}
