// 4 Policy Scenario Presets for the top strip
export const SCENARIO_PRESETS = [
  {
    id: "baseline",
    label: "Baseline (2022–24 Pace)",
    description:
      "Continues recent 3-year expansion rates (~16.1 GW/yr solar, +3.1 GW/yr coal) with 6.0% annual demand growth.",
    demandGrowthPct: 6.0,
    reCufBoostPct: 0,
    overrides: {}, // Uses exact calibrated recent_additions_gw_yr from modelData.json
  },
  {
    id: "accelerated",
    label: "Accelerated Clean",
    description:
      "Ramps solar to 42 GW/yr and wind to 9 GW/yr, halts new coal (-1.5 GW/yr), and moderates demand growth to 4.8%.",
    demandGrowthPct: 4.8,
    reCufBoostPct: 0,
    overrides: {
      solar: 42.0,
      wind: 9.0,
      nuclear: 1.5,
      coal: -1.5,
    },
  },
  {
    id: "netZeroPush",
    label: "Rapid Coal Phase-Down",
    description:
      "Aggressive 55 GW/yr solar + battery storage boost (+15% RE CUF) enabling -4.5 GW/yr coal retirement.",
    demandGrowthPct: 4.5,
    reCufBoostPct: 15,
    overrides: {
      solar: 55.0,
      wind: 12.0,
      nuclear: 2.0,
      hydro: 1.5,
      coal: -4.5,
    },
  },
  {
    id: "highDemand",
    label: "High-Demand Surge",
    description:
      "Industrial & cooling boom pushes demand growth to 7.2%/yr while renewables scale moderately (28 GW/yr solar).",
    demandGrowthPct: 7.2,
    reCufBoostPct: 0,
    overrides: {
      solar: 28.0,
      wind: 5.5,
      nuclear: 1.0,
      coal: 2.0,
    },
  },
];

const CLEAN_FUELS = new Set([
  "solar",
  "wind",
  "hydro",
  "nuclear",
  "bioenergy",
  "other renewables",
]);

const VARIABLE_RE = new Set(["solar", "wind"]);

/**
 * Pure JS port of Python's simulate_grid() from 01_data_calibration.ipynb.
 * Runs 2025–2040 stock-and-flow projections in < 1 ms in the browser.
 */
export function simulateGrid({
  params,
  startDemandBu,
  startYear = 2025,
  endYear = 2040,
  demandGrowthPct = 6.0,
  additionOverrides = {},
  reCufBoostPct = 0,
}) {
  // Clone starting 2024 capacities so baseline_params is never mutated
  const currentCap = {};
  for (const [fuel, values] of Object.entries(params)) {
    currentCap[fuel] = values["2024_capacity_gw"];
  }

  let demandBu = startDemandBu;
  const records = [];

  for (let year = startYear; year <= endYear; year++) {
    // 1. Compound annual electricity demand growth
    demandBu = demandBu * (1.0 + demandGrowthPct / 100.0);

    let totalGw = 0.0;
    let totalGenBu = 0.0;
    let cleanGenBu = 0.0;
    let fossilGenBu = 0.0;
    let totalCo2Mt = 0.0;

    // 2. Stock-and-flow update per fuel
    for (const [fuel, values] of Object.entries(params)) {
      const annualAdd =
        additionOverrides[fuel] ?? values["recent_additions_gw_yr"];
      currentCap[fuel] = Math.max(0.0, currentCap[fuel] + annualAdd);

      // Optional storage/grid-integration CUF boost for solar & wind
      const cufMultiplier = VARIABLE_RE.has(fuel)
        ? 1.0 + reCufBoostPct / 100.0
        : 1.0;
      const effectiveCuf = values["baseline_cuf_pct"] * cufMultiplier;

      const genBuFuel = currentCap[fuel] * (effectiveCuf / 100.0) * 8.76;
      const co2MtFuel = genBuFuel * values["emission_factor_mt_per_bu"];

      totalGw += currentCap[fuel];
      totalGenBu += genBuFuel;
      totalCo2Mt += co2MtFuel;

      if (CLEAN_FUELS.has(fuel)) {
        cleanGenBu += genBuFuel;
      } else {
        fossilGenBu += genBuFuel;
      }
    }

    // 3. System-wide summary metrics for this year
    records.push({
      Year: year,
      total_capacity_gw: Number(totalGw.toFixed(2)),
      solar_gw: Number(currentCap.solar.toFixed(2)),
      wind_gw: Number(currentCap.wind.toFixed(2)),
      coal_gw: Number(currentCap.coal.toFixed(2)),
      hydro_gw: Number(currentCap.hydro.toFixed(2)),
      nuclear_gw: Number(currentCap.nuclear.toFixed(2)),
      total_gen_bu: Number(totalGenBu.toFixed(2)),
      clean_gen_bu: Number(cleanGenBu.toFixed(2)),
      fossil_gen_bu: Number(fossilGenBu.toFixed(2)),
      demand_bu: Number(demandBu.toFixed(2)),
      supply_gap_bu: Number((totalGenBu - demandBu).toFixed(2)),
      clean_share_pct: Number(((cleanGenBu / totalGenBu) * 100.0).toFixed(2)),
      total_co2_mt: Number(totalCo2Mt.toFixed(2)),
      grid_intensity_gco2_kwh: Number(
        ((totalCo2Mt / totalGenBu) * 1000.0).toFixed(2)
      ),
    });
  }

  return records;
}

/**
 * Computes headline KPIs & a sensitivity sweep (+/- 15% RE additions, +/- 0.5% demand)
 * for the top 5 metric cards.
 */
export function summarizeSimulation(rows, simConfig) {
  const finalYear = rows[rows.length - 1];

  // Peak emissions year
  let peakRow = rows[0];
  for (const row of rows) {
    if (row.total_co2_mt > peakRow.total_co2_mt) {
      peakRow = row;
    }
  }

  // First year clean share reaches >= 50%
  const fiftyPctRow = rows.find((r) => r.clean_share_pct >= 50.0);

  // Sensitivity sweep for 2040 CO2 range (low vs high case)
  const solarBase =
    simConfig.additionOverrides.solar ??
    simConfig.params.solar["recent_additions_gw_yr"];
  const windBase =
    simConfig.additionOverrides.wind ??
    simConfig.params.wind["recent_additions_gw_yr"];

  const lowCo2Run = simulateGrid({
    ...simConfig,
    demandGrowthPct: Math.max(2.0, simConfig.demandGrowthPct - 0.5),
    additionOverrides: {
      ...simConfig.additionOverrides,
      solar: solarBase * 1.15,
      wind: windBase * 1.15,
    },
  });

  const highCo2Run = simulateGrid({
    ...simConfig,
    demandGrowthPct: simConfig.demandGrowthPct + 0.5,
    additionOverrides: {
      ...simConfig.additionOverrides,
      solar: solarBase * 0.85,
      wind: windBase * 0.85,
    },
  });

  return {
    finalYear,
    peakYear: peakRow.Year,
    peakCo2Mt: peakRow.total_co2_mt,
    isPeakedBefore2040: peakRow.Year < 2040,
    fiftyPctYear: fiftyPctRow ? fiftyPctRow.Year : null,
    co2RangeLow: lowCo2Run[lowCo2Run.length - 1].total_co2_mt,
    co2RangeHigh: highCo2Run[highCo2Run.length - 1].total_co2_mt,
  };
}