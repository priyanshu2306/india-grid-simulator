import { useEffect, useMemo, useState } from "react";
import modelData from "./data/modelData.json";
import {
  SCENARIO_PRESETS,
  simulateGrid,
  summarizeSimulation,
} from "./utils/simulateGrid";
import Header from "./components/Header";
import ControlPanel from "./components/ControlPanel";
import KpiStrip from "./components/KpiStrip";
import ChartsPanel from "./components/ChartsPanel";
import LedgerTable from "./components/LedgerTable";

function getInitialTheme() {
  try {
    const saved = localStorage.getItem("india-grid-theme");
    if (saved === "light" || saved === "dark") return saved;
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
  } catch {
    return "light";
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
      /* storage unavailable */
    }
  }, [theme]);

  useEffect(() => {
    if (!copiedMsg) return;
    const timer = setTimeout(() => setCopiedMsg(""), 2200);
    return () => clearTimeout(timer);
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

  return (
    <div className="min-h-screen">
      <Header
        theme={theme}
        onThemeChange={setTheme}
        presetId={presetId}
        onSelectPreset={selectPreset}
        finalDeltaCo2={finalDeltaCo2}
        copiedMsg={copiedMsg}
        onShare={handleShare}
        onExportCsv={handleExportCsv}
        onReset={handleReset}
      />

      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 py-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <ControlPanel
          activePresetObj={activePresetObj}
          demandGrowthPct={demandGrowthPct}
          onDemandChange={(val) => {
            setPresetId("custom");
            setDemandGrowthPct(val);
          }}
          demandAnchorBu={metadata.demand_anchor_bu}
          finalDemandBu={summary.finalYear.demand_bu}
          params={params}
          overrides={overrides}
          onFuelChange={updateFuelOverride}
          activeCoalRate={activeCoalRate}
          onCoalPolicy={applyCoalPolicy}
          reCufBoostPct={reCufBoostPct}
          onStorageChange={(val) => {
            setPresetId("custom");
            setReCufBoostPct(val);
          }}
          methodologicalNote={metadata.methodological_note}
        />

        <div className="lg:col-span-8 xl:col-span-9 space-y-5">
          <KpiStrip summary={summary} hist2024Intensity={hist2024Intensity} />
          <ChartsPanel
            rows={combinedRows}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            hist2024Co2Mt={hist2024Co2Mt}
          />
          <LedgerTable
            rows={combinedRows}
            showAllYears={showAllYears}
            onToggleYears={() => setShowAllYears((v) => !v)}
          />
          <footer className="pt-3 pb-4 border-t border-[var(--rule)] flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--ink-dim)]">
  <span>
    Built by{" "}
    <a
      href="https://github.com/priyanshu2306"
      target="_blank"
      rel="noreferrer"
      className="font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] underline underline-offset-2"
    >
      Priyanshu Kumar
    </a>{" "}
    · Calibrated in Python &amp; Pandas
  </span>
  <a
    href="https://github.com/priyanshu2306/india-grid-simulator"
    target="_blank"
    rel="noreferrer"
    className="font-mono-num text-[11px] text-[var(--ink-muted)] hover:text-[var(--ink)] underline underline-offset-2"
  >
    Notebook &amp; Source ↗
  </a>
</footer>
        </div>
      </main>
    </div>
  );
}