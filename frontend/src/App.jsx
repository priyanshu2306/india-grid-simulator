import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Check, Download, Moon, RotateCcw, Share2, Sun, Zap } from "lucide-react";
import modelData from "./data/modelData.json";
import {
  SCENARIO_PRESETS,
  simulateGrid,
  summarizeSimulation,
} from "./utils/simulateGrid";

const EDITABLE_FUELS = [
  { key: "solar", label: "Solar PV", min: 0, max: 80, step: 1, color: "var(--solar)" },
  { key: "wind", label: "Wind", min: 0, max: 25, step: 0.5, color: "var(--wind)" },
  { key: "coal", label: "Coal", min: -10, max: 12, step: 0.5, color: "var(--coal)" },
  { key: "nuclear", label: "Nuclear", min: 0, max: 6, step: 0.25, color: "var(--nuclear)" },
  { key: "hydro", label: "Hydro", min: 0, max: 6, step: 0.25, color: "var(--hydro)" },
];

const COAL_POLICIES = [
  { id: "baseline", label: "Baseline", sub: "+3.1 GW/yr", value: null },
  { id: "freeze", label: "No New", sub: "0 GW/yr", value: 0 },
  { id: "retire", label: "Retire", sub: "-3.0 GW/yr", value: -3.0 },
];

const STORAGE_OPTIONS = [
  { value: 0, label: "0% · Baseline CUF" },
  { value: 10, label: "+10% · Moderate BESS" },
  { value: 15, label: "+15% · High Storage" },
  { value: 25, label: "+25% · Deep Hybrid" },
];

const fmtNum = (val, decimals = 1) =>
  Number(val).toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const fmtSigned = (val, decimals = 1) =>
  `${val > 0 ? "+" : ""}${fmtNum(val, decimals)}`;

const sliderStyle = (val, min, max, color) => {
  const pct = Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100));
  return {
    "--slider-pct": `${pct}%`,
    "--slider-color": color,
  };
};

function getInitialTheme() {
  try {
    const saved = localStorage.getItem("india-grid-theme");
    if (saved === "light" || saved === "dark") return saved;
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
  } catch {
    // Ignore storage access issues
  }
  return "light";
}

function getInitialState() {
  const fallback = SCENARIO_PRESETS[0];
  try {
    const raw = new URLSearchParams(window.location.search).get("scenario");
    if (!raw) {
      return {
        presetId: fallback.id,
        demandGrowthPct: fallback.demandGrowthPct,
        reCufBoostPct: fallback.reCufBoostPct,
        overrides: { ...fallback.overrides },
      };
    }
    const parsed = JSON.parse(raw);
    return {
      presetId: parsed.presetId || "custom",
      demandGrowthPct: Number(parsed.demandGrowthPct) || fallback.demandGrowthPct,
      reCufBoostPct: Number(parsed.reCufBoostPct) || 0,
      overrides: parsed.overrides || {},
    };
  } catch {
    return {
      presetId: fallback.id,
      demandGrowthPct: fallback.demandGrowthPct,
      reCufBoostPct: fallback.reCufBoostPct,
      overrides: { ...fallback.overrides },
    };
  }
}

function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      className="rounded-[10px] border px-3.5 py-2.5 text-xs backdrop-blur-md"
      style={{
        backgroundColor: "var(--tooltip-bg)",
        borderColor: "var(--rule-strong)",
        color: "var(--ink)",
        boxShadow: "var(--shadow-popover)",
      }}
    >
      <div className="font-mono-num font-semibold border-b pb-1.5 mb-2 border-[var(--rule)]">
        {label}
      </div>
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div
            key={entry.dataKey}
            className="flex items-center justify-between gap-5"
          >
            <span className="flex items-center gap-2 text-[var(--ink-muted)]">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-mono-num font-semibold text-[var(--ink)]">
              {fmtNum(entry.value, 1)} {unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const { metadata, baseline_params: params, historical } = modelData;

  const hist2024Co2Mt = useMemo(() => {
    const latest = historical.emissions_mt[historical.emissions_mt.length - 1];
    return Object.entries(latest)
      .filter(([key]) => key !== "Year")
      .reduce((acc, [, val]) => acc + Number(val || 0), 0);
  }, [historical.emissions_mt]);

  const hist2024Intensity = useMemo(
    () => (hist2024Co2Mt / metadata.demand_anchor_bu) * 1000,
    [hist2024Co2Mt, metadata.demand_anchor_bu]
  );

  const initial = useMemo(() => getInitialState(), []);
  const [presetId, setPresetId] = useState(initial.presetId);
  const [demandGrowthPct, setDemandGrowthPct] = useState(initial.demandGrowthPct);
  const [reCufBoostPct, setReCufBoostPct] = useState(initial.reCufBoostPct);
  const [overrides, setOverrides] = useState(initial.overrides);

  const [theme, setTheme] = useState(getInitialTheme);
  const [activeTab, setActiveTab] = useState("emissions");
  const [showAllYears, setShowAllYears] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState("");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("india-grid-theme", theme);
    } catch {
      // Ignore storage access issues
    }
  }, [theme]);

  useEffect(() => {
    if (!copiedMsg) return;
    const t = setTimeout(() => setCopiedMsg(""), 2200);
    return () => clearTimeout(t);
  }, [copiedMsg]);

  const baselineRows = useMemo(
    () =>
      simulateGrid({
        params,
        startDemandBu: metadata.demand_anchor_bu,
        startYear: metadata.sim_start_year,
        endYear: metadata.sim_end_year,
        demandGrowthPct: 6.0,
        additionOverrides: {},
        reCufBoostPct: 0,
      }),
    [params, metadata]
  );

  const simConfig = useMemo(
    () => ({
      params,
      startDemandBu: metadata.demand_anchor_bu,
      startYear: metadata.sim_start_year,
      endYear: metadata.sim_end_year,
      demandGrowthPct,
      additionOverrides: overrides,
      reCufBoostPct,
    }),
    [params, metadata, demandGrowthPct, overrides, reCufBoostPct]
  );

  const activeRows = useMemo(() => simulateGrid(simConfig), [simConfig]);
  const summary = useMemo(
    () => summarizeSimulation(activeRows, simConfig),
    [activeRows, simConfig]
  );

  const combinedRows = useMemo(
    () =>
      activeRows.map((row, idx) => {
        const base = baselineRows[idx];
        return {
          ...row,
          baseline_co2_mt: base.total_co2_mt,
          delta_co2_mt: Number((row.total_co2_mt - base.total_co2_mt).toFixed(2)),
        };
      }),
    [activeRows, baselineRows]
  );

  const finalBase = baselineRows[baselineRows.length - 1];
  const finalDeltaCo2 = summary.finalYear.total_co2_mt - finalBase.total_co2_mt;
  const rangeMin = Math.min(summary.co2RangeLow, summary.co2RangeHigh);
  const rangeMax = Math.max(summary.co2RangeLow, summary.co2RangeHigh);

  const activePresetObj = SCENARIO_PRESETS.find((p) => p.id === presetId);
  const activeCoalRate = overrides.coal ?? params.coal["recent_additions_gw_yr"];

  function selectPreset(preset) {
    setPresetId(preset.id);
    setDemandGrowthPct(preset.demandGrowthPct);
    setReCufBoostPct(preset.reCufBoostPct);
    setOverrides({ ...preset.overrides });
  }

  function updateFuelOverride(fuelKey, value) {
    setPresetId("custom");
    setOverrides((prev) => ({ ...prev, [fuelKey]: value }));
  }

  function applyCoalPolicy(policyValue) {
    setPresetId("custom");
    setOverrides((prev) => {
      const next = { ...prev };
      if (policyValue === null) delete next.coal;
      else next.coal = policyValue;
      return next;
    });
  }

  function handleReset() {
    selectPreset(SCENARIO_PRESETS[0]);
    window.history.replaceState({}, "", window.location.pathname);
  }

  async function handleShare() {
    const url = new URL(window.location.href);
    url.searchParams.set(
      "scenario",
      JSON.stringify({ presetId, demandGrowthPct, reCufBoostPct, overrides })
    );
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopiedMsg("Link copied");
    } catch {
      setCopiedMsg("URL updated");
      window.history.replaceState({}, "", url.toString());
    }
  }

  function handleExportCsv() {
    const headers = [
      "Year",
      "Total_Capacity_GW",
      "Solar_GW",
      "Wind_GW",
      "Coal_GW",
      "Total_Gen_BU",
      "Demand_BU",
      "Supply_Gap_BU",
      "Clean_Share_Pct",
      "Total_CO2_MT",
      "Grid_Intensity_gCO2_kWh",
      "Delta_CO2_vs_Baseline_MT",
    ];
    const csv = [
      headers.join(","),
      ...combinedRows.map((r) =>
        [
          r.Year,
          r.total_capacity_gw,
          r.solar_gw,
          r.wind_gw,
          r.coal_gw,
          r.total_gen_bu,
          r.demand_bu,
          r.supply_gap_bu,
          r.clean_share_pct,
          r.total_co2_mt,
          r.grid_intensity_gco2_kwh,
          r.delta_co2_mt,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `india-grid-sim-${presetId}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const visibleLedgerRows = showAllYears
    ? combinedRows
    : combinedRows.filter((_, i) => i % 2 === 0 || i === combinedRows.length - 1);

  return (
    <div className="min-h-screen">
      {/* TOP MASTHEAD BAR */}
      <header className="bg-[var(--surface)] border-b border-[var(--rule)]">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border"
              style={{
                backgroundColor: "var(--clean-soft)",
                borderColor: "var(--clean-border)",
                color: "var(--clean)",
              }}
            >
              <Zap size={19} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-[var(--ink-muted)]">
                <span>India Power Sector</span>
                <span className="text-[var(--rule-strong)]">/</span>
                <span>Ember 2019–2024 Calibration</span>
                <span className="text-[var(--rule-strong)]">/</span>
                <span className="font-mono-num text-[var(--clean)] font-semibold">
                  2025–2040
                </span>
              </div>
              <h1 className="mt-0.5 text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink)]">
                India Grid &amp; Emissions Workbench
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Theme Toggle */}
            <div
              className="inline-flex rounded-[9px] border border-[var(--rule)] bg-[var(--subtle)] p-0.5 mr-1"
              role="group"
              aria-label="Color theme"
            >
              {[
                { id: "light", label: "Light", icon: Sun },
                { id: "dark", label: "Dark", icon: Moon },
              ].map((t) => {
                const active = theme === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTheme(t.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-[7px] cursor-pointer transition"
                    style={{
                      backgroundColor: active
                        ? "var(--surface-elevated)"
                        : "transparent",
                      color: active ? "var(--ink)" : "var(--ink-muted)",
                      boxShadow: active ? "var(--shadow-pill)" : "none",
                    }}
                  >
                    <Icon size={13} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            <button type="button" onClick={handleShare} className="btn-flat">
              {copiedMsg ? <Check size={13} className="text-[var(--clean)]" /> : <Share2 size={13} />}
              {copiedMsg || "Share"}
            </button>
            <button type="button" onClick={handleExportCsv} className="btn-flat">
              <Download size={13} />
              CSV
            </button>
            <button type="button" onClick={handleReset} className="btn-flat">
              <RotateCcw size={13} />
              Reset
            </button>
          </div>
        </div>

        {/* SCENARIO PRESET STRIP */}
        <div className="border-t border-[var(--rule)] bg-[var(--subtle)]">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)] mr-1.5">
                Preset
              </span>
              {SCENARIO_PRESETS.map((preset) => {
                const isSelected = presetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => selectPreset(preset)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border transition cursor-pointer"
                    style={{
                      backgroundColor: isSelected
                        ? "var(--btn-active-bg)"
                        : "var(--surface)",
                      color: isSelected ? "var(--btn-active-fg)" : "var(--ink)",
                      borderColor: isSelected
                        ? "var(--btn-active-bg)"
                        : "var(--rule-strong)",
                      boxShadow: isSelected ? "var(--shadow-pill)" : "none",
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
              {presetId === "custom" && (
                <span
                  className="ml-1 px-2.5 py-1 text-[11px] font-mono-num font-semibold border rounded-lg"
                  style={{
                    backgroundColor: "var(--clean-soft)",
                    color: "var(--clean)",
                    borderColor: "var(--clean-border)",
                  }}
                >
                  Custom
                </span>
              )}
            </div>

            <div
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-mono-num"
              style={{
                backgroundColor:
                  finalDeltaCo2 <= 0 ? "var(--clean-soft)" : "var(--fossil-soft)",
                borderColor:
                  finalDeltaCo2 <= 0 ? "var(--clean-border)" : "var(--fossil-border)",
                color: "var(--ink-muted)",
              }}
            >
              <span>2040 vs Baseline</span>
              <strong
                className="font-semibold"
                style={{
                  color:
                    finalDeltaCo2 <= 0 ? "var(--clean)" : "var(--fossil)",
                }}
              >
                {fmtSigned(finalDeltaCo2, 1)} MT CO₂
              </strong>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN TWO-COLUMN WORKBENCH */}
      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT STICKY CONTROL RAIL */}
        <aside className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-6 space-y-4">
          <div className="sheet p-4 sm:p-5 space-y-5">
            <div className="border-b border-[var(--rule)] pb-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">
                  Model Controls
                </h2>
                <span className="h-2 w-2 rounded-full bg-[var(--clean)]" />
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--ink-muted)]">
                {activePresetObj
                  ? activePresetObj.description
                  : "Modified custom parameters relative to 2022–24 calibrated averages."}
              </p>
            </div>

            {/* Demand Growth */}
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <label
                  htmlFor="demand-growth-slider"
                  className="text-xs font-semibold text-[var(--ink)]"
                >
                  Demand Growth
                </label>
                <span className="font-mono-num text-xs font-semibold text-[var(--fossil)]">
                  {fmtNum(demandGrowthPct, 1)}% / yr
                </span>
              </div>
              <input
                id="demand-growth-slider"
                type="range"
                className="grid-slider"
                min="3.5"
                max="8.0"
                step="0.1"
                value={demandGrowthPct}
                style={sliderStyle(demandGrowthPct, 3.5, 8.0, "var(--fossil)")}
                onChange={(e) => {
                  setPresetId("custom");
                  setDemandGrowthPct(Number(e.target.value));
                }}
              />
              <div className="mt-1.5 flex justify-between text-[11px] text-[var(--ink-dim)] font-mono-num">
                <span>2024: {fmtNum(metadata.demand_anchor_bu, 0)} BU</span>
                <span>2040: {fmtNum(summary.finalYear.demand_bu, 0)} BU</span>
              </div>
            </div>

            {/* Fuel Additions */}
            <div className="border-t border-[var(--rule)] pt-4 space-y-3.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
                Annual Additions (GW/yr)
              </div>
              {EDITABLE_FUELS.map((f) => {
                const val =
                  overrides[f.key] ?? params[f.key]["recent_additions_gw_yr"];
                const sliderId = `fuel-slider-${f.key}`;
                return (
                  <div key={f.key}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <label
                        htmlFor={sliderId}
                        className="flex items-center gap-2 font-medium text-[var(--ink)]"
                      >
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: f.color }}
                        />
                        {f.label}
                      </label>
                      <span className="font-mono-num font-semibold text-[var(--ink)]">
                        {fmtSigned(val, 1)} GW
                      </span>
                    </div>
                    <input
                      id={sliderId}
                      type="range"
                      className="grid-slider"
                      min={f.min}
                      max={f.max}
                      step={f.step}
                      value={val}
                      style={sliderStyle(val, f.min, f.max, f.color)}
                      onChange={(e) =>
                        updateFuelOverride(f.key, Number(e.target.value))
                      }
                    />
                  </div>
                );
              })}
            </div>

            {/* Coal Quick Policy */}
            <div className="border-t border-[var(--rule)] pt-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-2.5">
                Coal Policy Shortcut
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {COAL_POLICIES.map((pol) => {
                  const isActive =
                    (pol.value === null && overrides.coal === undefined) ||
                    (pol.value !== null && activeCoalRate === pol.value);
                  return (
                    <button
                      key={pol.id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => applyCoalPolicy(pol.value)}
                      className="border rounded-lg py-2 px-2 text-left transition cursor-pointer"
                      style={{
                        borderColor: isActive
                          ? "var(--ink)"
                          : "var(--rule-strong)",
                        backgroundColor: isActive
                          ? "var(--subtle)"
                          : "var(--surface)",
                        boxShadow: isActive ? "var(--shadow-pill)" : "none",
                      }}
                    >
                      <div className="text-[11px] font-semibold text-[var(--ink)]">
                        {pol.label}
                      </div>
                      <div className="text-[10px] font-mono-num text-[var(--ink-muted)]">
                        {pol.sub}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Storage Boost */}
            <div className="border-t border-[var(--rule)] pt-4">
              <label
                htmlFor="re-storage-select"
                className="block text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-2"
              >
                RE Storage / CUF Boost
              </label>
              <select
                id="re-storage-select"
                value={reCufBoostPct}
                onChange={(e) => {
                  setPresetId("custom");
                  setReCufBoostPct(Number(e.target.value));
                }}
                className="w-full border border-[var(--rule-strong)] bg-[var(--surface-elevated)] rounded-lg px-3 py-2 text-xs text-[var(--ink)] cursor-pointer"
              >
                {STORAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="px-1.5 text-[11px] leading-relaxed text-[var(--ink-dim)]">
            <strong className="text-[var(--ink-muted)]">Note:</strong>{" "}
            {metadata.methodological_note}
          </div>
        </aside>

        {/* RIGHT MAIN ANALYTICAL CANVAS */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-5">
          {/* ELEVATED KPI CARDS */}
          <section className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            <div className="kpi-card">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                2040 CO₂
              </div>
              <div className="mt-1.5 font-mono-num text-2xl font-bold tracking-tight text-[var(--ink)]">
                {fmtNum(summary.finalYear.total_co2_mt, 0)}
                <span className="ml-1 text-xs font-normal text-[var(--ink-muted)]">
                  MT
                </span>
              </div>
              <div className="mt-1.5 text-[11px] font-mono-num text-[var(--ink-dim)]">
                Range {fmtNum(rangeMin, 0)}–{fmtNum(rangeMax, 0)}
              </div>
            </div>

            <div className="kpi-card">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                Peak Year
              </div>
              <div className="mt-1.5 font-mono-num text-2xl font-bold tracking-tight text-[var(--ink)]">
                {summary.isPeakedBefore2040 ? summary.peakYear : "None"}
              </div>
              <div className="mt-1.5 text-[11px] font-mono-num text-[var(--ink-dim)]">
                Max {fmtNum(summary.peakCo2Mt, 0)} MT
              </div>
            </div>

            <div
              className="kpi-card"
              style={{ borderTop: "2.5px solid var(--clean)" }}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                2040 Clean Share
              </div>
              <div className="mt-1.5 font-mono-num text-2xl font-bold tracking-tight text-[var(--clean)]">
                {fmtNum(summary.finalYear.clean_share_pct, 1)}%
              </div>
              <div className="mt-1.5 text-[11px] font-mono-num text-[var(--ink-dim)]">
                ≥50%: {summary.fiftyPctYear ?? "Post-2040"}
              </div>
            </div>

            <div className="kpi-card">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                Grid Intensity
              </div>
              <div className="mt-1.5 font-mono-num text-2xl font-bold tracking-tight text-[var(--ink)]">
                {fmtNum(summary.finalYear.grid_intensity_gco2_kwh, 0)}
                <span className="ml-1 text-xs font-normal text-[var(--ink-muted)]">
                  g/kWh
                </span>
              </div>
              <div className="mt-1.5 text-[11px] font-mono-num text-[var(--ink-dim)]">
                2024: {fmtNum(hist2024Intensity, 0)} g/kWh
              </div>
            </div>

            <div
              className="kpi-card col-span-2 md:col-span-1"
              style={{
                borderTop: `2.5px solid ${
                  summary.finalYear.supply_gap_bu >= 0
                    ? "var(--clean)"
                    : "var(--fossil)"
                }`,
              }}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                2040 Supply Gap
              </div>
              <div
                className="mt-1.5 font-mono-num text-2xl font-bold tracking-tight"
                style={{
                  color:
                    summary.finalYear.supply_gap_bu >= 0
                      ? "var(--clean)"
                      : "var(--fossil)",
                }}
              >
                {fmtSigned(summary.finalYear.supply_gap_bu, 0)}
                <span className="ml-1 text-xs font-normal text-[var(--ink-muted)]">
                  BU
                </span>
              </div>
              <div className="mt-1.5 text-[11px] font-mono-num text-[var(--ink-dim)]">
                Cap: {fmtNum(summary.finalYear.total_capacity_gw, 0)} GW
              </div>
            </div>
          </section>

          {/* PRIMARY 3-TAB CHART SHEET */}
          <section className="sheet">
            <div className="px-4 sm:px-5 py-3 border-b border-[var(--rule)] flex flex-wrap items-center justify-between gap-3">
              <div className="tab-group" role="tablist" aria-label="Simulation views">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "emissions"}
                  onClick={() => setActiveTab("emissions")}
                  className={`tab-pill ${
                    activeTab === "emissions" ? "active" : ""
                  }`}
                >
                  CO₂ Trajectory (MT)
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "power"}
                  onClick={() => setActiveTab("power")}
                  className={`tab-pill ${activeTab === "power" ? "active" : ""}`}
                >
                  Generation vs. Demand (BU)
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "capacity"}
                  onClick={() => setActiveTab("capacity")}
                  className={`tab-pill ${
                    activeTab === "capacity" ? "active" : ""
                  }`}
                >
                  Installed Capacity Mix (GW)
                </button>
              </div>
              <span className="text-[11px] font-mono-num text-[var(--ink-dim)]">
                Annual model step · 2025–2040
              </span>
            </div>

            <div className="p-4 sm:p-5">
              {/* Inline Legend */}
              <div className="mb-3.5 flex flex-wrap gap-4 text-xs text-[var(--ink-muted)]">
                {activeTab === "emissions" && (
                  <>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-[3px] w-4 rounded-full bg-[var(--clean)]" />
                      Active Scenario (MT CO₂)
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 border-t-2 border-dashed border-[var(--fossil)]" />
                      Baseline Pace (MT CO₂)
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 border-t border-dotted border-[var(--ink-dim)]" />
                      2024 Actual ({fmtNum(hist2024Co2Mt, 0)} MT)
                    </span>
                  </>
                )}
                {activeTab === "power" && (
                  <>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-[3px] w-4 rounded-full bg-[var(--clean)]" />
                      Total Generation (BU)
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 border-t-2 border-dashed border-[var(--fossil)]" />
                      Projected Demand (BU)
                    </span>
                  </>
                )}
                {activeTab === "capacity" &&
                  EDITABLE_FUELS.map((f) => (
                    <span
                      key={f.key}
                      className="inline-flex items-center gap-2"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: f.color }}
                      />
                      {f.label}
                    </span>
                  ))}
              </div>

              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={combinedRows}
                    margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="gradClean" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--clean)" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="var(--clean)" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gradSolar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--solar)" stopOpacity={0.85} />
                        <stop offset="100%" stopColor="var(--solar)" stopOpacity={0.45} />
                      </linearGradient>
                      <linearGradient id="gradWind" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--wind)" stopOpacity={0.82} />
                        <stop offset="100%" stopColor="var(--wind)" stopOpacity={0.42} />
                      </linearGradient>
                      <linearGradient id="gradNuclear" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--nuclear)" stopOpacity={0.78} />
                        <stop offset="100%" stopColor="var(--nuclear)" stopOpacity={0.4} />
                      </linearGradient>
                      <linearGradient id="gradHydro" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--hydro)" stopOpacity={0.78} />
                        <stop offset="100%" stopColor="var(--hydro)" stopOpacity={0.4} />
                      </linearGradient>
                      <linearGradient id="gradCoal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--coal)" stopOpacity={0.82} />
                        <stop offset="100%" stopColor="var(--coal)" stopOpacity={0.48} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      stroke="var(--grid-line)"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="Year"
                      stroke="var(--rule-strong)"
                      tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="var(--ink-dim)"
                      tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={52}
                    />
                    <Tooltip
                      content={
                        <ChartTooltip
                          unit={
                            activeTab === "emissions"
                              ? "MT"
                              : activeTab === "power"
                              ? "BU"
                              : "GW"
                          }
                        />
                      }
                    />

                    {activeTab === "emissions" && (
                      <>
                        <ReferenceLine
                          y={hist2024Co2Mt}
                          stroke="var(--ink-dim)"
                          strokeDasharray="3 3"
                        />
                        <Area
                          type="monotone"
                          dataKey="baseline_co2_mt"
                          name="Baseline CO₂"
                          stroke="var(--fossil)"
                          strokeWidth={1.8}
                          strokeDasharray="5 4"
                          fill="none"
                          dot={false}
                        />
                        <Area
                          type="monotone"
                          dataKey="total_co2_mt"
                          name="Active CO₂"
                          stroke="var(--clean)"
                          strokeWidth={2.5}
                          fill="url(#gradClean)"
                          dot={false}
                        />
                      </>
                    )}

                    {activeTab === "power" && (
                      <>
                        <Area
                          type="monotone"
                          dataKey="demand_bu"
                          name="Projected Demand"
                          stroke="var(--fossil)"
                          strokeWidth={1.8}
                          strokeDasharray="5 4"
                          fill="none"
                          dot={false}
                        />
                        <Area
                          type="monotone"
                          dataKey="total_gen_bu"
                          name="Total Generation"
                          stroke="var(--clean)"
                          strokeWidth={2.5}
                          fill="url(#gradClean)"
                          dot={false}
                        />
                      </>
                    )}

                    {activeTab === "capacity" && (
                      <>
                        <Area
                          type="monotone"
                          stackId="1"
                          dataKey="coal_gw"
                          name="Coal"
                          stroke="var(--coal)"
                          strokeWidth={1.5}
                          fill="url(#gradCoal)"
                        />
                        <Area
                          type="monotone"
                          stackId="1"
                          dataKey="hydro_gw"
                          name="Hydro"
                          stroke="var(--hydro)"
                          strokeWidth={1.5}
                          fill="url(#gradHydro)"
                        />
                        <Area
                          type="monotone"
                          stackId="1"
                          dataKey="nuclear_gw"
                          name="Nuclear"
                          stroke="var(--nuclear)"
                          strokeWidth={1.5}
                          fill="url(#gradNuclear)"
                        />
                        <Area
                          type="monotone"
                          stackId="1"
                          dataKey="wind_gw"
                          name="Wind"
                          stroke="var(--wind)"
                          strokeWidth={1.5}
                          fill="url(#gradWind)"
                        />
                        <Area
                          type="monotone"
                          stackId="1"
                          dataKey="solar_gw"
                          name="Solar PV"
                          stroke="var(--solar)"
                          strokeWidth={1.5}
                          fill="url(#gradSolar)"
                        />
                      </>
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* SECONDARY CHART: CLEAN SHARE BAR */}
          <section className="sheet p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3.5">
              <div>
                <h2 className="text-sm font-bold text-[var(--ink)]">
                  Clean Electricity Share (% of Total Generation)
                </h2>
                <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                  Solar, wind, hydro, nuclear, and bioenergy combined against the
                  50% majority line.
                </p>
              </div>
            </div>

            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={combinedRows}
                  margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="cleanBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--clean)" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="var(--clean)" stopOpacity={0.62} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="var(--grid-line)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="Year"
                    stroke="var(--rule-strong)"
                    tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="var(--ink-dim)"
                    tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    unit="%"
                    width={42}
                  />
                  <Tooltip content={<ChartTooltip unit="%" />} />
                  <ReferenceLine
                    y={50}
                    stroke="var(--ink-muted)"
                    strokeDasharray="4 4"
                  />
                  <Bar
                    dataKey="clean_share_pct"
                    name="Clean Share"
                    fill="url(#cleanBarGrad)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ANNUAL LEDGER TABLE */}
          <section className="sheet p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
              <h2 className="text-sm font-bold text-[var(--ink)]">
                Annual Projection Ledger (2025–2040)
              </h2>
              <button
                type="button"
                onClick={() => setShowAllYears((v) => !v)}
                className="btn-flat"
              >
                {showAllYears ? "Alternate years" : "Show all 16 years"}
              </button>
            </div>

            <div className="table-frame">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Cap (GW)</th>
                    <th>Gen (BU)</th>
                    <th>Demand (BU)</th>
                    <th>Gap (BU)</th>
                    <th>Clean %</th>
                    <th>CO₂ (MT)</th>
                    <th>Δ vs Base</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleLedgerRows.map((row) => (
                    <tr key={row.Year}>
                      <td className="font-semibold text-[var(--ink)]">
                        {row.Year}
                      </td>
                      <td>{fmtNum(row.total_capacity_gw, 1)}</td>
                      <td>{fmtNum(row.total_gen_bu, 1)}</td>
                      <td>{fmtNum(row.demand_bu, 1)}</td>
                      <td
                        className="font-medium"
                        style={{
                          color:
                            row.supply_gap_bu >= 0
                              ? "var(--clean)"
                              : "var(--fossil)",
                        }}
                      >
                        {fmtSigned(row.supply_gap_bu, 1)}
                      </td>
                      <td className="font-semibold text-[var(--clean)]">
                        {fmtNum(row.clean_share_pct, 1)}%
                      </td>
                      <td className="font-semibold text-[var(--ink)]">
                        {fmtNum(row.total_co2_mt, 1)}
                      </td>
                      <td
                        className="font-medium"
                        style={{
                          color:
                            row.delta_co2_mt <= 0
                              ? "var(--clean)"
                              : "var(--fossil)",
                        }}
                      >
                        {fmtSigned(row.delta_co2_mt, 1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
