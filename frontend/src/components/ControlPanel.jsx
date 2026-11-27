import {
  COAL_POLICIES,
  EDITABLE_FUELS,
  STORAGE_OPTIONS,
  fmtNum,
  fmtSigned,
  sliderStyle,
} from "../utils/format";

export default function ControlPanel({
  activePresetObj,
  demandGrowthPct,
  onDemandChange,
  demandAnchorBu,
  finalDemandBu,
  params,
  overrides,
  onFuelChange,
  activeCoalRate,
  onCoalPolicy,
  reCufBoostPct,
  onStorageChange,
  methodologicalNote,
}) {
  return (
    <aside className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-5 space-y-3">
      <div className="sheet p-4 space-y-3.5">
        <div className="border-b border-[var(--rule)] pb-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">
            Model Controls
          </h2>
          <p className="mt-1 text-xs leading-snug text-[var(--ink-muted)]">
            {activePresetObj
              ? activePresetObj.description
              : "Custom inputs relative to 2022–24 calibrated averages."}
          </p>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-1.5">
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
            onChange={(e) => onDemandChange(Number(e.target.value))}
          />
          <div className="mt-1 flex justify-between text-[11px] text-[var(--ink-dim)] font-mono-num">
            <span>2024: {fmtNum(demandAnchorBu, 0)} BU</span>
            <span>2040: {fmtNum(finalDemandBu, 0)} BU</span>
          </div>
        </div>

        <div className="border-t border-[var(--rule)] pt-3 space-y-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            Annual Additions (GW/yr)
          </div>
          {EDITABLE_FUELS.map((f) => {
            const val = overrides[f.key] ?? params[f.key]["recent_additions_gw_yr"];
            const sliderId = `fuel-slider-${f.key}`;
            return (
              <div key={f.key}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label
                    htmlFor={sliderId}
                    className="flex items-center gap-2 font-medium text-[var(--ink)]"
                  >
                    <span
                      className="inline-block h-2 w-2 rounded-full"
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
                  onChange={(e) => onFuelChange(f.key, Number(e.target.value))}
                />
              </div>
            );
          })}
        </div>

        <div className="border-t border-[var(--rule)] pt-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-2">
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
                  onClick={() => onCoalPolicy(pol.value)}
                  className="border rounded-md py-1.5 px-2 text-left transition cursor-pointer"
                  style={{
                    borderColor: isActive ? "var(--ink)" : "var(--rule-strong)",
                    backgroundColor: isActive ? "var(--subtle)" : "var(--surface)",
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

        <div className="border-t border-[var(--rule)] pt-3">
          <label
            htmlFor="re-storage-select"
            className="block text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-1.5"
          >
            RE Storage / CUF Boost
          </label>
          <select
            id="re-storage-select"
            value={reCufBoostPct}
            onChange={(e) => onStorageChange(Number(e.target.value))}
            className="w-full border border-[var(--rule-strong)] bg-[var(--surface-elevated)] rounded-md px-2.5 py-1.5 text-xs text-[var(--ink)] cursor-pointer"
          >
            {STORAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="px-1 text-[11px] leading-relaxed text-[var(--ink-dim)]">
        <strong className="text-[var(--ink-muted)]">Note:</strong>{" "}
        {methodologicalNote}
      </p>
    </aside>
  );
}